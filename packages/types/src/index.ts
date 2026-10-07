export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  country: string;
  /** Línguas que o utilizador fala (ex.: ["pt", "kea"]). */
  spokenLanguages?: string[];
  avatarColor: AvatarColor;
  level: number;
  levelProgress: number;
  xp: number;
  weeklyXp: number;
  coins: number;
  streak: number;
  longestStreak: number;
  lessonsCompleted: number;
  wordsLearned: number;
  accuracy: number;
  wins: number;
  achievementsCount: number;
  isPremium: boolean;
}

export type AvatarColor = "forest" | "sun" | "ocean" | "cocoa" | "coral";

/** País/comunidade a que pertencem as línguas (a plataforma cobre vários países). */
export interface Country {
  id: string;
  name: string;
  /** Ordem de apresentação. */
  order: number;
}

export interface Language {
  id: string;
  name: string;
  /** País a que a língua pertence (Country.id). */
  countryId: string;
  region: string;
  available: boolean;
  /** Disponível em Beta: conteúdo ainda em revisão por falantes nativos (ADR-14). */
  beta?: boolean;
}

export interface Course {
  id: string;
  languageId: string;
  units: Unit[];
}

export interface Unit {
  id: string;
  index: number;
  title: string;
  description: string;
  theme: AvatarColor;
  lessons: Lesson[];
}

export type LessonStatus = "completed" | "current" | "locked";

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  status: LessonStatus;
  isTest?: boolean;
  exercises: Exercise[];
}

export type ExerciseType =
  | "multiple_choice"
  | "listen_choose"
  | "listen_type"
  | "translate"
  | "match_words"
  | "order_words"
  | "image_selection"
  | "pronunciation";

export interface ExerciseOption {
  id: string;
  label: string;
  isCorrect: boolean;
  imageHint?: string;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  /** Content in the target language — placeholder until real content is supplied. */
  targetText?: string;
  audioUrl?: string;
  options?: ExerciseOption[];
  pairs?: { left: string; right: string }[];
  words?: string[];
  answer?: string;
}

export interface UserProgress {
  userId: string;
  courseId: string;
  completedLessonIds: string[];
  currentLessonId: string;
}

export interface Friend extends Pick<User, "id" | "name" | "username" | "avatarColor" | "level" | "streak" | "weeklyXp" | "country"> {
  status: "friend" | "request" | "suggestion";
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarColor: AvatarColor;
  xp: number;
  isCurrentUser?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
}

export interface GamePlayer {
  id: string;
  name: string;
  avatarColor: AvatarColor;
  isHost?: boolean;
  ready: boolean;
  score: number;
  eliminated?: boolean;
}

export interface GameRoom {
  id: string;
  code: string;
  maxPlayers: number;
  questions: number;
  secondsPerQuestion: number;
  mode: "normal" | "elimination";
  players: GamePlayer[];
}

export interface Game {
  id: string;
  roomId: string;
  currentQuestion: number;
  totalQuestions: number;
  status: "waiting" | "playing" | "finished";
}

export interface AppNotification {
  id: string;
  icon: string;
  title: string;
  time: string;
  read: boolean;
}

export interface Subscription {
  id: "monthly" | "yearly";
  label: string;
  price: string;
  period: string;
  highlight?: string;
}

export interface League {
  tier: "Bronze" | "Silver" | "Gold" | "Diamond";
  endsIn: string;
  promoteTop: number;
  demoteBottom: number;
}

/* ------------------------------------------------------------------
 * Handoff contract names. Canonical shapes live above / in ./multiplayer
 * and @/admin/types; these aliases give the backend team one vocabulary
 * without duplicating interfaces.
 * ------------------------------------------------------------------ */
export type UserProfile = Pick<User, "id" | "name" | "username" | "avatarColor" | "xp" | "streak">;
export type LessonProgress = UserProgress;
export type Notification = AppNotification;
export type PremiumPlan = Subscription;
export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export type {
  QuizQuestion, MatchPlayerSeed, SurvivalPlayer, MatchConfig, MatchResult, PrivateRoom, LobbyMember, RoomMode,
  RoundSummary as GameRound, MatchResult as GameResult,
} from "./multiplayer";
export interface GameAnswer {
  matchId: string;
  questionId: string;
  playerId: string;
  optionIndex: number | null; // null = timeout
  answeredAtMs: number;
}
export interface Team {
  id: string;
  name: string;
  playerIds: string[];
  score: number;
}
