import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { levelForXp, type LevelInfo } from "./rules/levels.js";
import { addDays, daysBetween, isValidTimeZone, localDate } from "./rules/local-date.js";
import { ACHIEVEMENTS, achievementProgress } from "./rules/achievements.js";
import { effectiveStreak } from "./rules/streak.js";

export interface ProgressSummary {
  xpTotal: number;
  level: LevelInfo;
  coins: number;
  streak: {
    /** Streak como o utilizador a vê hoje (0 se já a perdeu). */
    current: number;
    longest: number;
    freezes: number;
    activeToday: boolean;
  };
  correctAnswers: number;
  lessonsCompleted: number;
  /** Palavras diferentes já acertadas em lições. */
  wordsLearned: number;
  /** % de respostas certas à primeira tentativa (null sem respostas). */
  accuracy: number | null;
  achievementsCount: number;
  /** Dia local do utilizador (AAAA-MM-DD) usado nos cálculos. */
  today: string;
  /** Semana local (segunda a domingo): dia ativo ou protegido. */
  week: boolean[];
  /** Posição de hoje na semana (segunda = 0). */
  todayIndex: number;
}

const FALLBACK_TZ = "Europe/Lisbon";
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Leitura do progresso (docs/REGRAS_DE_NEGOCIO.md). Escritas chegam com as lições. */
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, now = new Date()): Promise<ProgressSummary> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true, stats: true },
    });
    // Utilizadores antigos podem ainda não ter linha de estatísticas.
    const stats =
      user.stats ??
      (await this.prisma.userStats.upsert({ where: { userId }, create: { userId }, update: {} }));
    const timeZone = isValidTimeZone(user.timezone) ? user.timezone : FALLBACK_TZ;
    const today = localDate(now, timeZone);
    const todayIndex = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
    const monday = addDays(today, -todayIndex);
    const days = await this.prisma.activityDay.findMany({
      where: {
        userId,
        localDate: { gte: new Date(`${monday}T00:00:00Z`), lte: new Date(`${today}T00:00:00Z`) },
      },
      select: { localDate: true },
    });
    const week = Array.from({ length: 7 }, () => false);
    for (const d of days) {
      const i = daysBetween(monday, isoDate(d.localDate));
      if (i >= 0 && i < 7) week[i] = true;
    }
    const lastActiveDate = stats.lastActiveDate ? isoDate(stats.lastActiveDate) : null;
    const [wordsLearned, firstTries, firstTriesRight, achievementsCount] = await Promise.all([
      this.prisma.exercise.count({
        where: {
          vocabularyId: { not: null },
          answers: { some: { correct: true, attempt: { userId } } },
        },
      }),
      this.prisma.lessonAttemptAnswer.count({ where: { round: 1, attempt: { userId } } }),
      this.prisma.lessonAttemptAnswer.count({
        where: { round: 1, correct: true, attempt: { userId } },
      }),
      this.prisma.userAchievement.count({ where: { userId } }),
    ]);

    return {
      xpTotal: stats.xpTotal,
      level: levelForXp(stats.xpTotal),
      coins: stats.coins,
      streak: {
        current: effectiveStreak(
          {
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            lastActiveDate,
            streakFreezes: stats.streakFreezes,
          },
          today,
        ),
        longest: stats.longestStreak,
        freezes: stats.streakFreezes,
        activeToday: lastActiveDate === today,
      },
      correctAnswers: stats.correctAnswers,
      lessonsCompleted: stats.lessonsCompleted,
      wordsLearned,
      accuracy: firstTries ? Math.round((firstTriesRight / firstTries) * 100) : null,
      achievementsCount,
      today,
      week,
      todayIndex,
    };
  }

  /** Catálogo de conquistas com o estado do utilizador (ganhas e progresso das restantes). */
  async achievements(userId: string) {
    const [summary, earned] = await Promise.all([
      this.summary(userId),
      this.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementKey: true, earnedAt: true },
      }),
    ]);
    const earnedAt = new Map(earned.map((e) => [e.achievementKey, e.earnedAt]));
    const values = {
      lessons: summary.lessonsCompleted,
      streak: summary.streak.longest,
      correct: summary.correctAnswers,
      level: summary.level.level,
    };
    return ACHIEVEMENTS.map((a) => ({
      key: a.key,
      icon: a.icon,
      target: a.target,
      unlocked: earnedAt.has(a.key),
      earnedAt: earnedAt.get(a.key) ?? null,
      progress: earnedAt.has(a.key) ? 100 : achievementProgress(a, values),
    }));
  }
}
