/**
 * Formatos das respostas da API (apps/api) usados pelos clientes (app mobile e web).
 * O servidor é a fonte da verdade: estes tipos só descrevem o que ele devolve.
 */

export type AccountRole =
  "USER" | "MODERATOR" | "CONTENT_EDITOR" | "LINGUIST" | "ADMIN" | "SUPER_ADMIN";

/** GET /api/v1/me */
export interface MeResponse {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarColor: string | null;
  countryCode: string | null;
  spokenLanguages: string[];
  uiLocale: string;
  timezone: string;
  learningLanguageId: string | null;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
  roles: { role: AccountRole; languageId: string | null }[];
  createdAt: string;
  progress: {
    xpTotal: number;
    level: { level: number; levelStartXp: number; nextLevelXp: number; progress: number };
    coins: number;
    streak: { current: number; longest: number; freezes: number; activeToday: boolean };
    correctAnswers: number;
    lessonsCompleted: number;
    wordsLearned: number;
    accuracy: number | null;
    achievementsCount: number;
    today: string;
    week: boolean[];
    todayIndex: number;
  };
}

/** GET /api/v1/languages */
export interface CountryWithLanguages {
  id: string;
  name: string;
  languages: {
    id: string;
    name: string;
    status: "COMING_SOON" | "BETA" | "ACTIVE" | "INACTIVE";
    beta: boolean;
    available: boolean;
  }[];
}

/** GET /api/v1/languages/:id/course */
export interface CourseResponse {
  language: { id: string; name: string; beta: boolean };
  locale: string;
  course: { id: string; slug: string | null; title: string; reviewed: boolean };
  units: {
    id: string;
    slug: string | null;
    icon: string | null;
    title: string;
    order: number;
    reviewed: boolean;
    lessons: {
      id: string;
      slug: string | null;
      title: string;
      order: number;
      estimatedMinutes: number;
      questions: number;
      playable: boolean;
      reviewed: boolean;
    }[];
  }[];
}

export type LessonState = "completed" | "current" | "locked";

/** GET /api/v1/me/lessons */
export interface LessonProgressResponse {
  languageId: string;
  lessons: {
    lessonId: string;
    state: LessonState;
    completions: number;
    bestAccuracy: number | null;
  }[];
}

export interface QuestionDto {
  exerciseId: string;
  mode: "meaning" | "word";
  prompt: string;
  partOfSpeech: string;
  options: { id: string; label: string }[];
}

/** POST /api/v1/lessons/:id/attempts */
export interface StartedLesson {
  attemptId: string;
  lessonId: string;
  locale: string;
  beta: boolean;
  expiresAt: string;
  total: number;
  questions: QuestionDto[];
}

/** POST …/answers (lições e desafio do dia) */
export interface AnswerResponse {
  correct: boolean;
  round: number;
  correctOptionId: string;
  correctLabel: string;
  word: string | null;
  audio: { url: string; speaker: string | null } | null;
  sourceUrl: string | null;
}

export interface GrantDto {
  xp: number;
  coins: number;
  streak: { current: number; longest: number; extendedToday: boolean; frozenDays: string[] };
  level: { before: number; after: number; leveledUp: boolean };
  achievements: string[];
  totals: { xpTotal: number; coins: number };
}

/** POST /api/v1/lesson-attempts/:id/complete */
export interface LessonResultDto extends GrantDto {
  flagged: boolean;
  total: number;
  correctFirstTry: number;
  accuracy: number;
  durationSeconds: number;
  firstCompletion: boolean;
}

/** GET /api/v1/daily/:languageId */
export interface DailyOverviewDto {
  languageId: string;
  date: string;
  questions: number;
  xpReward: number;
  coinReward: number;
  participants: number;
  me: {
    status: "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "ABANDONED";
    correct: number;
    total: number;
    durationMs: number | null;
    flagged: boolean;
    rank: number | null;
  } | null;
}

/** GET /api/v1/me/achievements */
export interface AchievementDto {
  key: string;
  icon: string;
  target: number;
  unlocked: boolean;
  earnedAt: string | null;
  progress: number;
}
