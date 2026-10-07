/**
 * Valores das recompensas (docs/REGRAS_DE_NEGOCIO.md §3, §7, §8). Provisórios até D-09.
 * São a semente da tabela `reward_rules`; em execução o servidor lê a tabela.
 */
import { ACHIEVEMENTS } from "./achievements.js";

export interface RewardRule {
  key: string;
  xp: number;
  coins: number;
  /** Máximo de vezes por dia local (null = sem limite diário). */
  dailyLimit: number | null;
  description: string;
}

export const DEFAULT_REWARD_RULES: readonly RewardRule[] = [
  {
    key: "ANSWER_CORRECT",
    xp: 10,
    coins: 0,
    dailyLimit: null,
    description: "Resposta certa à primeira tentativa numa lição",
  },
  {
    key: "LESSON_COMPLETE",
    xp: 30,
    coins: 5,
    dailyLimit: null,
    description: "Lição concluída (moedas só na primeira conclusão)",
  },
  { key: "LESSON_PERFECT", xp: 20, coins: 0, dailyLimit: null, description: "Lição sem erros" },
  {
    key: "LESSON_REPEAT_FACTOR",
    xp: 50,
    coins: 0,
    dailyLimit: null,
    description: "Percentagem do XP ao repetir uma lição concluída",
  },
  { key: "DAILY_CHALLENGE", xp: 50, coins: 10, dailyLimit: 1, description: "Desafio diário" },
  {
    key: "REWARDED_AD",
    xp: 0,
    coins: 20,
    dailyLimit: 3,
    description: "Anúncio recompensado (confirmado pelo AdMob)",
  },
  {
    key: "STREAK_FREEZE_PRICE",
    xp: 0,
    coins: 200,
    dailyLimit: null,
    description: "Preço de uma proteção de streak",
  },
  {
    key: "ACH_FIRST_LESSON",
    xp: 0,
    coins: 10,
    dailyLimit: null,
    description: "Conquista: primeira lição",
  },
  {
    key: "ACH_STREAK_7",
    xp: 0,
    coins: 25,
    dailyLimit: null,
    description: "Conquista: 7 dias seguidos",
  },
  {
    key: "ACH_STREAK_30",
    xp: 0,
    coins: 100,
    dailyLimit: null,
    description: "Conquista: 30 dias seguidos",
  },
  {
    key: "ACH_STREAK_100",
    xp: 0,
    coins: 250,
    dailyLimit: null,
    description: "Conquista: 100 dias seguidos",
  },
  {
    key: "ACH_STREAK_365",
    xp: 0,
    coins: 500,
    dailyLimit: null,
    description: "Conquista: 365 dias seguidos",
  },
  {
    key: "ACH_CORRECT_100",
    xp: 0,
    coins: 25,
    dailyLimit: null,
    description: "Conquista: 100 respostas certas",
  },
  {
    key: "ACH_CORRECT_1000",
    xp: 0,
    coins: 150,
    dailyLimit: null,
    description: "Conquista: 1000 respostas certas",
  },
  { key: "ACH_LEVEL_10", xp: 0, coins: 50, dailyLimit: null, description: "Conquista: nível 10" },
  { key: "ACH_LEVEL_25", xp: 0, coins: 150, dailyLimit: null, description: "Conquista: nível 25" },
  { key: "ACH_LEVEL_50", xp: 0, coins: 400, dailyLimit: null, description: "Conquista: nível 50" },
];

export type RewardTable = ReadonlyMap<string, RewardRule>;

export const toRewardTable = (rules: readonly RewardRule[]): RewardTable =>
  new Map(rules.map((r) => [r.key, r]));

function rule(table: RewardTable, key: string): RewardRule {
  const r = table.get(key);
  if (!r) throw new Error(`Regra de recompensa em falta: ${key}`);
  return r;
}

export interface RewardLine {
  reason: "ANSWER_CORRECT" | "LESSON_COMPLETE" | "LESSON_PERFECT";
  xp: number;
  coins: number;
}

/**
 * Recompensas de uma lição concluída (§3, §7). `firstCompletion` = primeira vez que o
 * utilizador conclui esta lição; repetições dão uma percentagem do XP e nada mais.
 */
export function lessonRewards(
  input: { total: number; correctFirstTry: number; firstCompletion: boolean },
  table: RewardTable,
): RewardLine[] {
  const { total, correctFirstTry, firstCompletion } = input;
  if (total < 1 || correctFirstTry < 0 || correctFirstTry > total) {
    throw new RangeError("contagens de lição inválidas");
  }
  const factor = firstCompletion ? 1 : rule(table, "LESSON_REPEAT_FACTOR").xp / 100;
  const answer = rule(table, "ANSWER_CORRECT");
  const complete = rule(table, "LESSON_COMPLETE");
  const lines: RewardLine[] = [];
  if (correctFirstTry > 0) {
    lines.push({
      reason: "ANSWER_CORRECT",
      xp: Math.round(answer.xp * correctFirstTry * factor),
      coins: 0,
    });
  }
  lines.push({
    reason: "LESSON_COMPLETE",
    xp: Math.round(complete.xp * factor),
    coins: firstCompletion ? complete.coins : 0,
  });
  if (firstCompletion && correctFirstTry === total) {
    const perfect = rule(table, "LESSON_PERFECT");
    lines.push({ reason: "LESSON_PERFECT", xp: perfect.xp, coins: perfect.coins });
  }
  return lines;
}

/** Conquistas de marcos (§8) atingidas com os novos totais — pela ordem do catálogo. */
export function milestoneAchievements(stats: {
  currentStreak: number;
  correctAnswers: number;
  lessonsCompleted: number;
  level: number;
}): string[] {
  const values = {
    lessons: stats.lessonsCompleted,
    streak: stats.currentStreak,
    correct: stats.correctAnswers,
    level: stats.level,
  };
  return ACHIEVEMENTS.filter((a) => values[a.metric] >= a.target).map((a) => a.key);
}
