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
import type { Role } from "../generated/prisma/client.js";
import { isPubliclyListed, visibleContentStatuses } from "../languages/visibility.js";
import type { AuthUser } from "../users/users.service.js";
import { AudioStorage } from "./audio-storage.js";
import { MediaUrls } from "./media-urls.js";
import {
  AUDIO_MIME_TYPES,
  controlMatched,
  decide,
  durationOk,
  normalizeMime,
  VOICE_RULES,
} from "./voice-rules.js";

type VoiceRole = Extract<Role, "VOICE_SPEAKER" | "VOICE_LISTENER">;

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

const RANGE_DAYS = 7;

/**
 * Gravações de pronúncia: Faladores gravam palavras, Ouvintes aprovam ou rejeitam.
 * - quem grava nunca avalia as próprias gravações (e os ouvintes não sabem quem gravou);
 * - 2 votos iguais decidem; empate 1–1 espera por um 3.º ouvinte;
 * - perguntas de controlo (gravações já decididas) medem a atenção dos ouvintes;
 * - aprovada → passa a áudio da palavra (lições, desafio do dia e Arena).
 */
@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AudioStorage,
  ) {}

  /* ------------------------------ perfil e acesso ------------------------------ */

  async me(user: AuthUser) {
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
    const [recorded, approved, reviews] = await Promise.all([
      this.prisma.recording.count({ where: { speakerId: user.id, createdAt: { gte: since } } }),
      this.prisma.recording.count({
        where: { speakerId: user.id, status: "APPROVED", decidedAt: { gte: since } },
      }),
      this.prisma.recordingReview.count({
        where: { listenerId: user.id, isControl: false, createdAt: { gte: since } },
      }),
    ]);
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
          }
        : null,
      last7Days: { recorded, approved, reviews },
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

  /* --------------------------------- faladores --------------------------------- */

  /**
   * Próximas palavras para gravar: primeiro as das lições, depois as que têm menos vozes.
   * Saem da fila as que já gravei (pendentes ou aprovadas) e as que já têm vozes suficientes.
   */
  async wordsToRecord(
    user: AuthUser,
    languageId: string,
    locale: string,
    limit = 10,
  ): Promise<WordToRecord[]> {
    await this.assertContributor(user, "VOICE_SPEAKER", languageId);
    const visible = await this.visibleStatuses(languageId);
    const mine = await this.prisma.recording.findMany({
      where: { speakerId: user.id, languageId, status: { in: ["PENDING", "APPROVED"] } },
      select: { vocabularyId: true },
    });
    const rows = await this.prisma.vocabulary.findMany({
      where: {
        languageId,
        status: { in: visible },
        id: { notIn: mine.map((m) => m.vocabularyId) },
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
      .slice(0, limit)
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
    input: { vocabularyId: string; mimeType: string; durationMs: number; data: string },
  ) {
    if (!this.storage.enabled) {
      throw new ServiceUnavailableException({
        code: "STORAGE_DISABLED",
        message: "O armazenamento de áudio ainda não está configurado.",
      });
    }
    const vocab = await this.prisma.vocabulary.findUnique({
      where: { id: input.vocabularyId },
      select: { id: true, languageId: true, status: true },
    });
    if (!vocab)
      throw new NotFoundException({ code: "WORD_NOT_FOUND", message: "Palavra não encontrada." });
    const profile = await this.assertContributor(user, "VOICE_SPEAKER", vocab.languageId);
    if (!(await this.visibleStatuses(vocab.languageId)).includes(vocab.status)) {
      throw new NotFoundException({ code: "WORD_NOT_FOUND", message: "Palavra não encontrada." });
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
    const rec = await this.prisma.recording.create({
      data: {
        id,
        vocabularyId: vocab.id,
        languageId: vocab.languageId,
        speakerId: user.id,
        region: profile.region,
        storageKey,
        mimeType: mime,
        sizeBytes: data.length,
        durationMs: Math.round(input.durationMs),
      },
      select: { id: true, status: true },
    });
    return rec;
  }

  /* --------------------------------- ouvintes ---------------------------------- */

  /**
   * Próxima gravação para ouvir: pendente, de outra pessoa, ainda não avaliada por mim.
   * De vez em quando (controlRate) vem uma já decidida, para medir a atenção — o ouvinte
   * não sabe qual é qual.
   */
  async nextReview(user: AuthUser, languageId: string, locale: string): Promise<ReviewItem | null> {
    await this.assertContributor(user, "VOICE_LISTENER", languageId);
    const base = {
      languageId,
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

  /** Áudio de uma gravação (ouvintes da língua e administradores; nunca o próprio falador). */
  async audio(user: AuthUser, recordingId: string): Promise<{ data: Buffer; mime: string }> {
    const rec = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { languageId: true, speakerId: true, storageKey: true, mimeType: true },
    });
    if (!rec) throw new NotFoundException("Gravação não encontrada.");
    const admin = this.isAdmin(user);
    if (
      !admin &&
      (!this.hasRole(user, "VOICE_LISTENER", rec.languageId) || rec.speakerId === user.id)
    ) {
      throw new ForbiddenException("Sem acesso a esta gravação.");
    }
    const data = await this.storage.get(rec.storageKey);
    if (!data) throw new NotFoundException("Ficheiro de áudio em falta.");
    return { data, mime: rec.mimeType };
  }

  async review(
    user: AuthUser,
    recordingId: string,
    input: { verdict: "APPROVE" | "REJECT"; reason: string | null },
  ) {
    const rec = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { id: true, languageId: true, speakerId: true, status: true },
    });
    if (!rec) throw new NotFoundException("Gravação não encontrada.");
    await this.assertContributor(user, "VOICE_LISTENER", rec.languageId);
    if (rec.speakerId === user.id) {
      throw new ForbiddenException({
        code: "OWN_RECORDING",
        message: "Não podes avaliar as tuas próprias gravações.",
      });
    }
    const reason = input.verdict === "REJECT" ? (input.reason ?? "OTHER") : null;

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
              verdict: input.verdict,
              reason: reason as never,
            },
          });
          const approvals = fresh.approvals + (input.verdict === "APPROVE" ? 1 : 0);
          const rejections = fresh.rejections + (input.verdict === "REJECT" ? 1 : 0);
          const status = decide(approvals, rejections);
          let audioId: string | null = null;
          if (status === "APPROVED") {
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
    return { ok: true };
  }

  /* ---------------------------- administração e pagamentos ---------------------------- */

  async overview(languageId: string) {
    const [pending, approved, rejected, words, withAudio, contributors] = await Promise.all([
      this.prisma.recording.count({ where: { languageId, status: "PENDING" } }),
      this.prisma.recording.count({ where: { languageId, status: "APPROVED" } }),
      this.prisma.recording.count({ where: { languageId, status: "REJECTED" } }),
      this.prisma.vocabulary.count({ where: { languageId, exercises: { some: {} } } }),
      this.prisma.vocabulary.count({
        where: { languageId, exercises: { some: {} }, audio: { status: "APPROVED" } },
      }),
      this.prisma.voiceContributor.count(),
    ]);
    return {
      pending,
      approved,
      rejected,
      lessonWords: words,
      lessonWordsWithAudio: withAudio,
      contributors,
    };
  }

  /**
   * Contas para pagar (período [from, to)): gravações aprovadas por falador e votos (sem
   * controlos) por ouvinte, com a taxa de acerto nos controlos. Os valores em dinheiro
   * calculam-se no painel a partir de VOICE_CONFIG.pay (decisão do dono).
   */
  async report(from: Date, to: Date) {
    const range = { gte: from, lt: to };
    const [recorded, approved, reviews, controls, controlsOk] = await Promise.all([
      this.prisma.recording.groupBy({
        by: ["speakerId"],
        where: { createdAt: range },
        _count: true,
      }),
      this.prisma.recording.groupBy({
        by: ["speakerId"],
        where: { status: "APPROVED", decidedAt: range },
        _count: true,
      }),
      this.prisma.recordingReview.groupBy({
        by: ["listenerId"],
        where: { isControl: false, createdAt: range },
        _count: true,
      }),
      this.prisma.recordingReview.groupBy({
        by: ["listenerId"],
        where: { isControl: true, createdAt: range },
        _count: true,
      }),
      this.prisma.recordingReview.groupBy({
        by: ["listenerId"],
        where: { isControl: true, matched: true, createdAt: range },
        _count: true,
      }),
    ]);
    const ids = new Set([
      ...recorded.map((r) => r.speakerId),
      ...approved.map((r) => r.speakerId),
      ...reviews.map((r) => r.listenerId),
      ...controls.map((r) => r.listenerId),
    ]);
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, username: true, name: true, email: true },
    });
    const count = (list: { _count: number }[], key: "speakerId" | "listenerId", id: string) =>
      (list as ({ _count: number } & Record<string, string | number>)[]).find((r) => r[key] === id)
        ?._count ?? 0;
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      people: users
        .map((u) => ({
          userId: u.id,
          username: u.username,
          name: u.name,
          email: u.email,
          recorded: count(recorded, "speakerId", u.id),
          approved: count(approved, "speakerId", u.id),
          reviews: count(reviews, "listenerId", u.id),
          controls: count(controls, "listenerId", u.id),
          controlsMatched: count(controlsOk, "listenerId", u.id),
        }))
        .sort((a, b) => b.approved + b.reviews - (a.approved + a.reviews)),
    };
  }

  /* --------------------------------- auxiliares --------------------------------- */

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
