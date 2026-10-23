/** Dados reais (só leitura) das páginas do painel — espelha apps/api/src/admin/admin-insights.service.ts. */
import { http } from "@/services/http";

export interface DayPoint {
  date: string;
  value: number;
}

export interface InsightLanguage {
  id: string;
  name: string;
  altName: string | null;
  isoCode: string | null;
  region: string | null;
  orthography: string | null;
  status: "COMING_SOON" | "BETA" | "ACTIVE" | "INACTIVE";
  country: string;
  words: number;
  wordsApproved: number;
  wordsWithAudio: number;
  phrases: number;
  courses: number;
  lessons: number;
  exercises: number;
  learners: number;
  dailyChallenges: number;
  matches: number;
}

export interface InsightMatchPlayer {
  username: string;
  name: string;
  place: number | null;
  correct: number;
  wrong: number;
  timeouts: number;
  left: boolean;
  xp: number;
  coins: number;
}

export interface InsightMatch {
  id: string;
  mode: string;
  status: "IN_PROGRESS" | "FINISHED" | "CANCELLED";
  languageId: string;
  roomCode: string | null;
  rounds: number;
  rewarded: boolean;
  startedAt: string;
  finishedAt: string | null;
  winner: string | null;
  players: InsightMatchPlayer[];
}

export interface InsightMatches {
  kpis: {
    total: number;
    today: number;
    live: number;
    finished: number;
    avgSeconds: number;
    completionRate: number | null;
    abandonRate: number | null;
  };
  byMode: { mode: string; count: number }[];
  perDay: DayPoint[];
  matches: InsightMatch[];
}

export interface InsightDaily {
  id: string;
  date: string;
  languageId: string;
  languageName: string;
  questions: number;
  started: number;
  completed: number;
  avgAccuracy: number | null;
  perfect: number;
  top: { username: string; correct: number; total: number; seconds: number | null }[];
}

export interface InsightRankRow {
  userId: string;
  username: string;
  name: string;
  countryCode: string | null;
  weekXp: number;
  xpTotal: number;
  level: number;
  streak: number;
  matches: number;
}

export interface InsightRankings {
  weekStart: string;
  week: InsightRankRow[];
  allTime: InsightRankRow[];
}

export interface InsightAchievements {
  users: number;
  achievements: {
    key: string;
    icon: string;
    metric: "lessons" | "streak" | "correct" | "level";
    target: number;
    rewardXp: number;
    rewardCoins: number;
    active: boolean;
    earned: number;
    lastEarnedAt: string | null;
  }[];
}

export interface InsightAnalytics {
  kpis: {
    users: number;
    dau: number;
    wau: number;
    mau: number;
    avgStreak: number;
    lessonsCompleted: number;
    lessonsPerLearner: number;
  };
  dau: DayPoint[];
  signups: DayPoint[];
  lessons: DayPoint[];
  xp: DayPoint[];
  byMode: { mode: string; count: number }[];
  retention: { day: number; cohort: number; rate: number | null }[];
  hardest: {
    exerciseId: string;
    word: string;
    gloss: string | null;
    answers: number;
    errorRate: number;
  }[];
  popular: { lessonId: string; title: string; completions: number }[];
}

export interface InsightAudit {
  id: string;
  at: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  actor: { name: string; username: string; roles: string[] } | null;
}

export interface InsightRewardRule {
  key: string;
  xp: number;
  coins: number;
  dailyLimit: number | null;
  active: boolean;
  description: string;
  updatedAt: string;
}

export interface InsightSearch {
  users: { id: string; username: string; name: string }[];
  words: { id: string; word: string; status: string; languageId: string; gloss: string | null }[];
  lessons: { id: string; title: string; unitTitle: string }[];
  matches: { id: string; mode: string; roomCode: string | null; startedAt: string }[];
}

export const insightsApi = {
  languages: () => http.get<InsightLanguage[]>("admin", "insights", "languages"),
  matches: () => http.get<InsightMatches>("admin", "insights", "matches"),
  daily: () => http.get<InsightDaily[]>("admin", "insights", "daily"),
  rankings: () => http.get<InsightRankings>("admin", "insights", "rankings"),
  achievements: () => http.get<InsightAchievements>("admin", "insights", "achievements"),
  analytics: () => http.get<InsightAnalytics>("admin", "insights", "analytics"),
  audit: () => http.get<InsightAudit[]>("admin", "insights", "audit"),
  rewards: () => http.get<InsightRewardRule[]>("admin", "insights", "rewards"),
  search: (q: string) => http.getQ<InsightSearch>("admin", ["insights", "search"], { q }),
};

export const MODE_LABEL: Record<string, string> = {
  survival: "Sobrevivência",
  duel: "1 contra 1",
  teams: "2 contra 2",
};
