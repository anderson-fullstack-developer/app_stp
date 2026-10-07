/**
 * Curva de níveis (docs/REGRAS_DE_NEGOCIO.md §4). Funções puras.
 * Níveis 1–5 da especificação; depois a diferença cresce 20 % por nível (múltiplos de 50).
 */
export const LEVEL_CURVE = {
  /** XP total para atingir os níveis 1..5. */
  base: [0, 100, 250, 500, 900],
  /** Diferença do nível 5 → 6. */
  firstGrowthStep: 500,
  growth: 1.2,
  roundTo: 50,
} as const;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** XP total necessário para atingir `level` (nível 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new RangeError(`nível inválido: ${level}`);
  const { base, firstGrowthStep, growth } = LEVEL_CURVE;
  if (level <= base.length) return base[level - 1] ?? 0;
  let total = base[base.length - 1] ?? 0;
  let step: number = firstGrowthStep;
  for (let l = base.length + 1; l <= level; l++) {
    total += step;
    step = roundTo(step * growth, LEVEL_CURVE.roundTo);
  }
  return total;
}

export interface LevelInfo {
  level: number;
  /** XP total no início do nível atual. */
  levelStartXp: number;
  /** XP total para o próximo nível. */
  nextLevelXp: number;
  /** 0–1 dentro do nível atual. */
  progress: number;
}

export function levelForXp(xpTotal: number): LevelInfo {
  const xp = Math.max(0, Math.floor(xpTotal));
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return {
    level,
    levelStartXp,
    nextLevelXp,
    progress: (xp - levelStartXp) / (nextLevelXp - levelStartXp),
  };
}
