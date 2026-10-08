import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type {
  CountryWithLanguages,
  CourseResponse,
  DailyOverviewDto,
  LessonProgressResponse,
  MeResponse,
} from "@stp/types/api";
import { DEFAULT_LEARNING_LANGUAGE } from "@/config";
import { useApi } from "./client";

export const keys = {
  me: ["me"] as const,
  languages: ["languages"] as const,
  course: (lang: string, locale: string) => ["course", lang, locale] as const,
  lessons: (lang: string) => ["lesson-progress", lang] as const,
  daily: (lang: string) => ["daily", lang] as const,
};

/** Idioma dos significados: o da interface (pt ou en). */
export function useMeaningLocale() {
  const { i18n } = useTranslation();
  return i18n.language === "en" ? "en" : "pt";
}

/** Perfil e progresso do servidor (GET /me). */
export function useMe() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<MeResponse>("/me"),
    enabled: Boolean(isSignedIn),
  });
}

export function useLearningLanguage() {
  return useMe().data?.learningLanguageId ?? DEFAULT_LEARNING_LANGUAGE;
}

export function useLanguages() {
  const api = useApi();
  return useQuery({
    queryKey: keys.languages,
    queryFn: () => api.get<CountryWithLanguages[]>("/languages"),
    staleTime: 60 * 60_000,
  });
}

export function useCourse(languageId: string) {
  const api = useApi();
  const locale = useMeaningLocale();
  return useQuery({
    queryKey: keys.course(languageId, locale),
    queryFn: () => api.get<CourseResponse>(`/languages/${languageId}/course`, { locale }),
    staleTime: 5 * 60_000,
  });
}

export function useLessonProgress(languageId: string) {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.lessons(languageId),
    queryFn: () => api.get<LessonProgressResponse>("/me/lessons", { languageId }),
    enabled: Boolean(isSignedIn),
  });
}

export function useDailyOverview(languageId: string) {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.daily(languageId),
    queryFn: () => api.get<DailyOverviewDto>(`/daily/${languageId}`),
    enabled: Boolean(isSignedIn),
    retry: false,
  });
}
