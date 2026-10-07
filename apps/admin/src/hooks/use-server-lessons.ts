import { useAuth } from "@clerk/tanstack-react-start";
import { useQuery } from "@tanstack/react-query";
import { USE_MOCK_API } from "@/config/api";
import { useMeaningLocale } from "@/hooks/use-kriolu";
import { type LessonState, lessonsApi } from "@/services/lessons-api.service";

/** Lições jogadas no servidor só com sessão iniciada e API configurada; senão, modo demonstração. */
export function useServerLessonsEnabled() {
  const { isSignedIn } = useAuth();
  return Boolean(isSignedIn) && !USE_MOCK_API;
}

export const serverLessonKeys = {
  course: (languageId: string, locale: string) => ["server-course", languageId, locale] as const,
  progress: (languageId: string) => ["server-lessons", languageId] as const,
};

/** Unidade do caminho de lições (formato comum ao modo servidor e ao de demonstração). */
export interface PathUnit {
  key: string;
  themeId: string;
  icon: string;
  lessons: { id: string; index: number; state: LessonState }[];
}

/** Curso + progresso vindos do servidor, já no formato do caminho. `null` = usar a demonstração. */
export function useServerPath(languageId: string): PathUnit[] | null {
  const enabled = useServerLessonsEnabled();
  const locale = useMeaningLocale();
  const course = useQuery({
    queryKey: serverLessonKeys.course(languageId, locale),
    queryFn: () => lessonsApi.course(languageId, locale),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const progress = useQuery({
    queryKey: serverLessonKeys.progress(languageId),
    queryFn: () => lessonsApi.progress(languageId),
    enabled,
    retry: 1,
  });
  if (!enabled || !course.data || !progress.data) return null;
  const state = new Map(progress.data.lessons.map((l) => [l.lessonId, l.state]));
  return course.data.units.map((u) => ({
    key: u.id,
    themeId: u.slug ?? u.title,
    icon: u.icon ?? "",
    lessons: u.lessons
      .filter((l) => l.playable)
      .map((l) => ({ id: l.id, index: l.order, state: state.get(l.id) ?? "locked" })),
  }));
}
