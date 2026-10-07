import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { levelForXp, type LevelInfo } from "./rules/levels.js";
import { isValidTimeZone, localDate } from "./rules/local-date.js";
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
  /** Dia local do utilizador (AAAA-MM-DD) usado nos cálculos. */
  today: string;
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
    const lastActiveDate = stats.lastActiveDate ? isoDate(stats.lastActiveDate) : null;

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
      today,
    };
  }
}
