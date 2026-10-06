import type { AvatarColor } from "./index";

/** Quiz types supported by the multiplayer UI. MULTIPLE_CHOICE is the v1 default. */
export type QuizType = "MULTIPLE_CHOICE" | "LISTEN_AND_CHOOSE" | "IMAGE_SELECT" | "TRUE_FALSE";

export interface QuizQuestion {
  id: string;
  type: QuizType;
  prompt: string;
  /** Placeholder for future audio (LISTEN_AND_CHOOSE). No real audio yet. */
  audioUrl?: string | null;
  options: string[];
  correctIndex: number;
}

export interface MatchPlayerSeed {
  id: string;
  name: string;
  color: AvatarColor;
  isMe?: boolean | undefined;
  /** Bot-only: probability of answering correctly (mock engine). */
  skill?: number;
}

export type AnswerOutcome = "correct" | "wrong" | "timeout";

export interface SurvivalPlayer extends MatchPlayerSeed {
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
  /** True when everyone would have died — round voided (no lives lost). */
  voided: boolean;
}

export interface MatchConfig {
  players: number;
  lives: number;
  seconds: number;
}

export interface Reward { xp: number; coins: number }

export interface Standing { id: string; name: string; color: AvatarColor; place: number; isMe?: boolean | undefined; detail?: string }

export interface MatchResult {
  mode: "survival";
  standings: Standing[];
  myPlace: number;
  reward: Reward;
  stats: { questions: number; correct: number; wrong: number; timeouts: number; accuracy: number };
}

export type RoomMode = "survival" | "teams";

export interface LobbyMember {
  id: string;
  name: string;
  color: AvatarColor;
  isHost?: boolean;
  isMe?: boolean | undefined;
  ready: boolean;
}

export interface PrivateRoom {
  code: string;
  mode: RoomMode;
  config: MatchConfig;
  members: LobbyMember[];
}

export type JoinRoomResult =
  | { ok: true; room: PrivateRoom }
  | { ok: false; reason: "invalid" | "full" | "started" };
