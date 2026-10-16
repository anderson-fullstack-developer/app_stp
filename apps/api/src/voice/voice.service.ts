import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { shortGloss } from "../courses/course-builder.js";
import { PrismaService } from "../database/prisma.service.js";
import type { Role, VoiceTask } from "../generated/prisma/client.js";
import { isPubliclyListed, visibleContentStatuses } from "../languages/visibility.js";
import type { AuthUser } from "../users/users.service.js";
import { AudioStorage } from "./audio-storage.js";
import { MediaUrls } from "./media-urls.js";
import { taskFinished, taskMoney, taskRemaining, taskStats } from "./voice-progress.js";
import {
  AUDIO_MIME_TYPES,
  controlMatched,
  decide,
  durationOk,
  normalizeMime,
  VOICE_RULES,
} from "./voice-rules.js";

type VoiceRole = Extract<Role, "VOICE_SPEAKER" | "VOICE_LISTENER">;
type TaskKind = VoiceTask["kind"];

export interface WordToRecord {
  vocabularyId: string;
  word: string;
  gloss: string | null;
  partOfSpeech: string;
  inLessons: boolean;
}

export interface ReviewItem {
  recordingId: string;
  word: string;
  gloss: string | null;
  partOfSpeech: string;
  region: string | null;
  durationMs: number;
}

export const PAYOUT_METHODS = ["SEPA", "MBWAY", "STRIPE", "OTHER"] as const;

const RANGE_DAYS = 7;

/**
 * Gravações de pronúncia (trabalho pago por tarefas): Faladores gravam palavras, Ouvintes
 * aprovam ou rejeitam. Todo o trabalho pertence a uma tarefa atribuída pelo administrador,
 * que define o preço — é assim que se sabe exatamente quanto pagar.
 * - quem grava nunca avalia as próprias gravações (e os ouvintes não sabem quem gravou);
 * - 2 votos iguais decidem; empate 1–1 espera por um 3.º ouvinte;
 * - perguntas de controlo (gravações já decididas) medem a atenção e não são pagas;
 * - aprovada → passa a áudio da palavra (lições, desafio do dia e Arena).
 */
@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AudioStorage,
  ) {}

  /* ------------------------------ perfil e acesso ------------------------------ */

  /** `todayFrom`: início do dia no relógio da pessoa (o cliente envia; por omissão, UTC). */
  async me(user: AuthUser, todayFrom?: Date) {
    const [profile, languages] = await Promise.all([
      this.prisma.voiceContributor.findUnique({ where: { userId: user.id } }),
      this.prisma.language.findMany({
        select: { id: true, name: true, status: true },
        orderBy: { name: "asc" },
      }),
    ]);
    const listed = languages.filter((l) => isPubliclyListed(l.status));
    const langsFor = (role: VoiceRole) =>
      listed.filter((l) => this.hasRole(user, role, l.id)).map((l) => ({ id: l.id, name: l.name }));
    const since = new Date(Date.now() - RANGE_DAYS * 86_400_000);
    const today = todayFrom ?? new Date(new Date().toISOString().slice(0, 10));
    const [
      recorded,
      approved,
      reviews,
      byStatus,
      recordedToday,
      reviewsTotal,
      reviewsToday,
      activeTasks,
    ] = await Promise.all([
      this.prisma.recording.count({ where: { speakerId: user.id, createdAt: { gte: since } } }),
      this.prisma.recording.count({
        where: { speakerId: user.id, status: "APPROVED", decidedAt: { gte: since } },
      }),
      this.prisma.recordingReview.count({
        where: { listenerId: user.id, isControl: false, createdAt: { gte: since } },
      }),
      this.prisma.recording.groupBy({
        by: ["status"],
        where: { speakerId: user.id },
        _count: true,
      }),
      this.prisma.recording.count({ where: { speakerId: user.id, createdAt: { gte: today } } }),
      // Controlos contam aqui: a pessoa não sabe quais são (e também ouviu).
      this.prisma.recordingReview.count({ where: { listenerId: user.id } }),
      this.prisma.recordingReview.count({
        where: { listenerId: user.id, createdAt: { gte: today } },
      }),
      this.prisma.voiceTask.count({ where: { assigneeId: user.id, status: "ACTIVE" } }),
    ]);
    const status = (s: "PENDING" | "APPROVED" | "REJECTED") =>
      byStatus.find((r) => r.status === s)?._count ?? 0;
    return {
      storageEnabled: this.storage.enabled,
      speakerLanguages: langsFor("VOICE_SPEAKER"),
      listenerLanguages: langsFor("VOICE_LISTENER"),
      consentVersion: VOICE_RULES.consentVersion,
      profile: profile
        ? {
            displayName: profile.displayName,
            region: profile.region,
            consentCurrent: profile.consentVersion === VOICE_RULES.consentVersion,
            paused: profile.paused,
            payoutMethod: profile.payoutMethod,
            payoutDetails: profile.payoutDetails,
          }
        : null,
      activeTasks,
      last7Days: { recorded, approved, reviews },
      /** Falador: tudo o que já enviou, por estado. */
      speaker: {
        today: recordedToday,
        total: status("PENDING") + status("APPROVED") + status("REJECTED"),
        pending: status("PENDING"),
        approved: status("APPROVED"),
        rejected: status("REJECTED"),
      },
      /** Ouvinte: avaliações feitas. */
      listener: { today: reviewsToday, total: reviewsTotal },
    };
  }

  async saveProfile(
    user: AuthUser,
    input: {
      displayName: string | null;
      region: string | null;
      adultConfirmed: boolean;
      consentAccepted: boolean;
    },
  ) {
    if (!this.hasAnyVoiceRole(user)) throw this.noRole();
    if (!input.adultConfirmed || !input.consentAccepted) {
      throw new BadRequestException({
        code: "CONSENT_REQUIRED",
        message: `É preciso ter ${VOICE_RULES.minimumAge} anos ou mais e aceitar as condições.`,
      });
    }
    const data = {
      displayName: input.displayName,
      region: input.region,
      adultConfirmed: true,
      consentVersion: VOICE_RULES.consentVersion,
      consentAt: new Date(),
    };
    await this.prisma.voiceContributor.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
    return this.me(user);
  }

  /** Como prefere receber (IBAN, telefone MB WAY…). Só a própria pessoa e administradores veem. */
  async savePayoutDetails(
    user: AuthUser,
    input: { method: (typeof PAYOUT_METHODS)[number]; details: string },
  ) {
    const profile = await this.prisma.voiceContributor.findUnique({ where: { userId: user.id } });
    if (!profile) {
      throw new ForbiddenException({
        code: "CONSENT_REQUIRED",
        message: "Aceita primeiro as condições de participação.",
      });
    }
    await this.prisma.voiceContributor.update({
      where: { userId: user.id },
      data: { payoutMethod: input.method, payoutDetails: input.details },
    });
    return { ok: true };
  }

  /* ---------------------------------- tarefas ---------------------------------- */

  /** As minhas tarefas, com o progresso e o dinheiro de cada uma. */
  async myTasks(user: AuthUser) {
    const tasks = await this.prisma.voiceTask.findMany({
      where: { assigneeId: user.id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      include: {
        language: { select: { name: true } },
        unit: { select: { title: true } },
      },
    });
    const stats = await taskStats(
      this.prisma,
      tasks.map((t) => t.id),
    );
    return tasks.map((t) => {
      const s = stats.get(t.id)!;
      return {
        id: t.id,
        kind: t.kind,
        title: t.title,
        notes: t.notes,
        languageId: t.languageId,
        languageName: t.language.name,
        unitTitle: t.unit?.title ?? null,
        target: t.target,
        rateCents: t.rateCents,
        currency: t.currency,
        dueAt: t.dueAt?.toISOString() ?? null,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        progress: { ...s, remaining: taskRemaining(t, s) },
        ...taskMoney(t, s),
      };
    });
  }

  /** Ganhos: o que já foi aprovado, o que espera decisão, o que já recebi e o saldo. */
  async earnings(user: AuthUser) {
    const [tasks, payouts] = await Promise.all([
      this.prisma.voiceTask.findMany({
        where: { assigneeId: user.id },
        select: { id: true, kind: true, rateCents: true },
      }),
      this.prisma.voicePayout.findMany({
        where: { userId: user.id },
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amountCents: true,
          currency: true,
          method: true,
          reference: true,
          note: true,
          paidAt: true,
        },
      }),
    ]);
    const stats = await taskStats(
      this.prisma,
      tasks.map((t) => t.id),
    );
    // Esta semana (desde segunda-feira, UTC).
    const now = new Date();
    const monday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - ((now.getUTCDay() + 6) % 7),
      ),
    );
    const week = await taskStats(
      this.prisma,
      tasks.map((t) => t.id),
      { from: monday },
    );
    let earned = 0;
    let pending = 0;
    let thisWeek = 0;
    for (const t of tasks) {
      const m = taskMoney(t, stats.get(t.id)!);
      earned += m.earnedCents;
      pending += m.pendingCents;
      thisWeek += taskMoney(t, week.get(t.id)!).earnedCents;
    }
    const paid = payouts.reduce((sum, p) => sum + p.amountCents, 0);
    return {
      currency: "EUR",
      earnedCents: earned,
      pendingCents: pending,
      thisWeekCents: thisWeek,
      paidCents: paid,
      balanceCents: earned - paid,
      payouts: payouts.map((p) => ({ ...p, paidAt: p.paidAt.toISOString() })),
    };
  }

  /* --------------------------------- faladores --------------------------------- */

  /**
   * Próximas palavras da tarefa: as das lições primeiro, depois as que têm menos vozes.
   * Saem as que já gravei (pendentes ou aprovadas) e as que já têm vozes suficientes; a fila
   * nunca passa do que falta na tarefa.
   */
  async wordsToRecord(user: AuthUser, taskId: string, locale: string): Promise<WordToRecord[]> {
    const { task } = await this.requireTask(user, taskId, "RECORD");
    const s = (await taskStats(this.prisma, [task.id])).get(task.id)!;
    const remaining = taskRemaining(task, s);
    if (remaining <= 0) return [];
    const visible = await this.visibleStatuses(task.languageId);
    const mine = await this.prisma.recording.findMany({
      where: {
        speakerId: user.id,
        languageId: task.languageId,
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { vocabularyId: true },
    });
    const rows = await this.prisma.vocabulary.findMany({
      where: {
        languageId: task.languageId,
        status: { in: visible },
        id: { notIn: mine.map((m) => m.vocabularyId) },
        ...(task.unitId ? { exercises: { some: { lesson: { unitId: task.unitId } } } } : {}),
      },
      select: {
        id: true,
        word: true,
        partOfSpeech: true,
        translations: { where: { locale }, select: { text: true }, take: 1 },
        _count: {
          select: {
            exercises: true,
            recordings: { where: { status: { in: ["PENDING", "APPROVED"] } } },
          },
        },
      },
    });
    return rows
      .filter((r) => r._count.recordings < VOICE_RULES.voicesPerWord)
      .sort(
        (a, b) =>
          Number(b._count.exercises > 0) - Number(a._count.exercises > 0) ||
          a._count.recordings - b._count.recordings ||
          a.word.localeCompare(b.word),
      )
      .slice(0, Math.min(10, remaining))
      .map((r) => ({
        vocabularyId: r.id,
        word: r.word,
        gloss: this.gloss(r.translations[0]?.text, locale),
        partOfSpeech: r.partOfSpeech,
        inLessons: r._count.exercises > 0,
      }));
  }

  async record(
    user: AuthUser,
    input: {
      taskId: string;
      vocabularyId: string;
      mimeType: string;
      durationMs: number;
      data: string;
    },
  ) {
    if (!this.storage.enabled) {
      throw new ServiceUnavailableException({
        code: "STORAGE_DISABLED",
        message: "O armazenamento de áudio ainda não está configurado.",
      });
    }
    const { task, profile } = await this.requireTask(user, input.taskId, "RECORD");
    const vocab = await this.prisma.vocabulary.findUnique({
      where: { id: input.vocabularyId },
      select: {
        id: true,
        languageId: true,
        status: true,
        _count: task.unitId
          ? { select: { exercises: { where: { lesson: { unitId: task.unitId } } } } }
          : false,
      },
    });
    const inScope =
      vocab &&
      vocab.languageId === task.languageId &&
      (!task.unitId || (vocab._count as { exercises: number } | undefined)?.exercises) &&
      (await this.visibleStatuses(task.languageId)).includes(vocab.status);
    if (!vocab || !inScope) {
      throw new NotFoundException({
        code: "WORD_NOT_FOUND",
        message: "Esta palavra não faz parte da tarefa.",
      });
    }
    const s = (await taskStats(this.prisma, [task.id])).get(task.id)!;
    if (taskRemaining(task, s) <= 0) {
      throw new ConflictException({ code: "TASK_FULL", message: "Esta tarefa já está completa." });
    }
    const mime = normalizeMime(input.mimeType);
    if (!mime) {
      throw new BadRequestException({
        code: "BAD_FORMAT",
        message: "Formato de áudio não aceite.",
      });
    }
    if (!durationOk(input.durationMs)) {
      throw new BadRequestException({
        code: "BAD_DURATION",
        message: "A gravação é demasiado curta ou demasiado longa.",
      });
    }
    const data = Buffer.from(input.data, "base64");
    if (data.length < 200 || data.length > VOICE_RULES.recording.maxBytes) {
      throw new BadRequestException({ code: "BAD_SIZE", message: "Ficheiro de áudio inválido." });
    }
    const already = await this.prisma.recording.findFirst({
      where: {
        speakerId: user.id,
        vocabularyId: vocab.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { id: true },
    });
    if (already) {
      throw new ConflictException({
        code: "ALREADY_RECORDED",
        message: "Já gravaste esta palavra.",
      });
    }
    const id = randomUUID();
    const storageKey = `rec_${id}.${AUDIO_MIME_TYPES[mime]}`;
    await this.storage.put(storageKey, data);
    return this.prisma.recording.create({
      data: {
        id,
        vocabularyId: vocab.id,
        languageId: vocab.languageId,
        speakerId: user.id,
        taskId: task.id,
        region: profile.region,
        storageKey,
        mimeType: mime,
        sizeBytes: data.length,
        durationMs: Math.round(input.durationMs),
      },
      select: { id: true, status: true },
    });
  }

  /**
   * O meu painel (falador): as minhas gravações mais recentes, com o estado e, nas
   * rejeitadas, os motivos dados pelos ouvintes (para melhorar). Nunca mostra quem ouviu.
   */
  async myRecordings(
    user: AuthUser,
    locale: string,
    status: "PENDING" | "APPROVED" | "REJECTED" | undefined,
  ) {
    const rows = await this.prisma.recording.findMany({
      where: { speakerId: user.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        status: true,
        createdAt: true,
        decidedAt: true,
        task: { select: { title: true } },
        vocabulary: {
          select: {
            word: true,
            translations: { where: { locale }, select: { text: true }, take: 1 },
          },
        },
        reviews: {
          where: { isControl: false, verdict: "REJECT" },
          select: { reason: true },
        },
      },
    });
    return rows.map((r) => ({
      recordingId: r.id,
      word: r.vocabulary.word,
      gloss: this.gloss(r.vocabulary.translations[0]?.text, locale),
      status: r.status,
      taskTitle: r.task?.title ?? null,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() ?? null,
      rejectReasons: [...new Set(r.reviews.flatMap((v) => (v.reason ? [v.reason] : [])))],
    }));
  }

  /* --------------------------------- ouvintes ---------------------------------- */

  /**
   * Próxima gravação para ouvir na tarefa: pendente, de outra pessoa, ainda não avaliada
   * por mim. De vez em quando (controlRate) vem uma já decidida, para medir a atenção — o
   * ouvinte não sabe qual é qual.
   */
  async nextReview(user: AuthUser, taskId: string, locale: string): Promise<ReviewItem | null> {
    const { task } = await this.requireTask(user, taskId, "REVIEW");
    const s = (await taskStats(this.prisma, [task.id])).get(task.id)!;
    if (taskRemaining(task, s) <= 0) return null;
    const base = {
      languageId: task.languageId,
      speakerId: { not: user.id },
      reviews: { none: { listenerId: user.id } },
    };
    let rec = null;
    if (Math.random() < VOICE_RULES.controlRate) {
      const where = { ...base, status: { in: ["APPROVED" as const, "REJECTED" as const] } };
      const total = await this.prisma.recording.count({ where });
      if (total > 0) {
        rec = await this.prisma.recording.findFirst({
          where,
          skip: Math.floor(Math.random() * total),
          select: this.reviewSelect(locale),
        });
      }
    }
    rec ??= await this.prisma.recording.findFirst({
      where: { ...base, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: this.reviewSelect(locale),
    });
    if (!rec) return null;
    return {
      recordingId: rec.id,
      word: rec.vocabulary.word,
      gloss: this.gloss(rec.vocabulary.translations[0]?.text, locale),
      partOfSpeech: rec.vocabulary.partOfSpeech,
      region: rec.region,
      durationMs: rec.durationMs,
    };
  }

  /** Áudio de uma gravação: ouvintes da língua, administradores e o próprio falador. */
  async audio(user: AuthUser, recordingId: string): Promise<{ data: Buffer; mime: string }> {
    const rec = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { languageId: true, speakerId: true, storageKey: true, mimeType: true },
    });
    if (!rec) throw new NotFoundException("Gravação não encontrada.");
    // Ouvintes (nunca a própria, para avaliar), administradores e o próprio falador (no
    // seu painel, para ouvir o que gravou).
    const own = rec.speakerId === user.id;
    const listener = this.hasRole(user, "VOICE_LISTENER", rec.languageId) && !own;
    if (!this.isAdmin(user) && !listener && !own) {
      throw new ForbiddenException("Sem acesso a esta gravação.");
    }
    const data = await this.storage.get(rec.storageKey);
    if (!data) throw new NotFoundException("Ficheiro de áudio em falta.");
    return { data, mime: rec.mimeType };
  }

  async review(
    user: AuthUser,
    recordingId: string,
    input: { taskId: string; verdict: "APPROVE" | "REJECT"; reason: string | null },
  ) {
    const { task } = await this.requireTask(user, input.taskId, "REVIEW");
    const rec = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { id: true, languageId: true, speakerId: true, status: true, taskId: true },
    });
    if (!rec || rec.languageId !== task.languageId) {
      throw new NotFoundException("Gravação não encontrada.");
    }
    if (rec.speakerId === user.id) {
      throw new ForbiddenException({
        code: "OWN_RECORDING",
        message: "Não podes avaliar as tuas próprias gravações.",
      });
    }
    const s = (await taskStats(this.prisma, [task.id])).get(task.id)!;
    if (taskRemaining(task, s) <= 0) {
      throw new ConflictException({ code: "TASK_FULL", message: "Esta tarefa já está completa." });
    }
    const reason = input.verdict === "REJECT" ? (input.reason ?? "OTHER") : null;

    let approvedNow = false;
    try {
      await this.prisma.$transaction(
        async (tx) => {
          // Bloqueia a gravação: dois ouvintes ao mesmo tempo não decidem duas vezes.
          await tx.$executeRaw`SELECT id FROM recordings WHERE id = ${rec.id}::uuid FOR UPDATE`;
          const fresh = await tx.recording.findUniqueOrThrow({
            where: { id: rec.id },
            include: { vocabulary: { select: { id: true, audio: { select: { status: true } } } } },
          });
          if (fresh.status !== "PENDING") {
            // Já decidida: é uma pergunta de controlo (não decide nem paga).
            await tx.recordingReview.create({
              data: {
                recordingId: rec.id,
                listenerId: user.id,
                taskId: task.id,
                verdict: input.verdict,
                reason: reason as never,
                isControl: true,
                matched: controlMatched(input.verdict, fresh.status),
              },
            });
            return;
          }
          await tx.recordingReview.create({
            data: {
              recordingId: rec.id,
              listenerId: user.id,
              taskId: task.id,
              verdict: input.verdict,
              reason: reason as never,
            },
          });
          const approvals = fresh.approvals + (input.verdict === "APPROVE" ? 1 : 0);
          const rejections = fresh.rejections + (input.verdict === "REJECT" ? 1 : 0);
          const status = decide(approvals, rejections);
          let audioId: string | null = null;
          if (status === "APPROVED") {
            approvedNow = true;
            const speaker = await tx.voiceContributor.findUnique({
              where: { userId: fresh.speakerId },
              select: { displayName: true, region: true },
            });
            const asset = await tx.audioAsset.create({
              data: {
                languageId: fresh.languageId,
                storageKey: fresh.storageKey,
                url: MediaUrls.audioPath(fresh.storageKey),
                mimeType: fresh.mimeType,
                durationMs: fresh.durationMs,
                speakerName: speaker?.displayName ?? null,
                region: fresh.region ?? speaker?.region ?? null,
                consentRecorded: true,
                status: "APPROVED",
                createdById: fresh.speakerId,
              },
              select: { id: true },
            });
            audioId = asset.id;
            // A palavra passa a tocar esta voz se ainda não tiver uma aprovada.
            if (fresh.vocabulary.audio?.status !== "APPROVED") {
              await tx.vocabulary.update({
                where: { id: fresh.vocabulary.id },
                data: { audioId: asset.id },
              });
            }
          }
          await tx.recording.update({
            where: { id: rec.id },
            data: {
              approvals,
              rejections,
              status,
              ...(status !== "PENDING" ? { decidedAt: new Date() } : {}),
              ...(audioId ? { audioId } : {}),
            },
          });
        },
        { maxWait: 10_000, timeout: 20_000 },
      );
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") {
        throw new ConflictException({
          code: "ALREADY_REVIEWED",
          message: "Já avaliaste esta gravação.",
        });
      }
      throw e;
    }
    // Tarefas que ficaram pagas por inteiro passam a concluídas.
    await this.completeIfFinished([task.id, ...(approvedNow && rec.taskId ? [rec.taskId] : [])]);
    return { ok: true };
  }

  /* --------------------------------- auxiliares --------------------------------- */

  /** Tarefa minha, ativa, do tipo certo; com papel, consentimento e sem pausa. */
  private async requireTask(user: AuthUser, taskId: string, kind: TaskKind) {
    const task = await this.prisma.voiceTask.findUnique({ where: { id: taskId } });
    if (!task || task.assigneeId !== user.id || task.kind !== kind) {
      throw new NotFoundException({ code: "TASK_NOT_FOUND", message: "Tarefa não encontrada." });
    }
    if (task.status !== "ACTIVE") {
      throw new ForbiddenException({
        code: "TASK_NOT_ACTIVE",
        message: "Esta tarefa não está ativa.",
      });
    }
    const profile = await this.assertContributor(
      user,
      kind === "RECORD" ? "VOICE_SPEAKER" : "VOICE_LISTENER",
      task.languageId,
    );
    if (profile.paused) {
      throw new ForbiddenException({
        code: "PAUSED",
        message: "A tua participação está em pausa. Fala com a equipa.",
      });
    }
    return { task, profile };
  }

  private async completeIfFinished(taskIds: string[]) {
    const ids = [...new Set(taskIds)];
    const tasks = await this.prisma.voiceTask.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: { id: true, kind: true, target: true },
    });
    if (!tasks.length) return;
    const stats = await taskStats(
      this.prisma,
      tasks.map((t) => t.id),
    );
    const done = tasks.filter((t) => taskFinished(t, stats.get(t.id)!)).map((t) => t.id);
    if (done.length) {
      await this.prisma.voiceTask.updateMany({
        where: { id: { in: done }, status: "ACTIVE" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }
  }

  private isAdmin(user: AuthUser) {
    return user.roles.some((r) => r.role === "ADMIN" || r.role === "SUPER_ADMIN");
  }

  /** Papel na língua (papel sem língua = todas). SUPER_ADMIN pode tudo (para testar). */
  private hasRole(user: AuthUser, role: VoiceRole, languageId: string) {
    return user.roles.some(
      (r) =>
        r.role === "SUPER_ADMIN" ||
        (r.role === role && (r.languageId === null || r.languageId === languageId)),
    );
  }

  private hasAnyVoiceRole(user: AuthUser) {
    return user.roles.some(
      (r) => r.role === "SUPER_ADMIN" || r.role === "VOICE_SPEAKER" || r.role === "VOICE_LISTENER",
    );
  }

  private noRole() {
    return new ForbiddenException({
      code: "NOT_A_CONTRIBUTOR",
      message: "Esta área é só para faladores e ouvintes convidados.",
    });
  }

  /** Papel certo + consentimento atual. Devolve o perfil. */
  private async assertContributor(user: AuthUser, role: VoiceRole, languageId: string) {
    if (!this.hasRole(user, role, languageId)) throw this.noRole();
    const profile = await this.prisma.voiceContributor.findUnique({ where: { userId: user.id } });
    if (!profile || profile.consentVersion !== VOICE_RULES.consentVersion) {
      throw new ForbiddenException({
        code: "CONSENT_REQUIRED",
        message: "Aceita primeiro as condições de participação.",
      });
    }
    return profile;
  }

  private async visibleStatuses(languageId: string) {
    const language = await this.prisma.language.findUnique({
      where: { id: languageId },
      select: { status: true },
    });
    if (!language || !isPubliclyListed(language.status)) {
      throw new NotFoundException({
        code: "LANGUAGE_NOT_AVAILABLE",
        message: "Língua indisponível.",
      });
    }
    return visibleContentStatuses(language.status);
  }

  private gloss(text: string | undefined, locale: string) {
    if (!text) return null;
    return (locale === "en" ? shortGloss(text) : text.trim()) || null;
  }

  private reviewSelect(locale: string) {
    return {
      id: true,
      region: true,
      durationMs: true,
      vocabulary: {
        select: {
          word: true,
          partOfSpeech: true,
          translations: { where: { locale }, select: { text: true }, take: 1 },
        },
      },
    } as const;
  }
}
