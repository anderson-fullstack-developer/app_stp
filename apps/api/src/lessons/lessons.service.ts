import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { MIN_LESSON_QUESTIONS } from "../courses/courses.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { ContentStatus } from "../generated/prisma/enums.js";
import { isPubliclyListed, visibleContentStatuses } from "../languages/visibility.js";
import { grantActivity, loadRewardTable, lockStats, noGrant } from "../progress/grant.js";
import { lessonRewards } from "../progress/rules/rewards.js";
import type { AuthUser } from "../users/users.service.js";
import { loadQuizItems } from "./quiz-items.js";
import {
  buildQuestions,
  evaluateAttempt,
  lessonAccess,
  type StoredQuestion,
  toPublicQuestion,
} from "./lesson-rules.js";

const ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_LOCALES = ["pt", "en", "fr"] as const;

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
  /** Palavras de uma unidade com o significado no idioma pedido. */
  private unitItems(unitId: string, visible: ContentStatus[], locale: string) {
    return loadQuizItems(this.prisma, { lesson: { unitId }, status: { in: visible } }, locale);
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

    const table = await loadRewardTable(this.prisma);

    const result = await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.lessonAttempt.updateMany({
          where: { id: attempt.id, status: "IN_PROGRESS" },
          data: { status: "COMPLETED", completedAt: now, flagged: ev.flagged },
        });
        if (claimed.count === 0) return null; // outro pedido concluiu-a ao mesmo tempo

        const stats = await lockStats(tx, user.id);
        const progress = await tx.lessonProgress.findUnique({
          where: { userId_lessonId: { userId: user.id, lessonId: attempt.lessonId } },
        });
        const firstCompletion = !progress || progress.completions === 0;
        const lessonFields = {
          flagged: ev.flagged,
          total: ev.total,
          correctFirstTry: ev.correctFirstTry,
          accuracy: ev.accuracy,
          durationSeconds: ev.durationSeconds,
          firstCompletion,
        };

        let result: LessonResult;
        if (ev.flagged) {
          // Tempo implausível: conclui mas não paga nem conta para a streak (§5.6).
          result = { ...lessonFields, ...noGrant(stats) };
        } else {
          const lines = lessonRewards(
            { total: ev.total, correctFirstTry: ev.correctFirstTry, firstCompletion },
            table,
          );
          const granted = await grantActivity(tx, {
            userId: user.id,
            now,
            sourceType: "lesson_attempt",
            sourceId: attempt.id,
            xp: lines.map((l) => ({ reason: l.reason, amount: l.xp })),
            // Moedas da lição só na 1.ª conclusão (lessonRewards já o garante).
            coins: [{ reason: "LESSON_COMPLETE", amount: lines.reduce((n, l) => n + l.coins, 0) }],
            correctAnswersDelta: ev.correctFirstTry,
            lessonsCompletedDelta: firstCompletion ? 1 : 0,
            table,
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
          result = { ...lessonFields, ...granted };
        }
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
