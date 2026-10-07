import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { shortGloss } from "../courses/course-builder.js";
import { MIN_LESSON_QUESTIONS } from "../courses/courses.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { ContentStatus } from "../generated/prisma/enums.js";
import { isPubliclyListed, visibleContentStatuses } from "../languages/visibility.js";
import { levelForXp } from "../progress/rules/levels.js";
import { isValidTimeZone, localDate } from "../progress/rules/local-date.js";
import {
  DEFAULT_REWARD_RULES,
  lessonRewards,
  milestoneAchievements,
  type RewardRule,
  toRewardTable,
} from "../progress/rules/rewards.js";
import { applyActivity } from "../progress/rules/streak.js";
import type { AuthUser } from "../users/users.service.js";
import {
  buildQuestions,
  evaluateAttempt,
  lessonAccess,
  type QuizItem,
  type StoredQuestion,
  toPublicQuestion,
} from "./lesson-rules.js";

const ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_LOCALES = ["pt", "en", "fr"] as const;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export interface LessonResult {
  flagged: boolean;
  total: number;
  correctFirstTry: number;
  accuracy: number;
  durationSeconds: number;
  firstCompletion: boolean;
  xp: number;
  coins: number;
  streak: { current: number; longest: number; extendedToday: boolean; frozenDays: string[] };
  level: { before: number; after: number; leveledUp: boolean };
  achievements: string[];
  totals: { xpTotal: number; coins: number };
}

/**
 * Lições jogadas contra o servidor (docs/REGRAS_DE_NEGOCIO.md §5): o servidor escolhe as
 * perguntas, corrige cada resposta, mede o tempo e paga as recompensas. O cliente só mostra.
 */
@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lições visíveis do curso pela ordem de jogo (unidade, depois lição). */
  private async courseLessonIds(courseId: string, visible: ContentStatus[]) {
    const units = await this.prisma.unit.findMany({
      where: { courseId, status: { in: visible } },
      orderBy: { order: "asc" },
      select: {
        lessons: {
          where: { status: { in: visible } },
          orderBy: { order: "asc" },
          select: { id: true },
        },
      },
    });
    return units.flatMap((u) => u.lessons.map((l) => l.id));
  }

  private async completedSet(userId: string, lessonIds: string[]) {
    const rows = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds }, status: "COMPLETED" },
      select: { lessonId: true },
    });
    return new Set(rows.map((r) => r.lessonId));
  }

  /** Palavras de uma unidade com o significado no idioma pedido (fonte em inglês resumida). */
  private async unitItems(unitId: string, visible: ContentStatus[], locale: string) {
    const rows = await this.prisma.exercise.findMany({
      where: {
        lesson: { unitId },
        status: { in: visible },
        vocabularyId: { not: null },
      },
      orderBy: { order: "asc" },
      select: {
        id: true,
        lessonId: true,
        vocabulary: {
          select: {
            id: true,
            word: true,
            partOfSpeech: true,
            translations: { where: { locale }, select: { text: true }, take: 1 },
          },
        },
      },
    });
    return rows.flatMap((r) => {
      const v = r.vocabulary;
      const text = v?.translations[0]?.text;
      if (!v || !text) return [];
      const gloss = locale === "en" ? shortGloss(text) : text.trim();
      if (!gloss) return [];
      const item: QuizItem & { lessonId: string | null } = {
        exerciseId: r.id,
        vocabularyId: v.id,
        word: v.word,
        gloss,
        partOfSpeech: v.partOfSpeech,
        lessonId: r.lessonId,
      };
      return [item];
    });
  }

  async start(user: AuthUser, lessonId: string, requestedLocale?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        status: true,
        unitId: true,
        unit: {
          select: {
            courseId: true,
            course: { select: { language: { select: { id: true, status: true } } } },
          },
        },
      },
    });
    const language = lesson?.unit.course.language;
    if (!lesson || !language || !isPubliclyListed(language.status)) {
      throw new NotFoundException("Lição não encontrada.");
    }
    const visible = visibleContentStatuses(language.status);
    if (!visible.includes(lesson.status)) throw new NotFoundException("Lição não encontrada.");

    const order = await this.courseLessonIds(lesson.unit.courseId, visible);
    const access = lessonAccess(order, await this.completedSet(user.id, order), lesson.id);
    if (access === "locked") {
      throw new ForbiddenException({
        code: "LESSON_LOCKED",
        message: "Conclui as lições anteriores primeiro.",
      });
    }

    const profile = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { uiLocale: true },
    });
    let locale = (SUPPORTED_LOCALES as readonly string[]).includes(requestedLocale ?? "")
      ? requestedLocale!
      : profile.uiLocale;
    let pool = await this.unitItems(lesson.unitId, visible, locale);
    if (
      pool.filter((i) => i.lessonId === lesson.id).length < MIN_LESSON_QUESTIONS &&
      locale !== "en"
    ) {
      locale = "en"; // sem significados suficientes neste idioma: usa a fonte em inglês
      pool = await this.unitItems(lesson.unitId, visible, locale);
    }
    const items = pool.filter((i) => i.lessonId === lesson.id);
    if (items.length < MIN_LESSON_QUESTIONS) {
      throw new UnprocessableEntityException({
        code: "LESSON_NOT_PLAYABLE",
        message: "Esta lição ainda não tem perguntas suficientes.",
      });
    }
    const questions = buildQuestions(items, pool, Math.random);
    const now = new Date();

    const attempt = await this.prisma.$transaction(async (tx) => {
      // Só uma tentativa ativa por lição: as anteriores ficam abandonadas (ou expiradas).
      await tx.lessonAttempt.updateMany({
        where: {
          userId: user.id,
          lessonId: lesson.id,
          status: "IN_PROGRESS",
          expiresAt: { lt: now },
        },
        data: { status: "EXPIRED" },
      });
      await tx.lessonAttempt.updateMany({
        where: { userId: user.id, lessonId: lesson.id, status: "IN_PROGRESS" },
        data: { status: "ABANDONED" },
      });
      return tx.lessonAttempt.create({
        data: {
          userId: user.id,
          lessonId: lesson.id,
          locale,
          exerciseIds: questions.map((q) => q.exerciseId),
          total: questions.length,
          questions: questions as unknown as Prisma.InputJsonValue,
          expiresAt: new Date(now.getTime() + ATTEMPT_TTL_MS),
        },
        select: { id: true, expiresAt: true },
      });
    });

    return {
      attemptId: attempt.id,
      lessonId: lesson.id,
      locale,
      beta: language.status === "BETA",
      expiresAt: attempt.expiresAt,
      total: questions.length,
      questions: questions.map(toPublicQuestion),
    };
  }

  private async openAttempt(user: AuthUser, attemptId: string) {
    const attempt = await this.prisma.lessonAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== user.id)
      throw new NotFoundException("Tentativa não encontrada.");
    return attempt;
  }

  async answer(user: AuthUser, attemptId: string, body: { exerciseId: string; optionId: string }) {
    const attempt = await this.openAttempt(user, attemptId);
    if (attempt.status !== "IN_PROGRESS") {
      throw new ConflictException({
        code: "ATTEMPT_CLOSED",
        message: "Esta tentativa já terminou.",
      });
    }
    if (attempt.expiresAt < new Date()) {
      await this.prisma.lessonAttempt.update({
        where: { id: attempt.id },
        data: { status: "EXPIRED" },
      });
      throw new GoneException({
        code: "ATTEMPT_EXPIRED",
        message: "A tentativa expirou. Começa de novo.",
      });
    }
    const questions = (attempt.questions ?? []) as unknown as StoredQuestion[];
    const q = questions.find((x) => x.exerciseId === body.exerciseId);
    if (!q)
      throw new BadRequestException({ code: "UNKNOWN_EXERCISE", message: "Pergunta inválida." });
    if (!q.options.some((o) => o.id === body.optionId)) {
      throw new BadRequestException({ code: "UNKNOWN_OPTION", message: "Opção inválida." });
    }

    const previous = await this.prisma.lessonAttemptAnswer.findMany({
      where: { attemptId: attempt.id, exerciseId: q.exerciseId },
      select: { correct: true },
    });
    if (previous.some((a) => a.correct)) {
      throw new ConflictException({
        code: "ALREADY_SOLVED",
        message: "Esta pergunta já está resolvida.",
      });
    }
    const round = previous.length + 1;
    const correct = body.optionId === q.correctOptionId;
    try {
      await this.prisma.$transaction([
        this.prisma.lessonAttemptAnswer.create({
          data: {
            attemptId: attempt.id,
            exerciseId: q.exerciseId,
            round,
            optionId: body.optionId,
            correct,
          },
        }),
        ...(round === 1 && correct
          ? [
              this.prisma.lessonAttempt.update({
                where: { id: attempt.id },
                data: { correctFirstTry: { increment: 1 } },
              }),
            ]
          : []),
      ]);
    } catch {
      // Duas respostas ao mesmo tempo para a mesma volta (duplo toque): só a primeira conta.
      throw new ConflictException({ code: "DUPLICATE_ANSWER", message: "Resposta já registada." });
    }

    const vocab = await this.prisma.vocabulary.findUnique({
      where: { id: q.vocabularyId },
      select: { word: true, sourceRef: true, audio: { select: { url: true, speakerName: true } } },
    });
    const right = q.options.find((o) => o.id === q.correctOptionId)!;
    return {
      correct,
      round,
      correctOptionId: q.correctOptionId,
      correctLabel: right.label,
      word: vocab?.word ?? null,
      // Áudio e fonte só depois de responder (antes, revelariam a resposta).
      audio: vocab?.audio ? { url: vocab.audio.url, speaker: vocab.audio.speakerName } : null,
      sourceUrl: vocab?.sourceRef ?? null,
    };
  }

  async complete(user: AuthUser, attemptId: string): Promise<LessonResult> {
    const attempt = await this.openAttempt(user, attemptId);
    if (attempt.status === "COMPLETED" && attempt.result)
      return attempt.result as unknown as LessonResult;
    if (attempt.status !== "IN_PROGRESS") {
      throw new ConflictException({
        code: "ATTEMPT_CLOSED",
        message: "Esta tentativa já terminou.",
      });
    }
    const now = new Date();
    if (attempt.expiresAt < now) {
      await this.prisma.lessonAttempt.update({
        where: { id: attempt.id },
        data: { status: "EXPIRED" },
      });
      throw new GoneException({
        code: "ATTEMPT_EXPIRED",
        message: "A tentativa expirou. Começa de novo.",
      });
    }
    const answers = await this.prisma.lessonAttemptAnswer.findMany({
      where: { attemptId: attempt.id },
      select: { exerciseId: true, round: true, correct: true },
    });
    const ev = evaluateAttempt({
      exerciseIds: attempt.exerciseIds,
      answers,
      startedAt: attempt.startedAt,
      now,
    });
    if (!ev.allSolved) {
      throw new UnprocessableEntityException({
        code: "LESSON_NOT_FINISHED",
        message: "Ainda há perguntas por acertar.",
      });
    }

    const rules = await this.prisma.rewardRule.findMany({ where: { active: true } });
    const table = toRewardTable([
      ...DEFAULT_REWARD_RULES.filter((d) => !rules.some((r) => r.key === d.key)),
      ...rules.map((r): RewardRule => ({ ...r, description: r.description })),
    ]);

    const result = await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.lessonAttempt.updateMany({
          where: { id: attempt.id, status: "IN_PROGRESS" },
          data: { status: "COMPLETED", completedAt: now, flagged: ev.flagged },
        });
        if (claimed.count === 0) return null; // outro pedido concluiu-a ao mesmo tempo

        const userRow = await tx.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { timezone: true },
        });
        const tz = isValidTimeZone(userRow.timezone) ? userRow.timezone : "Europe/Lisbon";
        const today = localDate(now, tz);

        await tx.userStats.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        });
        // Tranca a linha de estatísticas: duas lições concluídas ao mesmo tempo não se atropelam.
        await tx.$queryRaw`SELECT 1 FROM "user_stats" WHERE "userId" = ${user.id}::uuid FOR UPDATE`;
        const stats = await tx.userStats.findUniqueOrThrow({ where: { userId: user.id } });
        const progress = await tx.lessonProgress.findUnique({
          where: { userId_lessonId: { userId: user.id, lessonId: attempt.lessonId } },
        });
        const firstCompletion = !progress || progress.completions === 0;
        const levelBefore = levelForXp(stats.xpTotal).level;

        const base: LessonResult = {
          flagged: ev.flagged,
          total: ev.total,
          correctFirstTry: ev.correctFirstTry,
          accuracy: ev.accuracy,
          durationSeconds: ev.durationSeconds,
          firstCompletion,
          xp: 0,
          coins: 0,
          streak: {
            current: stats.currentStreak,
            longest: stats.longestStreak,
            extendedToday: false,
            frozenDays: [],
          },
          level: { before: levelBefore, after: levelBefore, leveledUp: false },
          achievements: [],
          totals: { xpTotal: stats.xpTotal, coins: stats.coins },
        };
        if (ev.flagged) {
          // Tempo implausível: conclui mas não paga nem conta para a streak (§5.6).
          await tx.lessonAttempt.update({
            where: { id: attempt.id },
            data: { result: base as unknown as Prisma.InputJsonValue },
          });
          return base;
        }

        const lines = lessonRewards(
          { total: ev.total, correctFirstTry: ev.correctFirstTry, firstCompletion },
          table,
        );
        const xp = lines.reduce((n, l) => n + l.xp, 0);
        const xpTotal = stats.xpTotal + xp;
        const streak = applyActivity(
          {
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            lastActiveDate: stats.lastActiveDate ? isoDate(stats.lastActiveDate) : null,
            streakFreezes: stats.streakFreezes,
          },
          today,
        );
        const correctAnswers = stats.correctAnswers + ev.correctFirstTry;
        const lessonsCompleted = stats.lessonsCompleted + (firstCompletion ? 1 : 0);
        const levelAfter = levelForXp(xpTotal).level;

        const earned = new Set(
          (
            await tx.userAchievement.findMany({
              where: { userId: user.id },
              select: { achievementKey: true },
            })
          ).map((a) => a.achievementKey),
        );
        const newAchievements = milestoneAchievements({
          currentStreak: streak.state.currentStreak,
          correctAnswers,
          lessonsCompleted,
          level: levelAfter,
        }).filter((k) => !earned.has(k));

        // Moedas: lição (só 1.ª conclusão) e conquistas, com o saldo depois de cada movimento.
        let coins = stats.coins;
        const coinRows: Prisma.CoinTransactionCreateManyInput[] = [];
        const lessonCoins = lines.reduce((n, l) => n + l.coins, 0);
        if (lessonCoins > 0) {
          coins += lessonCoins;
          coinRows.push({
            userId: user.id,
            amount: lessonCoins,
            balanceAfter: coins,
            reason: "LESSON_COMPLETE",
            sourceType: "lesson_attempt",
            sourceId: attempt.id,
            localDate: asDate(today),
          });
        }
        for (const key of newAchievements) {
          const reward = table.get(key)?.coins ?? 0;
          if (reward <= 0) continue;
          coins += reward;
          coinRows.push({
            userId: user.id,
            amount: reward,
            balanceAfter: coins,
            reason: "ACHIEVEMENT",
            sourceType: "achievement",
            sourceId: key,
            localDate: asDate(today),
          });
        }

        await tx.xpEvent.createMany({
          data: lines
            .filter((l) => l.xp > 0)
            .map((l) => ({
              userId: user.id,
              amount: l.xp,
              reason: l.reason,
              sourceType: "lesson_attempt",
              sourceId: attempt.id,
              localDate: asDate(today),
            })),
        });
        if (coinRows.length) await tx.coinTransaction.createMany({ data: coinRows });
        if (newAchievements.length) {
          await tx.userAchievement.createMany({
            data: newAchievements.map((achievementKey) => ({ userId: user.id, achievementKey })),
            skipDuplicates: true,
          });
        }
        await tx.activityDay.createMany({
          data: [
            ...streak.frozenDays.map((d) => ({
              userId: user.id,
              localDate: asDate(d),
              kind: "FROZEN" as const,
            })),
            { userId: user.id, localDate: asDate(today), kind: "ACTIVE" as const },
          ],
          skipDuplicates: true,
        });
        await tx.userStats.update({
          where: { userId: user.id },
          data: {
            xpTotal,
            coins,
            correctAnswers,
            lessonsCompleted,
            currentStreak: streak.state.currentStreak,
            longestStreak: streak.state.longestStreak,
            lastActiveDate: streak.state.lastActiveDate
              ? asDate(streak.state.lastActiveDate)
              : null,
            streakFreezes: streak.state.streakFreezes,
          },
        });
        await tx.lessonProgress.upsert({
          where: { userId_lessonId: { userId: user.id, lessonId: attempt.lessonId } },
          create: {
            userId: user.id,
            lessonId: attempt.lessonId,
            status: "COMPLETED",
            completions: 1,
            bestAccuracy: ev.accuracy,
            firstCompletedAt: now,
            lastCompletedAt: now,
          },
          update: {
            status: "COMPLETED",
            completions: { increment: 1 },
            bestAccuracy: Math.max(progress?.bestAccuracy ?? 0, ev.accuracy),
            lastCompletedAt: now,
          },
        });

        const result: LessonResult = {
          ...base,
          xp,
          coins: coins - stats.coins,
          streak: {
            current: streak.state.currentStreak,
            longest: streak.state.longestStreak,
            extendedToday: streak.counted,
            frozenDays: streak.frozenDays,
          },
          level: { before: levelBefore, after: levelAfter, leveledUp: levelAfter > levelBefore },
          achievements: newAchievements,
          totals: { xpTotal, coins },
        };
        await tx.lessonAttempt.update({
          where: { id: attempt.id },
          data: { result: result as unknown as Prisma.InputJsonValue },
        });
        return result;
      },
      { timeout: 20_000 },
    );
    if (result) return result;
    const done = await this.prisma.lessonAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    return done.result as unknown as LessonResult;
  }

  /** Estado de cada lição do curso de uma língua para o utilizador (para o caminho de lições). */
  async progress(user: AuthUser, languageId: string) {
    const language = await this.prisma.language.findUnique({ where: { id: languageId } });
    if (!language || !isPubliclyListed(language.status)) {
      throw new NotFoundException("Língua não disponível.");
    }
    const visible = visibleContentStatuses(language.status);
    const course = await this.prisma.course.findFirst({
      where: { languageId, status: { in: visible } },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    if (!course) throw new NotFoundException("Esta língua ainda não tem curso.");
    const order = await this.courseLessonIds(course.id, visible);
    const rows = await this.prisma.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: order } },
      select: { lessonId: true, status: true, completions: true, bestAccuracy: true },
    });
    const completed = new Set(rows.filter((r) => r.status === "COMPLETED").map((r) => r.lessonId));
    const byId = new Map(rows.map((r) => [r.lessonId, r]));
    return {
      languageId,
      lessons: order.map((id) => ({
        lessonId: id,
        state: lessonAccess(order, completed, id),
        completions: byId.get(id)?.completions ?? 0,
        bestAccuracy: byId.get(id)?.bestAccuracy ?? null,
      })),
    };
  }
}
