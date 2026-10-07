import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import { isPubliclyListed, visibleContentStatuses } from "../languages/visibility.js";
import { buildQuestions, type StoredQuestion, toPublicQuestion } from "../lessons/lesson-rules.js";
import { loadQuizItems } from "../lessons/quiz-items.js";
import {
  type GrantResult,
  grantActivity,
  loadRewardTable,
  noGrant,
  lockStats,
} from "../progress/grant.js";
import { isValidTimeZone, localDate } from "../progress/rules/local-date.js";
import type { AuthUser } from "../users/users.service.js";
import { DAILY_QUESTIONS, compareRank, isImplausible, pickDaily, utcDay } from "./daily-rules.js";

const SUPPORTED_LOCALES = ["pt", "en", "fr"] as const;
const BOTH_LOCALES = ["pt", "en"];

interface GivenAnswer {
  exerciseId: string;
  optionId: string;
  correct: boolean;
}

export interface DailyResult extends GrantResult {
  flagged: boolean;
  total: number;
  correct: number;
  durationMs: number;
  /** false quando o desafio já tinha sido pago hoje (dia local) noutra língua/dia UTC. */
  rewarded: boolean;
}

/**
 * Desafio do dia (docs/REGRAS_DE_NEGOCIO.md §9): 5 perguntas iguais para todos no dia UTC,
 * uma só tentativa por pessoa, uma resposta por pergunta, recompensa uma vez por dia local,
 * ranking por certas e tempo do servidor.
 */
@Injectable()
export class DailyService {
  constructor(private readonly prisma: PrismaService) {}

  private async language(languageId: string) {
    const language = await this.prisma.language.findUnique({ where: { id: languageId } });
    if (!language || !isPubliclyListed(language.status)) {
      throw new NotFoundException("Língua não disponível.");
    }
    return language;
  }

  /** O desafio de hoje (cria-o na primeira vez que alguém o pede). */
  async today(languageId: string, now = new Date()) {
    const language = await this.language(languageId);
    const day = utcDay(now);
    const date = new Date(`${day}T00:00:00Z`);
    const existing = await this.prisma.dailyChallenge.findUnique({
      where: { languageId_date: { languageId, date } },
    });
    if (existing) return { challenge: existing, language };

    // Só palavras com significado em português E inglês: o desafio é igual para todos.
    const candidates = await this.prisma.exercise.findMany({
      where: {
        languageId,
        status: { in: visibleContentStatuses(language.status) },
        vocabulary: { AND: BOTH_LOCALES.map((l) => ({ translations: { some: { locale: l } } })) },
      },
      select: { id: true },
    });
    const exerciseIds = pickDaily(
      candidates.map((c) => c.id),
      `${languageId}:${day}`,
    );
    if (exerciseIds.length < DAILY_QUESTIONS) {
      throw new UnprocessableEntityException({
        code: "DAILY_NOT_AVAILABLE",
        message: "Ainda não há conteúdo suficiente para o desafio do dia.",
      });
    }
    try {
      const challenge = await this.prisma.dailyChallenge.create({
        data: { languageId, date, exerciseIds },
      });
      return { challenge, language };
    } catch {
      // Outro pedido criou-o ao mesmo tempo.
      const challenge = await this.prisma.dailyChallenge.findUniqueOrThrow({
        where: { languageId_date: { languageId, date } },
      });
      return { challenge, language };
    }
  }

  private async rankOf(
    challengeId: string,
    attempt: { correct: number; durationMs: number; completedAt: Date },
  ) {
    const better = await this.prisma.dailyChallengeAttempt.count({
      where: {
        challengeId,
        status: "COMPLETED",
        flagged: false,
        OR: [
          { correct: { gt: attempt.correct } },
          { correct: attempt.correct, durationMs: { lt: attempt.durationMs } },
          {
            correct: attempt.correct,
            durationMs: attempt.durationMs,
            completedAt: { lt: attempt.completedAt },
          },
        ],
      },
    });
    return better + 1;
  }

  async overview(user: AuthUser, languageId: string) {
    const { challenge } = await this.today(languageId);
    const table = await loadRewardTable(this.prisma);
    const rule = table.get("DAILY_CHALLENGE");
    const [participants, mine] = await Promise.all([
      this.prisma.dailyChallengeAttempt.count({
        where: { challengeId: challenge.id, status: "COMPLETED", flagged: false },
      }),
      this.prisma.dailyChallengeAttempt.findUnique({
        where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
      }),
    ]);
    const done = mine?.status === "COMPLETED";
    return {
      languageId,
      date: utcDay(challenge.date),
      questions: challenge.exerciseIds.length,
      xpReward: rule?.xp ?? 0,
      coinReward: rule?.coins ?? 0,
      participants,
      me: mine
        ? {
            status: mine.status,
            correct: mine.correct,
            total: mine.total,
            durationMs: mine.durationMs,
            flagged: mine.flagged,
            rank:
              done && !mine.flagged && mine.completedAt && mine.durationMs !== null
                ? await this.rankOf(challenge.id, {
                    correct: mine.correct,
                    durationMs: mine.durationMs,
                    completedAt: mine.completedAt,
                  })
                : null,
          }
        : null,
    };
  }

  async start(user: AuthUser, languageId: string, requestedLocale?: string) {
    const { challenge, language } = await this.today(languageId);
    const existing = await this.prisma.dailyChallengeAttempt.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
    });
    if (existing?.status === "COMPLETED") {
      throw new ConflictException({ code: "DAILY_DONE", message: "Já fizeste o desafio de hoje." });
    }
    if (existing) {
      // Retoma a tentativa (só há uma por dia): mesmas perguntas, respostas já dadas.
      const answered = (existing.answers as unknown as GivenAnswer[]).map((a) => a.exerciseId);
      return {
        attemptId: existing.id,
        locale: existing.locale,
        beta: language.status === "BETA",
        questions: (existing.questions as unknown as StoredQuestion[]).map(toPublicQuestion),
        answered,
      };
    }

    const profile = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { uiLocale: true },
    });
    const locale = (SUPPORTED_LOCALES as readonly string[]).includes(requestedLocale ?? "")
      ? requestedLocale!
      : (SUPPORTED_LOCALES as readonly string[]).includes(profile.uiLocale)
        ? profile.uiLocale
        : "pt";
    const useLocale = BOTH_LOCALES.includes(locale) ? locale : "en";
    const visible = visibleContentStatuses(language.status);
    const chosen = await loadQuizItems(
      this.prisma,
      { id: { in: challenge.exerciseIds } },
      useLocale,
    );
    const unitIds = [
      ...new Set(chosen.map((c) => c.unitId).filter((u): u is string => Boolean(u))),
    ];
    const pool = await loadQuizItems(
      this.prisma,
      { lesson: { unitId: { in: unitIds } }, status: { in: visible } },
      useLocale,
    );
    const questions = buildQuestions(chosen, pool, Math.random);
    try {
      const attempt = await this.prisma.dailyChallengeAttempt.create({
        data: {
          challengeId: challenge.id,
          userId: user.id,
          locale: useLocale,
          questions: questions as unknown as Prisma.InputJsonValue,
          total: questions.length,
        },
        select: { id: true },
      });
      return {
        attemptId: attempt.id,
        locale: useLocale,
        beta: language.status === "BETA",
        questions: questions.map(toPublicQuestion),
        answered: [] as string[],
      };
    } catch {
      throw new ConflictException({
        code: "DAILY_ALREADY_STARTED",
        message: "O desafio já foi começado noutro dispositivo. Atualiza.",
      });
    }
  }

  async answer(user: AuthUser, attemptId: string, body: { exerciseId: string; optionId: string }) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      // Tranca a tentativa: dois toques ao mesmo tempo não contam duas respostas.
      await tx.$queryRaw`SELECT 1 FROM "daily_challenge_attempts" WHERE "id" = ${attemptId}::uuid FOR UPDATE`;
      const attempt = await tx.dailyChallengeAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt || attempt.userId !== user.id) {
        throw new NotFoundException("Tentativa não encontrada.");
      }
      if (attempt.status !== "IN_PROGRESS") {
        throw new ConflictException({ code: "ATTEMPT_CLOSED", message: "O desafio já terminou." });
      }
      const questions = attempt.questions as unknown as StoredQuestion[];
      const q = questions.find((x) => x.exerciseId === body.exerciseId);
      if (!q)
        throw new BadRequestException({ code: "UNKNOWN_EXERCISE", message: "Pergunta inválida." });
      if (!q.options.some((o) => o.id === body.optionId)) {
        throw new BadRequestException({ code: "UNKNOWN_OPTION", message: "Opção inválida." });
      }
      const answers = attempt.answers as unknown as GivenAnswer[];
      if (answers.some((a) => a.exerciseId === q.exerciseId)) {
        throw new ConflictException({
          code: "ALREADY_ANSWERED",
          message: "Já respondeste a esta pergunta.",
        });
      }
      const correct = body.optionId === q.correctOptionId;
      await tx.dailyChallengeAttempt.update({
        where: { id: attempt.id },
        data: {
          answers: [
            ...answers,
            { exerciseId: q.exerciseId, optionId: body.optionId, correct },
          ] as unknown as Prisma.InputJsonValue,
          ...(correct ? { correct: { increment: 1 } } : {}),
        },
      });
      return { q, correct };
    });

    const vocab = await this.prisma.vocabulary.findUnique({
      where: { id: outcome.q.vocabularyId },
      select: { word: true, sourceRef: true, audio: { select: { url: true, speakerName: true } } },
    });
    return {
      correct: outcome.correct,
      round: 1,
      correctOptionId: outcome.q.correctOptionId,
      correctLabel: outcome.q.options.find((o) => o.id === outcome.q.correctOptionId)!.label,
      word: vocab?.word ?? null,
      audio: vocab?.audio ? { url: vocab.audio.url, speaker: vocab.audio.speakerName } : null,
      sourceUrl: vocab?.sourceRef ?? null,
    };
  }

  async complete(
    user: AuthUser,
    attemptId: string,
  ): Promise<DailyResult & { rank: number | null }> {
    const attempt = await this.prisma.dailyChallengeAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.userId !== user.id)
      throw new NotFoundException("Tentativa não encontrada.");
    if (attempt.status === "COMPLETED" && attempt.result) {
      return this.withRank(attempt.challengeId, attempt.result as unknown as DailyResult, attempt);
    }
    if (attempt.status !== "IN_PROGRESS") {
      throw new ConflictException({ code: "ATTEMPT_CLOSED", message: "O desafio já terminou." });
    }
    const answers = attempt.answers as unknown as GivenAnswer[];
    if (answers.length < attempt.total) {
      throw new UnprocessableEntityException({
        code: "DAILY_NOT_FINISHED",
        message: "Ainda há perguntas por responder.",
      });
    }
    const now = new Date();
    const durationMs = now.getTime() - attempt.startedAt.getTime();
    const flagged = isImplausible(durationMs, attempt.total);
    const table = await loadRewardTable(this.prisma);
    const rule = table.get("DAILY_CHALLENGE");

    const result = await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.dailyChallengeAttempt.updateMany({
          where: { id: attempt.id, status: "IN_PROGRESS" },
          data: { status: "COMPLETED", completedAt: now, durationMs, flagged },
        });
        if (claimed.count === 0) return null;

        const base = { flagged, total: attempt.total, correct: attempt.correct, durationMs };
        let res: DailyResult;
        if (flagged) {
          res = { ...base, rewarded: false, ...noGrant(await lockStats(tx, user.id)) };
        } else {
          // A recompensa paga-se uma vez por dia local, mesmo que o dia UTC mude.
          const userRow = await tx.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { timezone: true },
          });
          const tz = isValidTimeZone(userRow.timezone) ? userRow.timezone : "Europe/Lisbon";
          const today = localDate(now, tz);
          const alreadyPaid = await tx.xpEvent.count({
            where: {
              userId: user.id,
              reason: "DAILY_CHALLENGE",
              localDate: new Date(`${today}T00:00:00Z`),
            },
          });
          const pay = alreadyPaid === 0;
          const granted = await grantActivity(tx, {
            userId: user.id,
            now,
            sourceType: "daily_attempt",
            sourceId: attempt.id,
            xp: pay ? [{ reason: "DAILY_CHALLENGE", amount: rule?.xp ?? 0 }] : [],
            coins: pay ? [{ reason: "DAILY_CHALLENGE", amount: rule?.coins ?? 0 }] : [],
            correctAnswersDelta: attempt.correct,
            lessonsCompletedDelta: 0,
            table,
          });
          res = { ...base, rewarded: pay, ...granted };
        }
        await tx.dailyChallengeAttempt.update({
          where: { id: attempt.id },
          data: { result: res as unknown as Prisma.InputJsonValue },
        });
        return res;
      },
      { timeout: 20_000 },
    );
    const final =
      result ??
      ((await this.prisma.dailyChallengeAttempt.findUniqueOrThrow({ where: { id: attempt.id } }))
        .result as unknown as DailyResult);
    return this.withRank(attempt.challengeId, final, {
      flagged: final.flagged,
      correct: final.correct,
      durationMs: final.durationMs,
      completedAt: now,
    });
  }

  private async withRank(
    challengeId: string,
    result: DailyResult,
    a: { flagged: boolean; correct: number; durationMs: number | null; completedAt: Date | null },
  ) {
    const rank =
      a.flagged || a.durationMs === null || !a.completedAt
        ? null
        : await this.rankOf(challengeId, {
            correct: a.correct,
            durationMs: a.durationMs,
            completedAt: a.completedAt,
          });
    return { ...result, rank };
  }

  /** Ranking do desafio de hoje (top 20) e a posição de quem pede. */
  async ranking(user: AuthUser, languageId: string) {
    const { challenge } = await this.today(languageId);
    const rows = await this.prisma.dailyChallengeAttempt.findMany({
      where: { challengeId: challenge.id, status: "COMPLETED", flagged: false },
      select: {
        userId: true,
        correct: true,
        total: true,
        durationMs: true,
        completedAt: true,
        user: { select: { username: true, name: true, avatarColor: true, status: true } },
      },
    });
    const ranked = rows
      .filter((r) => r.user.status === "ACTIVE" && r.durationMs !== null && r.completedAt)
      .map((r) => ({ ...r, durationMs: r.durationMs!, completedAt: r.completedAt! }))
      .sort(compareRank);
    const entries = ranked.map((r, i) => ({
      position: i + 1,
      userId: r.userId,
      username: r.user.username,
      name: r.user.name,
      avatarColor: r.user.avatarColor,
      correct: r.correct,
      total: r.total,
      durationMs: r.durationMs,
      isMe: r.userId === user.id,
    }));
    return {
      date: utcDay(challenge.date),
      top: entries.slice(0, 20),
      me: entries.find((e) => e.isMe) ?? null,
    };
  }
}
