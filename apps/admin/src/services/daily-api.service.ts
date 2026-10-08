/** Desafio do dia contra a API (tipos espelham apps/api/src/daily). */
import { http } from "./http";
import type { AnswerResult, ServerQuestion } from "./lessons-api.service";

export interface DailyOverview {
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

export interface DailyRanking {
  date: string;
  top: {
    position: number;
    userId: string;
    username: string;
    name: string;
    avatarColor: string | null;
    correct: number;
    total: number;
    durationMs: number;
    isMe: boolean;
  }[];
  me: DailyRanking["top"][number] | null;
}

export interface DailyStarted {
  attemptId: string;
  locale: string;
  beta: boolean;
  questions: ServerQuestion[];
  answered: string[];
}

export interface DailyResult {
  flagged: boolean;
  total: number;
  correct: number;
  durationMs: number;
  rewarded: boolean;
  rank: number | null;
  xp: number;
  coins: number;
  streak: { current: number; longest: number; extendedToday: boolean; frozenDays: string[] };
  level: { before: number; after: number; leveledUp: boolean };
  achievements: string[];
}

export const dailyApi = {
  overview: (languageId: string) => http.get<DailyOverview>("daily", languageId),
  ranking: (languageId: string) => http.get<DailyRanking>("daily", languageId, "ranking"),
  start: (languageId: string, locale: string) =>
    http.post<DailyStarted>("daily", [languageId, "attempts"], { locale }),
  answer: (attemptId: string, exerciseId: string, optionId: string) =>
    http.post<AnswerResult>("dailyAttempts", [attemptId, "answers"], { exerciseId, optionId }),
  complete: (attemptId: string) => http.post<DailyResult>("dailyAttempts", [attemptId, "complete"]),
};
