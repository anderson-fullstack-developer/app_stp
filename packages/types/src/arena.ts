/**
 * Contrato em tempo real da Arena (Socket.IO, namespace /arena) — espelho de
 * apps/api/src/arena/arena.types.ts. O servidor decide tudo; o cliente só envia intenções.
 *
 * Cliente → servidor (com resposta): room:create, room:join, queue:join, room:leave,
 * room:ready, room:start, room:resync, match:answer.
 * Servidor → cliente: arena:ready, room:state, room:closed, match:countdown, match:question,
 * match:answered, match:reveal, match:final, match:finished, match:reward.
 */

export interface ArenaConfigDto {
  players: number;
  lives: number;
  seconds: number;
}

export interface ArenaMemberDto {
  userId: string;
  username: string;
  name: string;
  avatarColor: string | null;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  /** 2 contra 2: equipa escolhida (null nos outros modos). */
  team: "A" | "B" | null;
}

export interface ArenaRoomDto {
  code: string;
  hostId: string;
  status: "WAITING" | "IN_PROGRESS";
  mode: "survival" | "duel" | "teams";
  config: ArenaConfigDto;
  languageId: string;
  locale: string;
  /** Sala de "Procurar partida" (desconhecidos; começa sozinha). */
  isPublic: boolean;
  /** Sobrevivência pública: hora oficial (epoch ms) a que começa sozinha; null = à espera do mínimo. */
  autoStartAt: number | null;
  /** Relógio do servidor quando este estado foi enviado. */
  serverNow: number;
  members: ArenaMemberDto[];
}

export interface ArenaPlayerDto {
  userId: string;
  lives: number;
  correct: number;
  wrong: number;
  timeouts: number;
  placement: number | null;
  eliminated: boolean;
  left: boolean;
  /** Duelo e 2 contra 2: pontos (certa + rapidez). Sobrevivência: 0. */
  score: number;
  team: "A" | "B" | null;
}

export interface ArenaQuestionDto {
  questionId: string;
  exerciseId: string;
  mode: "meaning" | "word";
  prompt: string;
  partOfSpeech: string;
  options: { id: string; label: string }[];
}

export type ArenaOutcome = "correct" | "wrong" | "timeout";

export interface ArenaRoundSummaryDto {
  round: number;
  correct: number;
  wrong: number;
  noAnswer: number;
  eliminated: string[];
  alive: number;
  voided: boolean;
}

export interface ArenaMatchDto {
  matchId: string;
  phase: "countdown" | "question" | "reveal" | "final" | "finished";
  round: number;
  deadlineAt: number | null;
  question: ArenaQuestionDto | null;
  players: ArenaPlayerDto[];
  answeredCount: number;
}

export interface ArenaCountdownEvent {
  matchId: string;
  startsAt: number;
  serverNow: number;
}

export interface ArenaQuestionEvent {
  matchId: string;
  round: number;
  question: ArenaQuestionDto;
  deadlineAt: number;
  serverNow: number;
}

export interface ArenaRevealEvent {
  matchId: string;
  round: number;
  questionId: string;
  correctOptionId: string;
  /** Pronúncia real da palavra certa (falante nativo), se existir. */
  audio: { url: string; speaker: string | null } | null;
  outcomes: Record<string, ArenaOutcome>;
  players: ArenaPlayerDto[];
  summary: ArenaRoundSummaryDto;
}

export interface ArenaStandingDto {
  userId: string;
  username: string;
  name: string;
  avatarColor: string | null;
  place: number;
  correct: number;
  wrong: number;
  timeouts: number;
  left: boolean;
  score: number;
  team: "A" | "B" | null;
}

export interface ArenaFinishedEvent {
  matchId: string;
  standings: ArenaStandingDto[];
  rewarded: boolean;
  rounds: number;
  /** 2 contra 2: pontos de cada equipa e a vencedora (null = empate). */
  teams?: { A: number; B: number };
  winnerTeam?: "A" | "B" | null;
}

export interface ArenaRewardEvent {
  matchId: string;
  xp: number;
  coins: number;
  reason: "ok" | "private_small" | "daily_limit" | "duel_limit" | "left" | "error";
}

export interface ArenaInviteEvent {
  code: string;
  mode: "survival" | "duel" | "teams";
  from: { userId: string; username: string; name: string; avatarColor: string | null };
  at: number;
  expiresAt: number;
}

export type ArenaAck<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };

export interface ArenaAnswerAck {
  accepted: boolean;
  reason?: "late" | "duplicate" | "eliminated" | "not_in_match" | "invalid_option";
}
