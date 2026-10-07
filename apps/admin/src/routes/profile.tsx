import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Flame,
  Languages,
  Settings,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Avatar } from "@/components/app/Badges";
import { AchievementBadge, PremiumCard } from "@/components/app/Cards";
import { LoadingState, ProgressBar, SectionTitle, StatCard } from "@/components/app/Primitives";
import { useTranslation } from "react-i18next";
import { useProfileView } from "@/hooks/use-profile-view";
import { CoinBadge } from "@/components/app/Badges";
import { AppHeader, TabLayout } from "@/layouts/AppShell";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: `Perfil — ${APP_NAME}` },
      { name: "description", content: "As tuas estatísticas, sequência e conquistas." },
      { property: "og:title", content: `Perfil — ${APP_NAME}` },
      { property: "og:description", content: "O teu progresso em Forro / Santomé." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { t, i18n } = useTranslation();
  const v = useProfileView();
  const num = (n: number) => n.toLocaleString(i18n.language === "en" ? "en-GB" : "pt-PT");
  return (
    <TabLayout
      header={
        <AppHeader
          title={t("profile.title")}
          right={
            <Link
              to="/settings"
              aria-label={t("settings.title")}
              className="grid size-10 place-items-center rounded-full hover:bg-muted"
            >
              <Settings className="size-5" />
            </Link>
          }
        />
      }
    >
      {!v ? (
        <LoadingState />
      ) : (
        <>
          <div className="relative overflow-hidden rounded-[2rem] bg-forest p-5 text-primary-foreground shadow-raised pattern-leaf">
            <div className="flex items-center gap-4">
              <Avatar name={v.name} color="sun" size={76} className="ring-4 ring-white/20" />
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-2xl font-bold tracking-[-0.02em]">
                  {v.name}
                </h1>
                <p className="text-sm opacity-75">@{v.username}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {v.learningLanguage && (
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/14 px-2.5 text-xs font-semibold ring-1 ring-inset ring-white/20">
                      <Languages className="size-3.5" />
                      {v.learningLanguage}
                    </span>
                  )}
                  <CoinBadge value={v.coins} className="h-7 bg-primary-foreground/95 text-xs" />
                </div>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="whitespace-nowrap font-display font-bold">
                  {t("profile.level", { level: v.level.level })}
                </span>
                <span className="whitespace-nowrap text-xs font-medium opacity-75">
                  {t("profile.toNext", { xp: num(v.level.toNext), next: v.level.level + 1 })}
                </span>
              </div>
              <ProgressBar value={v.level.progress} tone="light" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard
              icon={<Star className="size-4" />}
              label={t("profile.xpTotal")}
              value={num(v.xp)}
            />
            <StatCard
              icon={<Flame className="size-4" />}
              label={t("profile.streak")}
              value={v.streak}
            />
            <StatCard
              icon={<Zap className="size-4" />}
              label={t("profile.longestStreak")}
              value={v.longestStreak}
            />
            <StatCard
              icon={<BookOpen className="size-4" />}
              label={t("profile.lessons")}
              value={v.lessons}
            />
            <StatCard
              icon={<Languages className="size-4" />}
              label={t("profile.words")}
              value={v.words}
            />
            <StatCard
              icon={<Target className="size-4" />}
              label={t("profile.accuracy")}
              value={v.accuracy === null ? "—" : `${v.accuracy}%`}
            />
            <StatCard
              icon={<Trophy className="size-4" />}
              label={t("profile.wins")}
              value={v.wins}
            />
            <StatCard
              icon={<Award className="size-4" />}
              label={t("profile.achievements")}
              value={v.achievementsCount}
            />
          </div>
          <div className="mt-4">
            <PremiumCard />
          </div>
          <SectionTitle
            action={
              <Link to="/achievements" className="text-sm font-semibold text-primary">
                {t("profile.seeAll")}
              </Link>
            }
          >
            {t("profile.achievements")}
          </SectionTitle>
          {!v.achievements ? (
            <LoadingState rows={1} />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {v.achievements.slice(0, 6).map((a) => (
                <AchievementBadge key={a.id} a={a} />
              ))}
            </div>
          )}
        </>
      )}
    </TabLayout>
  );
}
