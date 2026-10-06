// Motor do modo SOBREVIVÊNCIA (Arena Online).
//
// PROTÓTIPO: nesta fase corre localmente com bots para podermos ver a interface.
// No produto final estas mesmas regras correm no servidor (NestJS + Socket.IO),
// que é a única fonte de verdade para vidas, tempo, respostas e classificação.

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface SurvivalConfig {
  maxPlayers: number;
  startingLives: number;
  questionDurationSeconds: number;
  roundResultMs: number;
  maxRounds: number;
  /** A partir desta ronda todos os jogadores vivos ficam com 1 vida (morte súbita). */
  suddenDeathFromRound: number;
  difficultyCurve: { fromRound: number; difficulty: Difficulty }[];
}

export const defaultSurvivalConfig: SurvivalConfig = {
  maxPlayers: 8,
  startingLives: 3,
  questionDurationSeconds: 10,
  roundResultMs: 2800,
  maxRounds: 30,
  suddenDeathFromRound: 20,
  difficultyCurve: [
    { fromRound: 1, difficulty: 'EASY' },
    { fromRound: 4, difficulty: 'MEDIUM' },
    { fromRound: 8, difficulty: 'HARD' },
  ],
};

export interface Reward {
  fromPlace: number;
  toPlace: number;
  xp: number;
  coins: number;
}

// Configuração inicial de recompensas (no produto final vem de uma tabela no backend).
export const survivalRewards: Reward[] = [
  { fromPlace: 1, toPlace: 1, xp: 250, coins: 50 },
  { fromPlace: 2, toPlace: 2, xp: 150, coins: 30 },
  { fromPlace: 3, toPlace: 3, xp: 100, coins: 20 },
  { fromPlace: 4, toPlace: 5, xp: 60, coins: 0 },
  { fromPlace: 6, toPlace: 99, xp: 30, coins: 0 },
];

export function rewardFor(placement: number): Reward {
  return survivalRewards.find((r) => placement >= r.fromPlace && placement <= r.toPlace) ?? survivalRewards[survivalRewards.length - 1];
}

export type PlayerStatus = 'ALIVE' | 'ELIMINATED';

export interface Player {
  id: string;
  name: string;
  color: string;
  isMe: boolean;
  lives: number;
  status: PlayerStatus;
  placement: number | null;
  correct: number;
  wrong: number;
  missed: number;
  streak: number;
  bestStreak: number;
}

export interface Question {
  id: string;
  difficulty: Difficulty;
  prompt: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
}

export interface RoundSummary {
  correctOptionId: string;
  correct: number;
  wrong: number;
  missed: number;
  eliminated: string[];
  /** Todos os vivos falharam: ninguém perde vida para evitar uma partida sem vencedor. */
  everyoneFailed: boolean;
  suddenDeath: boolean;
}

export function difficultyFor(round: number, config: SurvivalConfig): Difficulty {
  let d: Difficulty = 'EASY';
  for (const step of config.difficultyCurve) if (round >= step.fromRound) d = step.difficulty;
  return d;
}

let qSeq = 0;
/** Pergunta placeholder: o conteúdo real virá da BD (apenas ACTIVE + APPROVED, sem repetir na partida). */
export function nextQuestion(round: number, config: SurvivalConfig): Question {
  qSeq += 1;
  const letters = ['A', 'B', 'C', 'D'];
  const id = `aq${qSeq}`;
  return {
    id,
    difficulty: difficultyFor(round, config),
    prompt: `Qual é a tradução correta de «Palavra ${qSeq}»?`,
    options: letters.map((l) => ({ id: `${id}-${l}`, label: `Tradução ${l}` })),
    correctOptionId: `${id}-${letters[Math.floor(Math.random() * 4)]}`,
  };
}

export function createPlayer(id: string, name: string, color: string, isMe: boolean, config: SurvivalConfig): Player {
  return {
    id,
    name,
    color,
    isMe,
    lives: config.startingLives,
    status: 'ALIVE',
    placement: null,
    correct: 0,
    wrong: 0,
    missed: 0,
    streak: 0,
    bestStreak: 0,
  };
}

/**
 * Resolve uma ronda: aplica perdas de vida, eliminações e classificação.
 * `answers` mapeia playerId -> optionId (ausente = não respondeu a tempo).
 */
export function resolveRound(
  players: Player[],
  question: Question,
  answers: Record<string, string | undefined>,
): { players: Player[]; summary: RoundSummary; finished: boolean } {
  const alive = players.filter((p) => p.status === 'ALIVE');
  let correct = 0;
  let wrong = 0;
  let missed = 0;

  const outcome = new Map<string, 'correct' | 'wrong' | 'missed'>();
  for (const p of alive) {
    const a = answers[p.id];
    const r = a === undefined ? 'missed' : a === question.correctOptionId ? 'correct' : 'wrong';
    outcome.set(p.id, r);
    if (r === 'correct') correct++;
    else if (r === 'wrong') wrong++;
    else missed++;
  }

  // Regra de segurança: se TODOS os vivos ficassem a 0 vidas, ninguém perde vida nesta ronda.
  const everyoneFailed = alive.every((p) => outcome.get(p.id) !== 'correct' && p.lives - 1 <= 0);

  const next = players.map((p) => {
    if (p.status !== 'ALIVE') return p;
    const r = outcome.get(p.id)!;
    const ok = r === 'correct';
    const streak = ok ? p.streak + 1 : 0;
    return {
      ...p,
      lives: ok || everyoneFailed ? p.lives : p.lives - 1,
      correct: p.correct + (r === 'correct' ? 1 : 0),
      wrong: p.wrong + (r === 'wrong' ? 1 : 0),
      missed: p.missed + (r === 'missed' ? 1 : 0),
      streak,
      bestStreak: Math.max(p.bestStreak, streak),
    };
  });

  // Eliminados nesta ronda partilham a mesma "faixa" de posições;
  // desempate por respostas corretas acumuladas.
  const newlyOut = next
    .filter((p) => p.status === 'ALIVE' && p.lives <= 0)
    .sort((a, b) => a.correct - b.correct);
  const aliveAfter = next.filter((p) => p.status === 'ALIVE' && p.lives > 0).length;
  let place = aliveAfter + newlyOut.length;
  const placements = new Map<string, number>();
  for (const p of newlyOut) placements.set(p.id, place--);

  let result = next.map((p) =>
    placements.has(p.id) ? { ...p, status: 'ELIMINATED' as const, placement: placements.get(p.id)! } : p,
  );

  const finished = aliveAfter <= 1;
  if (finished) {
    result = result.map((p) => (p.status === 'ALIVE' ? { ...p, placement: 1 } : p));
  }

  return {
    players: result,
    summary: {
      correctOptionId: question.correctOptionId,
      correct,
      wrong,
      missed,
      eliminated: newlyOut.map((p) => p.id),
      everyoneFailed,
      suddenDeath: false,
    },
    finished,
  };
}

/** Termina a partida por limite de rondas: classifica vivos por vidas e depois por acertos. */
export function finishByMaxRounds(players: Player[]): Player[] {
  const alive = players
    .filter((p) => p.status === 'ALIVE')
    .sort((a, b) => b.lives - a.lives || b.correct - a.correct);
  const placements = new Map(alive.map((p, i) => [p.id, i + 1]));
  return players.map((p) => (placements.has(p.id) ? { ...p, placement: placements.get(p.id)! } : p));
}

export function applySuddenDeath(players: Player[]): Player[] {
  return players.map((p) => (p.status === 'ALIVE' ? { ...p, lives: 1 } : p));
}

// ---- Bots da simulação ----

const BOT_NAMES = ['Maria', 'João', 'Carlos', 'Ana', 'Beatriz', 'Rui', 'Inês', 'Tomé', 'Nádia', 'Hélio', 'Sara', 'Edson', 'Lúcia', 'Vando', 'Celma'];
const BOT_COLORS = ['#EF4B3F', '#1C8FB0', '#7A4A2B', '#D99A0B', '#095C43', '#8A5CF6', '#E07A1F', '#2E9C6A'];

export function makeBot(i: number, config: SurvivalConfig): Player {
  return createPlayer(`bot-${i}`, BOT_NAMES[i % BOT_NAMES.length], BOT_COLORS[i % BOT_COLORS.length], false, config);
}

export function botAccuracy(d: Difficulty): number {
  return d === 'EASY' ? 0.82 : d === 'MEDIUM' ? 0.7 : 0.58;
}
