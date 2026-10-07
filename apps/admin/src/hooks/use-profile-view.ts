import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Achievement } from "@stp/types";
import { useAccountProfile } from "@/hooks/use-account";
import { levelInfo, useGame } from "@/hooks/use-game";
import { useAchievements, useLanguages, useMe } from "@/hooks/use-service";
import { accountService } from "@/services/account.service";

type AchievementKey =
  | "ACH_FIRST_LESSON"
  | "ACH_STREAK_7"
  | "ACH_STREAK_30"
  | "ACH_STREAK_100"
  | "ACH_STREAK_365"
  | "ACH_CORRECT_100"
  | "ACH_CORRECT_1000"
  | "ACH_LEVEL_10"
  | "ACH_LEVEL_25"
  | "ACH_LEVEL_50";

/** O que o Perfil mostra — do servidor com sessão, da demonstração sem sessão. */
export interface ProfileView {
  source: "server" | "demo";
  name: string;
  username: string;
  learningLanguage: string | null;
  coins: number;
  level: { level: number; progress: number; toNext: number };
  xp: number;
  streak: number;
  longestStreak: number;
  lessons: number;
  words: number;
  accuracy: number | null;
  wins: number;
  achievementsCount: number;
  achievements: Achievement[] | undefined;
}

export function useProfileView(): ProfileView | null {
  const { t } = useTranslation();
  const account = useAccountProfile();
  const server = account.data;
  const serverAchievements = useQuery({
    queryKey: ["account-achievements", server?.id],
    queryFn: accountService.getAchievements,
    enabled: Boolean(server),
  });
  const { data: demo } = useMe();
  const { data: demoAch } = useAchievements();
  const { data: langs } = useLanguages();
  const g = useGame();

  if (server) {
    const p = server.progress;
    return {
      source: "server",
      name: server.name,
      username: server.username,
      learningLanguage: langs?.find((l) => l.id === server.learningLanguageId)?.name ?? null,
      coins: p.coins,
      level: {
        level: p.level.level,
        progress: Math.round(p.level.progress * 100),
        toNext: p.level.nextLevelXp - p.xpTotal,
      },
      xp: p.xpTotal,
      streak: p.streak.current,
      longestStreak: p.streak.longest,
      lessons: p.lessonsCompleted,
      words: p.wordsLearned,
      accuracy: p.accuracy,
      wins: 0, // Arena online chega na Fase 2
      achievementsCount: p.achievementsCount,
      achievements: serverAchievements.data?.map((a) => ({
        id: a.key,
        icon: a.icon,
        title: t(`achievementsList.${a.key as AchievementKey}.title`),
        description: t(`achievementsList.${a.key as AchievementKey}.description`),
        unlocked: a.unlocked,
        progress: a.progress,
      })),
    };
  }
  // Sem sessão (ou API desligada): perfil de demonstração.
  if (account.enabled && account.isPending) return null;
  if (!demo) return null;
  const lvl = levelInfo(g.xp);
  return {
    source: "demo",
    name: demo.name,
    username: demo.username,
    learningLanguage: "Forro / Santomé",
    coins: g.coins,
    level: lvl,
    xp: g.xp,
    streak: g.streak,
    longestStreak: g.longestStreak,
    lessons: demo.lessonsCompleted,
    words: demo.wordsLearned,
    accuracy: demo.accuracy,
    wins: demo.wins,
    achievementsCount: demo.achievementsCount,
    achievements: demoAch,
  };
}
