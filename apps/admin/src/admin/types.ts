export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "LINGUIST" | "CONTENT_EDITOR" | "MODERATOR";

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  expiresAt: number;
}

export type ContentStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
export type Difficulty = "Fácil" | "Média" | "Difícil";

export type LanguageStatus = "ATIVO" | "EM PREPARAÇÃO" | "INATIVO";
export interface AdminLanguage {
  id: string;
  name: string;
  altName: string;
  code: string;
  description: string;
  image: string;
  status: LanguageStatus;
}

export interface AdminLesson {
  id: string;
  unitId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  order: number;
  xp: number;
  minutes: number;
  status: ContentStatus;
}
export interface AdminUnit {
  id: string;
  courseId: string;
  title: string;
  order: number;
}
export interface AdminCourse {
  id: string;
  languageId: string;
  title: string;
  order: number;
}

export interface ReviewEntry {
  by: string;
  role: AdminRole;
  at: string;
  action: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "SUBMITTED";
  comment?: string | undefined;
}

interface ContentBase {
  id: string;
  languageId: string;
  status: ContentStatus;
  author: string;
  reviewer: string | null;
  updatedAt: string;
  category: string;
  difficulty: Difficulty;
  variant: string;
  notes: string;
  source: string;
  audioId: string | null;
  history: ReviewEntry[];
  aiGenerated?: boolean | undefined;
}
export interface VocabItem extends ContentBase {
  kind: "word";
  word: string;
  translation: string;
  speaker: string;
}
export interface PhraseItem extends ContentBase {
  kind: "phrase";
  original: string;
  translation: string;
  context: string;
  explanation: string;
  level: string;
}

export type ExerciseType =
  | "MULTIPLE_CHOICE"
  | "LISTEN_AND_CHOOSE"
  | "LISTEN_AND_TYPE"
  | "TRANSLATE"
  | "MATCH_WORDS"
  | "ORDER_WORDS"
  | "IMAGE_SELECT"
  | "PRONUNCIATION"
  | "TRUE_FALSE";
export type ExerciseUsage = "learning" | "daily" | "arena" | "duel" | "teams" | "survival";
export interface ExerciseItem extends ContentBase {
  kind: "exercise";
  type: ExerciseType;
  question: string;
  options: string[];
  correctIndex: number;
  lessonId: string | null;
  usage: ExerciseUsage[];
}
export type ContentItem = VocabItem | PhraseItem | ExerciseItem;

export interface AudioFile {
  id: string;
  file: string;
  linkedTo: string;
  speaker: string;
  variant: string;
  seconds: number;
  status: ContentStatus;
  date: string;
}

export type UserStatus = "ATIVO" | "SUSPENSO" | "BLOQUEADO";
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  premium: boolean;
  status: UserStatus;
  createdAt: string;
  lastActive: string;
  friends: number;
  matches: number;
  achievements: number;
  reports: number;
  progress: number;
}

export type MatchMode = "Sobrevivência" | "1v1" | "2v2" | "Sala Privada";
export interface MatchPlayerRow {
  username: string;
  place: number;
  lives: number;
  correct: number;
  wrong: number;
  avgMs: number;
  xp: number;
  coins: number;
}
export interface AdminMatch {
  id: string;
  mode: MatchMode;
  state: "TERMINADA" | "A DECORRER" | "ABANDONADA";
  date: string;
  winner: string;
  players: MatchPlayerRow[];
}

export type ReportType =
  | "Utilizador"
  | "Username"
  | "Abuso"
  | "Pergunta incorreta"
  | "Tradução incorreta"
  | "Áudio incorreto"
  | "Bug"
  | "Outro";
export type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
export interface AdminReport {
  id: string;
  type: ReportType;
  target: string;
  reporter: string;
  description: string;
  status: ReportStatus;
  date: string;
}

export interface AuditEntry {
  id: string;
  admin: string;
  role: AdminRole;
  action: string;
  object: string;
  at: string;
}

export interface RewardRules {
  lessonXp: number;
  answerXp: number;
  dailyXp: number;
  multiplayerXp: number;
  lessonCoins: number;
  dailyCoins: number;
  placeRewards: { place: number; xp: number; coins: number }[];
  startingLives: number;
  questionSeconds: number;
  maxPlayers: number;
}

export interface DailyChallenge {
  id: string;
  date: string;
  exerciseIds: string[];
  xp: number;
  coins: number;
  status: "AGENDADO" | "ATIVO" | "TERMINADO" | "RASCUNHO";
}

export type AchievementType = "Lições" | "Streak" | "Respostas" | "Vitórias" | "Top 3" | "Nível";
export interface AdminAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: AchievementType;
  condition: number;
  rewardXp: number;
  rewardCoins: number;
  status: "ATIVO" | "INATIVO";
}

export interface PremiumProduct {
  id: string;
  name: string;
  displayPrice: string;
  benefits: string[];
  status: "ATIVO" | "INATIVO";
}

export type AdPlacementId = "after_activities" | "result" | "play_menu" | "rewarded";
export interface AdPlacement {
  id: AdPlacementId;
  label: string;
  enabled: boolean;
  frequency: number;
}
