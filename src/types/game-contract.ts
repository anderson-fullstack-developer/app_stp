/**
 * Realtime game contract (future Socket.IO + NestJS game server).
 *
 * SERVER-AUTHORITATIVE: the server alone decides lives, score, results, winner,
 * the correct answer and the official timer. The client only SENDS intents
 * (find match, ready, chosen option) and RENDERS snapshots/events it receives.
 * Fields below marked "server" must never be computed by the client in production.
 */
import type { JoinRoomResult, MatchConfig, MatchPlayerSeed, PrivateRoom, RoomMode } from "./multiplayer";

export type GamePhase = "waiting" | "countdown" | "question" | "reveal" | "round_summary" | "finished";

export interface PlayerState {
  id: string;
  name: string;
  /** server */ lives: number;
  /** server */ score: number;
  /** server */ eliminated: boolean;
  connected: boolean;
}

export interface GameStateSnapshot {
  matchId: string;
  phase: GamePhase;
  round: number;
  questionId: string | null;
  /** server — official deadline (epoch ms); the client only displays a countdown to it. */
  deadlineAt: number | null;
  /** server — revealed only in the "reveal" phase. */
  correctOptionIndex: number | null;
  players: PlayerState[];
  /** server */ winnerIds: string[] | null;
}

/** Ack for an answer: the client never knows if it was correct until the server says so. */
export interface AnswerAck {
  accepted: boolean;
  /** "late" = arrived after the server deadline. */
  reason?: "late" | "duplicate" | "eliminated" | "not_in_match";
}

export interface MatchSearchHandlers {
  onPlayer: (p: MatchPlayerSeed) => void;
  onFull: () => void;
}

export interface RealtimeGameService {
  findMatch(size: number, on: MatchSearchHandlers): () => void;
  cancelMatch(): Promise<boolean>;
  createRoom(mode: RoomMode, config: MatchConfig): Promise<PrivateRoom>;
  joinRoom(code: string): Promise<JoinRoomResult>;
  leaveRoom(code: string): Promise<boolean>;
  setReady(code: string, ready: boolean): Promise<boolean>;
  submitAnswer(matchId: string, questionId: string, optionIndex: number | null): Promise<AnswerAck>;
  reconnect(matchId?: string): Promise<GameStateSnapshot | null>;
  getGameState(matchId: string): Promise<GameStateSnapshot | null>;
}
