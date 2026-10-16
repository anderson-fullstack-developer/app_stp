/** Gravações de pronúncia: Área dos Faladores, dos Ouvintes e relatório (tipos em @stp/types/api). */
import type {
  VoiceMeDto,
  VoiceOverviewDto,
  VoiceRejectReason,
  VoiceReportDto,
  VoiceReviewItemDto,
  VoiceWordDto,
} from "@stp/types/api";
import { apiUrl } from "@/config/api";
import { authService } from "./auth.service";
import { ApiError, http } from "./http";

export const voiceApi = {
  me: () => http.get<VoiceMeDto>("voice", "me"),
  saveProfile: (body: {
    displayName: string | null;
    region: string | null;
    adultConfirmed: boolean;
    consentAccepted: boolean;
  }) => http.put<VoiceMeDto>("voice", ["profile"], body),
  words: (languageId: string, locale: string) =>
    http.getQ<VoiceWordDto[]>("voice", ["words"], { languageId, locale }),
  record: (body: { vocabularyId: string; mimeType: string; durationMs: number; data: string }) =>
    http.post<{ id: string; status: string }>("voice", ["recordings"], body),
  next: (languageId: string, locale: string) =>
    http.getQ<{ item: VoiceReviewItemDto | null }>("voice", ["review", "next"], {
      languageId,
      locale,
    }),
  review: (recordingId: string, verdict: "APPROVE" | "REJECT", reason: VoiceRejectReason | null) =>
    http.post<{ ok: true }>("voice", ["recordings", recordingId, "review"], { verdict, reason }),
  /** Áudio de uma gravação pendente (com sessão; nunca é público). */
  async audio(recordingId: string): Promise<Blob> {
    const token = await authService.getToken();
    const res = await fetch(apiUrl("voice", "recordings", recordingId, "audio"), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "audio failed");
    return res.blob();
  },
  overview: (languageId: string) =>
    http.getQ<VoiceOverviewDto>("admin", ["voice", "overview"], { languageId }),
  report: (from: string, to: string) =>
    http.getQ<VoiceReportDto>("admin", ["voice", "report"], { from, to }),
};

export const voiceKeys = {
  me: ["voice", "me"] as const,
  words: (lang: string, locale: string) => ["voice", "words", lang, locale] as const,
  next: (lang: string, locale: string) => ["voice", "next", lang, locale] as const,
  overview: (lang: string) => ["voice", "overview", lang] as const,
  report: (from: string, to: string) => ["voice", "report", from, to] as const,
};

/** Código de erro da API (ex.: CONSENT_REQUIRED). */
export const voiceErrorCode = (e: unknown): string | null =>
  e instanceof ApiError ? ((e.body as { code?: string } | undefined)?.code ?? null) : null;
