/**
 * Lições contra a API (servidor autoritativo): o servidor gera as perguntas, corrige cada
 * resposta e paga as recompensas. Tipos espelham apps/api/src/lessons e src/courses.
 */
import { http } from "./http";

export interface ServerCourse {
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

export interface ServerLessonProgress {
  languageId: string;
  lessons: {
    lessonId: string;
    state: LessonState;
    completions: number;
    bestAccuracy: number | null;
  }[];
}

export interface ServerQuestion {
  exerciseId: string;
  mode: "meaning" | "word";
  prompt: string;
  partOfSpeech: string;
  options: { id: string; label: string }[];
}

export interface StartedAttempt {
  attemptId: string;
  lessonId: string;
  locale: string;
  beta: boolean;
  expiresAt: string;
  total: number;
  questions: ServerQuestion[];
}

export interface AnswerResult {
  correct: boolean;
  round: number;
  correctOptionId: string;
  correctLabel: string;
  word: string | null;
  audio: { url: string; speaker: string | null } | null;
  sourceUrl: string | null;
}

export interface LessonResult {
  flagged: boolean;
  total: number;
  correctFirstTry: number;
  accuracy: number;
  durationSeconds: number;
  firstCompletion: boolean;
  xp: number;
  coins: number;
  streak: { current: number; longest: number; extendedToday: boolean; frozenDays: string[] };
  level: { before: number; after: number; leveledUp: boolean };
  achievements: string[];
  totals: { xpTotal: number; coins: number };
}

export const lessonsApi = {
  course: (languageId: string, locale: string) =>
    http.getQ<ServerCourse>("languages", [languageId, "course"], { locale }),
  progress: (languageId: string) =>
    http.getQ<ServerLessonProgress>("me", ["lessons"], { languageId }),
  start: (lessonId: string, locale: string) =>
    http.post<StartedAttempt>("lessons", [lessonId, "attempts"], { locale }),
  answer: (attemptId: string, exerciseId: string, optionId: string) =>
    http.post<AnswerResult>("lessonAttempts", [attemptId, "answers"], { exerciseId, optionId }),
  complete: (attemptId: string) =>
    http.post<LessonResult>("lessonAttempts", [attemptId, "complete"]),
};
