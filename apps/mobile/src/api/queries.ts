import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type {
  CountryWithLanguages,
  CourseResponse,
  DailyOverviewDto,
  FriendsDto,
  LessonProgressResponse,
  ArenaHistoryDto,
  MeResponse,
  NotificationDto,
  PublicProfileDto,
  RankingDto,
  ShopDto,
  RankingScopeDto,
  UserSearchDto,
} from "@stp/types/api";
import { DEFAULT_LEARNING_LANGUAGE } from "@/config";
import { ApiError, useApi } from "./client";

export const keys = {
  me: ["me"] as const,
  languages: ["languages"] as const,
  course: (lang: string, locale: string) => ["course", lang, locale] as const,
  lessons: (lang: string) => ["lesson-progress", lang] as const,
  daily: (lang: string) => ["daily", lang] as const,
  friends: ["social", "friends"] as const,
  search: (q: string) => ["social", "search", q] as const,
  ranking: (scope: RankingScopeDto) => ["social", "ranking", scope] as const,
  profile: (id: string) => ["social", "profile", id] as const,
  notifications: ["social", "notifications"] as const,
  shop: ["shop"] as const,
  arenaHistory: ["arena", "history"] as const,
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

/** Amigos, pedidos recebidos e enviados (GET /friends). */
export function useFriends() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.friends,
    queryFn: () => api.get<FriendsDto>("/friends"),
    enabled: Boolean(isSignedIn),
  });
}

/** Pesquisar pessoas (a partir de 2 letras). */
export function useUserSearch(q: string) {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.search(q),
    queryFn: () => api.get<UserSearchDto>("/users/search", { q }),
    enabled: Boolean(isSignedIn) && q.replace(/^@/, "").length >= 2,
  });
}

export function useRanking(scope: RankingScopeDto) {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.ranking(scope),
    queryFn: () => api.get<RankingDto>("/rankings", { scope }),
    enabled: Boolean(isSignedIn),
    retry: (n, e) => !(e instanceof ApiError && e.status === 422) && n < 2,
  });
}

/** Perfil público de outra pessoa (GET /users/:id). */
export function usePublicProfile(userId: string) {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.profile(userId),
    queryFn: () => api.get<PublicProfileDto>(`/users/${userId}`),
    enabled: Boolean(isSignedIn) && Boolean(userId),
    retry: false,
  });
}

/** Notificações (pedidos, pedidos aceites, conquistas, convites da Arena). */
export function useNotifications() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.notifications,
    queryFn: () => api.get<NotificationDto[]>("/me/notifications"),
    enabled: Boolean(isSignedIn),
    refetchInterval: 60_000,
  });
}

export function useShop() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.shop,
    queryFn: () => api.get<ShopDto>("/shop"),
    enabled: Boolean(isSignedIn),
  });
}

export function useArenaHistory() {
  const api = useApi();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.arenaHistory,
    queryFn: () => api.get<ArenaHistoryDto[]>("/arena/matches"),
    enabled: Boolean(isSignedIn),
  });
}
