/**
 * Recompensas de uma atividade válida (lição, desafio diário…), numa transação já aberta:
 * tranca a linha de estatísticas, escreve o livro-razão de XP e moedas, atualiza a streak
 * no dia local do utilizador e atribui conquistas. Partilhado por todas as atividades para
 * que as regras (docs/REGRAS_DE_NEGOCIO.md) existam num só sítio.
 */
import type { Prisma, UserStats } from "../generated/prisma/client.js";
import type { CoinReason, XpReason } from "../generated/prisma/enums.js";
import type { PrismaService } from "../database/prisma.service.js";
import { levelForXp } from "./rules/levels.js";
import { isValidTimeZone, localDate } from "./rules/local-date.js";
import {
  DEFAULT_REWARD_RULES,
  milestoneAchievements,
  type RewardRule,
  type RewardTable,
  toRewardTable,
} from "./rules/rewards.js";
import { applyActivity } from "./rules/streak.js";

type Tx = Prisma.TransactionClient;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export interface GrantResult {
  xp: number;
  coins: number;
  streak: { current: number; longest: number; extendedToday: boolean; frozenDays: string[] };
  level: { before: number; after: number; leveledUp: boolean };
  achievements: string[];
  totals: { xpTotal: number; coins: number };
}

/** Tabela de recompensas ativa (a da BD, com os valores por omissão para chaves em falta). */
export async function loadRewardTable(prisma: PrismaService): Promise<RewardTable> {
  const rules = await prisma.rewardRule.findMany({ where: { active: true } });
  return toRewardTable([
    ...DEFAULT_REWARD_RULES.filter((d) => !rules.some((r) => r.key === d.key)),
    ...rules.map((r): RewardRule => ({ ...r, description: r.description })),
  ]);
}

/** Tranca e devolve as estatísticas: duas atividades ao mesmo tempo não se atropelam. */
export async function lockStats(tx: Tx, userId: string): Promise<UserStats> {
  await tx.userStats.upsert({ where: { userId }, create: { userId }, update: {} });
  await tx.$queryRaw`SELECT 1 FROM "user_stats" WHERE "userId" = ${userId}::uuid FOR UPDATE`;
  return tx.userStats.findUniqueOrThrow({ where: { userId } });
}

/** Resultado "sem recompensa" (ex.: tentativa marcada por tempo implausível). */
export function noGrant(stats: UserStats): GrantResult {
  const level = levelForXp(stats.xpTotal).level;
  return {
    xp: 0,
    coins: 0,
    streak: {
      current: stats.currentStreak,
      longest: stats.longestStreak,
      extendedToday: false,
      frozenDays: [],
    },
    level: { before: level, after: level, leveledUp: false },
    achievements: [],
    totals: { xpTotal: stats.xpTotal, coins: stats.coins },
  };
}

export async function grantActivity(
  tx: Tx,
  input: {
    userId: string;
    now: Date;
    /** Origem dos movimentos (ex.: "lesson_attempt") + id: chave de idempotência. */
    sourceType: string;
    sourceId: string;
    xp: { reason: XpReason; amount: number }[];
    coins: { reason: CoinReason; amount: number }[];
    correctAnswersDelta: number;
    lessonsCompletedDelta: number;
    table: RewardTable;
  },
): Promise<GrantResult> {
  const { userId, now, sourceType, sourceId, table } = input;
  const userRow = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = isValidTimeZone(userRow.timezone) ? userRow.timezone : "Europe/Lisbon";
  const today = localDate(now, tz);
  const stats = await lockStats(tx, userId);
  const levelBefore = levelForXp(stats.xpTotal).level;

  const xpLines = input.xp.filter((l) => l.amount > 0);
  const xp = xpLines.reduce((n, l) => n + l.amount, 0);
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
  const correctAnswers = stats.correctAnswers + input.correctAnswersDelta;
  const lessonsCompleted = stats.lessonsCompleted + input.lessonsCompletedDelta;
  const levelAfter = levelForXp(xpTotal).level;

  const earned = new Set(
    (
      await tx.userAchievement.findMany({ where: { userId }, select: { achievementKey: true } })
    ).map((a) => a.achievementKey),
  );
  const newAchievements = milestoneAchievements({
    currentStreak: streak.state.currentStreak,
    correctAnswers,
    lessonsCompleted,
    level: levelAfter,
  }).filter((k) => !earned.has(k));

  // Moedas: da atividade e das conquistas novas, com o saldo depois de cada movimento.
  let coins = stats.coins;
  const coinRows: Prisma.CoinTransactionCreateManyInput[] = [];
  for (const c of input.coins.filter((l) => l.amount > 0)) {
    coins += c.amount;
    coinRows.push({
      userId,
      amount: c.amount,
      balanceAfter: coins,
      reason: c.reason,
      sourceType,
      sourceId,
      localDate: asDate(today),
    });
  }
  for (const key of newAchievements) {
    const reward = table.get(key)?.coins ?? 0;
    if (reward <= 0) continue;
    coins += reward;
    coinRows.push({
      userId,
      amount: reward,
      balanceAfter: coins,
      reason: "ACHIEVEMENT",
      sourceType: "achievement",
      sourceId: key,
      localDate: asDate(today),
    });
  }

  if (xpLines.length) {
    await tx.xpEvent.createMany({
      data: xpLines.map((l) => ({
        userId,
        amount: l.amount,
        reason: l.reason,
        sourceType,
        sourceId,
        localDate: asDate(today),
      })),
    });
  }
  if (coinRows.length) await tx.coinTransaction.createMany({ data: coinRows });
  if (newAchievements.length) {
    await tx.userAchievement.createMany({
      data: newAchievements.map((achievementKey) => ({ userId, achievementKey })),
      skipDuplicates: true,
    });
  }
  await tx.activityDay.createMany({
    data: [
      ...streak.frozenDays.map((d) => ({ userId, localDate: asDate(d), kind: "FROZEN" as const })),
      { userId, localDate: asDate(today), kind: "ACTIVE" as const },
    ],
    skipDuplicates: true,
  });
  await tx.userStats.update({
    where: { userId },
    data: {
      xpTotal,
      coins,
      correctAnswers,
      lessonsCompleted,
      currentStreak: streak.state.currentStreak,
      longestStreak: streak.state.longestStreak,
      lastActiveDate: streak.state.lastActiveDate ? asDate(streak.state.lastActiveDate) : null,
      streakFreezes: streak.state.streakFreezes,
    },
  });

  return {
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
}
