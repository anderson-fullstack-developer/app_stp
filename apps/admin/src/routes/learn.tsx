import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, ChevronRight, Plane, School, ShoppingBag, Zap } from "lucide-react";
import { AdSlot, RewardedAdCard } from "@/components/app/Ads";
import { Avatar, CoinBadge, StreakBadge, XPBadge } from "@/components/app/Badges";
import { LessonNode } from "@/components/app/Cards";
import { LoadingState, ProgressBar } from "@/components/app/Primitives";
import { StreakCard } from "@/components/app/StreakCard";
import { levelInfo, useGame } from "@/hooks/use-game";
import { useCourse, useDaily, useLanguages, useMe } from "@/hooks/use-service";
import { TabLayout } from "@/layouts/AppShell";
import { useTranslation } from "react-i18next";
import { KrioluPath } from "@/components/app/KrioluPath";
import { useSettings } from "@/hooks/use-settings";
import { KRIOLU_LANGUAGE_ID } from "@/lib/kriolu-course";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Aprender — Língua STP" },
      { name: "description", content: "O teu caminho de aprendizagem de Forro / Santomé." },
      { property: "og:title", content: "Aprender — Língua STP" },
      { property: "og:description", content: "Unidades, lições e desafios diários." },
    ],
  }),
  component: Learn,
});

const unitBg = {
  forest: "bg-forest text-primary-foreground",
  ocean: "bg-ocean-grad text-ocean-foreground",
  cocoa: "bg-cocoa text-secondary-foreground",
  sun: "bg-sun text-accent-foreground",
  coral: "bg-coral text-destructive-foreground",
};
const WAVE = [0, 44, 64, 44, 0, -44, -64, -44];

function Learn() {
  const { data: user } = useMe();
  const { data: course } = useCourse();
  const { data: daily } = useDaily();
  const g = useGame();
  const lvl = levelInfo(g.xp);
  const { t } = useTranslation();
  const { learning } = useSettings();
  const { data: langs } = useLanguages();
  const learningLang =
    langs?.find((l) => l.id === learning) ?? langs?.find((l) => l.id === "forro");
  const isKriolu = learningLang?.id === KRIOLU_LANGUAGE_ID;

  return (
    <TabLayout
      header={
        <header className="sticky top-0 z-20 bg-background/90 px-4 pb-3 pt-3 backdrop-blur safe-top">
          <div className="flex items-center gap-3">
            <Link to="/profile">
              {user && <Avatar name={user.name} color={user.avatarColor} size={42} />}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">Olá,</p>
              <p className="-mt-0.5 truncate font-display text-lg font-bold">{user?.name ?? "…"}</p>
            </div>
            <Link
              to="/notifications"
              aria-label="Notificações"
              className="relative grid size-10 place-items-center rounded-full bg-surface ring-2 ring-border"
            >
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StreakBadge value={g.streak} className="justify-center" />
            <XPBadge value={g.xp} className="justify-center" />
            <Link to="/shop" aria-label="Abrir loja">
              <CoinBadge value={g.coins} className="w-full justify-center" />
            </Link>
          </div>
        </header>
      }
    >
      {!user || !course ? (
        <LoadingState />
      ) : (
        <>
          <div className="mt-1 rounded-3xl bg-forest p-4 text-primary-foreground pattern-leaf">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest opacity-75">
                  {t("kriolu.learningLabel")}
                </p>
                <p className="flex items-center gap-2 font-display text-lg font-bold">
                  {learningLang?.name ?? "…"}
                  {learningLang?.beta && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                      {t("kriolu.beta")}
                    </span>
                  )}
                </p>
              </div>
              <span className="rounded-xl bg-primary-foreground/15 px-3 py-1 font-display font-bold">
                Nível {lvl.level}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={lvl.progress} tone="light" />
              <span className="shrink-0 whitespace-nowrap text-sm font-bold">{lvl.progress}%</span>
            </div>
            <p className="mt-1.5 text-xs opacity-80">
              Faltam {lvl.toNext} XP para o nível {lvl.level + 1}
            </p>
          </div>

          <div className="mt-3">
            <StreakCard
              streak={g.streak}
              longest={g.longestStreak}
              week={g.week}
              todayIndex={g.todayIndex}
            />
          </div>

          {daily && (
            <Link
              to="/daily"
              className={cn(
                "pressable mt-3 flex items-center gap-3 overflow-hidden rounded-3xl p-4",
                g.dailyDone
                  ? "border-[1.5px] border-success bg-success-soft"
                  : "bg-sun text-accent-foreground",
              )}
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-surface/50">
                {g.dailyDone ? (
                  <CheckCircle2 className="size-6 text-success" />
                ) : (
                  <Zap className="size-6 fill-current" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-display font-bold">Desafio do dia</p>
                <p className="text-xs font-semibold opacity-80">
                  {daily.questions} perguntas · +{daily.xpReward} XP · +{daily.coinReward} moedas
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold",
                  g.dailyDone ? "bg-success text-primary-foreground" : "bg-surface/60",
                )}
              >
                {g.dailyDone ? "✓ Concluído" : "Completa hoje"}
              </span>
            </Link>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              {
                to: "/shop" as const,
                label: "Loja",
                icon: ShoppingBag,
                cls: "bg-cocoa text-secondary-foreground",
              },
              {
                to: "/travel" as const,
                label: "Pack Viagem",
                icon: Plane,
                cls: "bg-ocean-grad text-ocean-foreground",
              },
              {
                to: "/schools" as const,
                label: "Escolas",
                icon: School,
                cls: "bg-coral text-destructive-foreground",
              },
            ].map(({ to, label, icon: I, cls }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "pressable flex flex-col items-center gap-1.5 rounded-2xl p-3 text-xs font-bold",
                  cls,
                )}
              >
                <I className="size-5" />
                {label}
              </Link>
            ))}
          </div>

          {isKriolu ? (
            <KrioluPath />
          ) : (
            course.units.map((unit, ui) => {
              const locked = unit.lessons.every((l) => l.status === "locked");
              const doneCount = unit.lessons.filter((l) => l.status === "completed").length;
              return (
                <section key={unit.id} className="mt-7">
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-3xl p-5 pattern-leaf",
                      unitBg[unit.theme],
                      locked && "opacity-70 saturate-50",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                          Unidade {unit.index}
                        </p>
                        <h2 className="font-display text-2xl font-bold">{unit.title}</h2>
                        <p className="text-sm opacity-85">{unit.description}</p>
                      </div>
                      <span className="rounded-xl bg-surface/20 px-2.5 py-1 text-xs font-bold">
                        {doneCount}/{unit.lessons.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-7 py-8">
                    {unit.lessons.map((l, i) => (
                      <LessonNode
                        key={l.id}
                        lesson={l}
                        offset={WAVE[(i + ui * 3) % WAVE.length] ?? 0}
                      />
                    ))}
                  </div>
                  {ui === 0 && (
                    <div className="space-y-3">
                      <RewardedAdCard />
                      <AdSlot placement="home" />
                    </div>
                  )}
                </section>
              );
            })
          )}
        </>
      )}
    </TabLayout>
  );
}
