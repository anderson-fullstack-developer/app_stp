/**
 * Regras puras do desafio do dia (docs/REGRAS_DE_NEGOCIO.md §9).
 */
export const DAILY_QUESTIONS = 5;
/** Abaixo disto (ms por pergunta, em média) a tentativa é implausível: não paga nem conta. */
export const DAILY_MIN_MS_PER_QUESTION = 2000;

/** Dia UTC (AAAA-MM-DD): o desafio é o mesmo para toda a gente nesse dia. */
export const utcDay = (now: Date) => now.toISOString().slice(0, 10);

/** Hash simples e estável (FNV-1a) de uma string. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Escolhe `n` ids de forma determinística a partir da chave (língua + dia): o mesmo dia dá
 * sempre o mesmo desafio, dias diferentes dão desafios diferentes. Ordem de entrada irrelevante.
 */
export function pickDaily(ids: readonly string[], key: string, n = DAILY_QUESTIONS): string[] {
  return [...new Set(ids)]
    .map((id) => ({ id, score: hash(`${key}:${id}`) }))
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))
    .slice(0, n)
    .map((x) => x.id);
}

export interface RankedAttempt {
  correct: number;
  durationMs: number;
  completedAt: Date;
}

/** Ranking: mais certas primeiro; empate → menos tempo; depois quem acabou primeiro. */
export const compareRank = (a: RankedAttempt, b: RankedAttempt) =>
  b.correct - a.correct ||
  a.durationMs - b.durationMs ||
  a.completedAt.getTime() - b.completedAt.getTime();

export const isImplausible = (durationMs: number, total: number) =>
  durationMs < total * DAILY_MIN_MS_PER_QUESTION;
