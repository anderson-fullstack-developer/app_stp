/**
 * Regras puras da Sobrevivência (Arena), portadas de packages/game-engine para o servidor,
 * que é a autoridade (ADR-07/08, passo 4.1). Os valores espelham MULTIPLAYER_CONFIG
 * (@stp/config); survival-rules.spec.ts garante que motor e servidor não divergem.
 */

export const ARENA_CONFIG = {
  playerOptions: [4, 8, 16],
  livesOptions: [1, 2, 3, 5],
  timeOptions: [5, 10, 15, 20],
  defaults: { players: 8, lives: 3, seconds: 10 },
  maxRounds: 40,
  survivalRewards: [
    { place: 1, xp: 250, coins: 50 },
    { place: 2, xp: 150, coins: 30 },
    { place: 3, xp: 100, coins: 20 },
  ],
  participationReward: { xp: 40, coins: 5 },
  /** Sala privada só paga com pelo menos 4 jogadores reais (REGRAS §9). */
  minPlayersForPrivateRewards: 4,
  /** Partidas premiadas por dia local (REGRAS §9). */
  maxRewardedMatchesPerDay: 10,
  /** Mínimo para começar uma partida. */
  minPlayersToStart: 2,
} as const;

export type AnswerOutcome = "correct" | "wrong" | "timeout";

export interface ArenaPlayer {
  id: string;
  lives: number;
  correct: number;
  wrong: number;
  timeouts: number;
  eliminatedRound: number | null;
  placement: number | null;
}

export interface RoundSummary {
  round: number;
  correct: number;
  wrong: number;
  noAnswer: number;
  eliminated: string[];
  alive: number;
  /** Toda a gente morreria: a ronda é anulada (ninguém perde vidas). */
  voided: boolean;
}

export interface ArenaConfig {
  players: number;
  lives: number;
  seconds: number;
}

export const createPlayers = (ids: string[], lives: number): ArenaPlayer[] =>
  ids.map((id) => ({
    id,
    lives,
    correct: 0,
    wrong: 0,
    timeouts: 0,
    eliminatedRound: null,
    placement: null,
  }));

export const alivePlayers = (players: ArenaPlayer[]) => players.filter((p) => p.lives > 0);

/** Certa mantém as vidas; errada ou sem resposta tira 1; 0 vidas = eliminado. */
export function applySurvivalRound(
  players: ArenaPlayer[],
  outcomes: Record<string, AnswerOutcome>,
  round: number,
): { players: ArenaPlayer[]; summary: RoundSummary } {
  const alive = alivePlayers(players);
  const counts = { correct: 0, wrong: 0, noAnswer: 0 };
  for (const p of alive) {
    const o = outcomes[p.id] ?? "timeout";
    if (o === "correct") counts.correct++;
    else if (o === "wrong") counts.wrong++;
    else counts.noAnswer++;
  }
  const wouldDie = alive.filter(
    (p) => (outcomes[p.id] ?? "timeout") !== "correct" && p.lives === 1,
  );
  const voided = wouldDie.length === alive.length && alive.length > 0;

  const eliminated: string[] = [];
  const next = players.map((p) => {
    if (p.lives <= 0) return p;
    const o = outcomes[p.id] ?? "timeout";
    const stat =
      o === "correct"
        ? { correct: p.correct + 1 }
        : o === "wrong"
          ? { wrong: p.wrong + 1 }
          : { timeouts: p.timeouts + 1 };
    const lives = o === "correct" || voided ? p.lives : p.lives - 1;
    if (lives === 0) eliminated.push(p.id);
    return { ...p, ...stat, lives, eliminatedRound: lives === 0 ? round : p.eliminatedRound };
  });

  // Eliminados na mesma ronda ocupam os lugares livres mais baixos, pela ordem da lista.
  const aliveAfter = alive.length - eliminated.length;
  let place = alive.length;
  const placed = next.map((p) => (eliminated.includes(p.id) ? { ...p, placement: place-- } : p));
  const final =
    aliveAfter === 1 ? placed.map((p) => (p.lives > 0 ? { ...p, placement: 1 } : p)) : placed;

  return { players: final, summary: { round, ...counts, eliminated, alive: aliveAfter, voided } };
}

/** Se as rondas acabarem, os sobreviventes ordenam-se por vidas e depois por certas. */
export function rankRemaining(players: ArenaPlayer[]): ArenaPlayer[] {
  const alive = alivePlayers(players).sort((a, b) => b.lives - a.lives || b.correct - a.correct);
  return players.map((p) =>
    p.placement ? p : { ...p, placement: alive.findIndex((a) => a.id === p.id) + 1 },
  );
}

export function survivalReward(place: number): { xp: number; coins: number } {
  const r = ARENA_CONFIG.survivalRewards.find((x) => x.place === place);
  return r ? { xp: r.xp, coins: r.coins } : { ...ARENA_CONFIG.participationReward };
}

/** Configuração pedida → valores permitidos (nunca confiar no cliente). */
export function normalizeConfig(input: Partial<ArenaConfig> | undefined): ArenaConfig {
  const pick = <T extends number>(options: readonly T[], v: number | undefined, d: T): T =>
    options.includes(v as T) ? (v as T) : d;
  return {
    players: pick(ARENA_CONFIG.playerOptions, input?.players, ARENA_CONFIG.defaults.players),
    lives: pick(ARENA_CONFIG.livesOptions, input?.lives, ARENA_CONFIG.defaults.lives),
    seconds: pick(ARENA_CONFIG.timeOptions, input?.seconds, ARENA_CONFIG.defaults.seconds),
  };
}

/** Sala privada com poucos jogadores não paga (evita "farmar" XP entre amigos). */
export const rewardEligible = (privateRoom: boolean, realPlayers: number) =>
  !privateRoom || realPlayers >= ARENA_CONFIG.minPlayersForPrivateRewards;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O, 1/I

export function generateRoomCode(rand: () => number, length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return code;
}
