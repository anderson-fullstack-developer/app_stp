/**
 * Catálogo de conquistas (docs/REGRAS_DE_NEGOCIO.md §8): o que cada uma mede e a meta.
 * As moedas de cada uma estão em reward_rules (mesma chave). Nomes e descrições ficam nas
 * traduções da interface (achievementsList.<chave>).
 */
export type AchievementMetric = "lessons" | "streak" | "correct" | "level";

export interface AchievementDef {
  key: string;
  icon: string;
  metric: AchievementMetric;
  target: number;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { key: "ACH_FIRST_LESSON", icon: "🎓", metric: "lessons", target: 1 },
  { key: "ACH_STREAK_7", icon: "🔥", metric: "streak", target: 7 },
  { key: "ACH_STREAK_30", icon: "🌋", metric: "streak", target: 30 },
  { key: "ACH_STREAK_100", icon: "💯", metric: "streak", target: 100 },
  { key: "ACH_STREAK_365", icon: "🏆", metric: "streak", target: 365 },
  { key: "ACH_CORRECT_100", icon: "🎯", metric: "correct", target: 100 },
  { key: "ACH_CORRECT_1000", icon: "🧠", metric: "correct", target: 1000 },
  { key: "ACH_LEVEL_10", icon: "⭐", metric: "level", target: 10 },
  { key: "ACH_LEVEL_25", icon: "🌟", metric: "level", target: 25 },
  { key: "ACH_LEVEL_50", icon: "👑", metric: "level", target: 50 },
];

export interface MetricValues {
  lessons: number;
  streak: number;
  correct: number;
  level: number;
}

/** Progresso (0–100) de uma conquista com os valores atuais. */
export const achievementProgress = (def: AchievementDef, values: MetricValues) =>
  Math.min(100, Math.floor((values[def.metric] / def.target) * 100));
