import { useAccountProfile } from "@/hooks/use-account";
import { useSettings } from "@/hooks/use-settings";
import { KRIOLU_LANGUAGE_ID } from "@/lib/kriolu-course";

/** Língua do desafio: a que a pessoa aprende (servidor → definições → Kriolu). */
export function useDailyLanguage() {
  const { data } = useAccountProfile();
  const { learning } = useSettings();
  return data?.learningLanguageId ?? learning ?? KRIOLU_LANGUAGE_ID;
}

export const dailyKeys = {
  overview: (lang: string) => ["daily", lang] as const,
  ranking: (lang: string) => ["daily-ranking", lang] as const,
};
