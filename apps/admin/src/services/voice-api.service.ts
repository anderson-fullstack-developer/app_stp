/** Gravações de pronúncia (trabalho pago por tarefas) e o painel de gestão (tipos em @stp/types/api). */
import type {
  VoiceAdminTaskDto,
  VoiceEarningsDto,
  VoiceMeDto,
  VoiceMyRecordingDto,
  VoiceOverviewDto,
  VoicePayoutDto,
  VoicePayoutMethod,
  VoicePersonDto,
  VoiceRejectReason,
  VoiceReportDto,
  VoiceReviewItemDto,
  VoiceTaskDto,
  VoiceTaskKind,
  VoiceTaskStatus,
  VoiceWordDto,
} from "@stp/types/api";
import { apiUrl } from "@/config/api";
import { authService } from "./auth.service";
import { ApiError, http } from "./http";

export const voiceApi = {
  /** "Hoje" conta desde a meia-noite do relógio deste dispositivo. */
  me: () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return http.getQ<VoiceMeDto>("voice", ["me"], { todayFrom: midnight.toISOString() });
  },
  saveProfile: (body: {
    displayName: string | null;
    region: string | null;
    adultConfirmed: boolean;
    consentAccepted: boolean;
  }) => http.put<VoiceMeDto>("voice", ["profile"], body),
  savePayoutDetails: (method: VoicePayoutMethod, details: string) =>
    http.put<{ ok: true }>("voice", ["payout-details"], { method, details }),
  tasks: () => http.get<VoiceTaskDto[]>("voice", "tasks"),
  earnings: () => http.get<VoiceEarningsDto>("voice", "earnings"),
  words: (taskId: string, locale: string) =>
    http.getQ<VoiceWordDto[]>("voice", ["tasks", taskId, "words"], { locale }),
  record: (body: {
    taskId: string;
    vocabularyId: string;
    mimeType: string;
    durationMs: number;
    data: string;
  }) => http.post<{ id: string; status: string }>("voice", ["recordings"], body),
  mine: (locale: string, status?: VoiceMyRecordingDto["status"]) =>
    http.getQ<VoiceMyRecordingDto[]>("voice", ["recordings", "mine"], {
      locale,
      ...(status ? { status } : {}),
    }),
  next: (taskId: string, locale: string) =>
    http.getQ<{ item: VoiceReviewItemDto | null }>("voice", ["tasks", taskId, "review", "next"], {
      locale,
    }),
  review: (
    recordingId: string,
    taskId: string,
    verdict: "APPROVE" | "REJECT",
    reason: VoiceRejectReason | null,
  ) =>
    http.post<{ ok: true }>("voice", ["recordings", recordingId, "review"], {
      taskId,
      verdict,
      reason,
    }),
  /** Áudio de uma gravação (com sessão; pendentes nunca são públicas). */
  async audio(recordingId: string): Promise<Blob> {
    const token = await authService.getToken();
    const res = await fetch(apiUrl("voice", "recordings", recordingId, "audio"), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "audio failed");
    return res.blob();
  },

  /* ------------------------------- administração ------------------------------- */
  overview: (languageId: string) =>
    http.getQ<VoiceOverviewDto>("admin", ["voice", "overview"], { languageId }),
  adminTasks: (status?: VoiceTaskStatus) =>
    http.getQ<VoiceAdminTaskDto[]>("admin", ["voice", "tasks"], status ? { status } : {}),
  createTask: (body: {
    kind: VoiceTaskKind;
    assigneeId: string;
    languageId: string;
    title: string;
    notes: string | null;
    target: number;
    rateCents: number;
    unitId: string | null;
    dueAt: string | null;
  }) => http.post<{ id: string }>("admin", ["voice", "tasks"], body),
  updateTask: (
    id: string,
    patch: {
      status?: VoiceTaskStatus;
      target?: number;
      dueAt?: string | null;
      notes?: string | null;
    },
  ) => http.patch<{ ok: true }>("admin", ["voice", "tasks", id], patch),
  people: () => http.get<VoicePersonDto[]>("admin", "voice", "people"),
  pause: (userId: string, paused: boolean) =>
    http.post<{ ok: true }>("admin", ["voice", "people", userId, "pause"], { paused }),
  payouts: (userId?: string) =>
    http.getQ<VoicePayoutDto[]>("admin", ["voice", "payouts"], userId ? { userId } : {}),
  createPayout: (body: {
    userId: string;
    amountCents: number;
    method: VoicePayoutMethod;
    reference: string | null;
    note: string | null;
  }) => http.post<{ id: string }>("admin", ["voice", "payouts"], body),
  report: (from: string, to: string) =>
    http.getQ<VoiceReportDto>("admin", ["voice", "report"], { from, to }),
};

export const voiceKeys = {
  me: ["voice", "me"] as const,
  tasks: ["voice", "tasks"] as const,
  earnings: ["voice", "earnings"] as const,
  words: (task: string, locale: string) => ["voice", "words", task, locale] as const,
  next: (task: string, locale: string) => ["voice", "next", task, locale] as const,
  mine: (locale: string, status: string) => ["voice", "mine", locale, status] as const,
  overview: (lang: string) => ["voice-admin", "overview", lang] as const,
  adminTasks: (status: string) => ["voice-admin", "tasks", status] as const,
  people: ["voice-admin", "people"] as const,
  payouts: ["voice-admin", "payouts"] as const,
  report: (from: string, to: string) => ["voice-admin", "report", from, to] as const,
};

/** Código de erro da API (ex.: CONSENT_REQUIRED). */
export const voiceErrorCode = (e: unknown): string | null =>
  e instanceof ApiError ? ((e.body as { code?: string } | undefined)?.code ?? null) : null;

/** 1234 → "12,34 €" (valores sempre em cêntimos inteiros). */
export const euros = (cents: number, locale = "pt-PT") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);

/** Quantas unidades já contam para a tarefa (enviadas não rejeitadas, ou avaliações). */
export const taskDone = (t: {
  kind: "RECORD" | "REVIEW";
  progress: { pending: number; approved: number; reviews: number };
}) => (t.kind === "RECORD" ? t.progress.pending + t.progress.approved : t.progress.reviews);
