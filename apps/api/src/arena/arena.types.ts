/** Contrato em tempo real da Arena (Socket.IO, namespace /arena). Espelhado em @stp/types/arena. */
import type { PublicQuestion } from "../lessons/lesson-rules.js";
import type { AnswerOutcome, ArenaConfig, RoundSummary } from "./survival-rules.js";

export type RoomStatus = "WAITING" | "IN_PROGRESS";

export interface RoomMemberView {
  userId: string;
  username: string;
  name: string;
  avatarColor: string | null;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface RoomView {
  code: string;
  hostId: string;
  status: RoomStatus;
  mode: "survival";
  config: ArenaConfig;
  languageId: string;
  locale: string;
  members: RoomMemberView[];
}

export interface PlayerView {
  userId: string;
  lives: number;
  correct: number;
  wrong: number;
  timeouts: number;
  placement: number | null;
  eliminated: boolean;
  left: boolean;
}

export type MatchPhase = "countdown" | "question" | "reveal" | "final" | "finished";

/** Pergunta da ronda: sem a resposta certa. */
export interface RoundQuestion extends PublicQuestion {
  questionId: string;
}

export interface MatchView {
  matchId: string;
  phase: MatchPhase;
  round: number;
  /** Hora oficial (epoch ms) em que a ronda fecha; o cliente só mostra a contagem. */
  deadlineAt: number | null;
  question: RoundQuestion | null;
  players: PlayerView[];
  answeredCount: number;
}

export interface MatchStanding {
  userId: string;
  username: string;
  name: string;
  avatarColor: string | null;
  place: number;
  correct: number;
  wrong: number;
  timeouts: number;
  left: boolean;
}

/** Eventos servidor → cliente. */
export interface ArenaServerEvents {
  "room:state": (room: RoomView) => void;
  "room:closed": (p: { code: string; reason: "host_left" | "empty" }) => void;
  "match:countdown": (p: { matchId: string; startsAt: number; serverNow: number }) => void;
  "match:question": (p: {
    matchId: string;
    round: number;
    question: RoundQuestion;
    deadlineAt: number;
    serverNow: number;
  }) => void;
  "match:answered": (p: { round: number; count: number }) => void;
  "match:reveal": (p: {
    matchId: string;
    round: number;
    questionId: string;
    correctOptionId: string;
    outcomes: Record<string, AnswerOutcome>;
    players: PlayerView[];
    summary: RoundSummary;
  }) => void;
  "match:final": (p: { matchId: string; userIds: string[] }) => void;
  "match:finished": (p: {
    matchId: string;
    standings: MatchStanding[];
    rewarded: boolean;
    rounds: number;
  }) => void;
  "match:reward": (p: {
    matchId: string;
    xp: number;
    coins: number;
    /** Porque não houve recompensa (sala pequena, limite diário, saiu a meio). */
    reason: "ok" | "private_small" | "daily_limit" | "left";
  }) => void;
}

export type AckOk<T> = { ok: true } & T;
export type AckErr = { ok: false; code: string; message: string };
export type Ack<T = object> = AckOk<T> | AckErr;

export interface AnswerAck {
  accepted: boolean;
  reason?: "late" | "duplicate" | "eliminated" | "not_in_match" | "invalid_option";
}
