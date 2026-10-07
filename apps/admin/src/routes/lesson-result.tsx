import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Clock, Coins, Flame, Star, Target } from "lucide-react";
import { z } from "zod";
import { AppButton } from "@/components/app/Buttons";
import { PhoneFrame } from "@/layouts/AppShell";
import { formatDuration } from "@/utils/format";
import { APP_CONFIG, APP_NAME } from "@stp/config";
import { game, useGame } from "@/hooks/use-game";
import { AdSlot } from "@/components/app/Ads";
import { useEffect } from "react";
import { Neto } from "@/components/app/Neto";
import { useTranslation } from "react-i18next";
import { sound } from "@/lib/sound";

export const Route = createFileRoute("/lesson-result")({
  validateSearch: (s) =>
    z
      .object({
        daily: z.boolean().catch(false),
        acc: z.number().catch(92),
        t: z.number().catch(204),
      })
      .parse(s),
  head: () => ({
    meta: [
      { title: `Lição concluída — ${APP_NAME}` },
      { name: "description", content: "Vê o teu XP, moedas, precisão e sequência." },
      { property: "og:title", content: `Lição concluída — ${APP_NAME}` },
      { property: "og:description", content: "Mais uma lição concluída!" },
    ],
  }),
  component: Result,
});

function Result() {
  const { t: tr } = useTranslation();
  const { acc, t, daily } = Route.useSearch();
  const g = useGame();
  const r = APP_CONFIG.rewards;
  const xp = daily ? r.dailyXp : r.lessonXp;
  const coins = daily ? r.dailyCoins : r.lessonCoins;
  const showAd = g.lessonsSinceAd >= APP_CONFIG.adEveryNLessons;
  useEffect(
    () => () => {
      if (showAd) game.resetAdCounter();
    },
    [showAd],
  );
  useEffect(() => {
    sound.play("complete");
  }, []);
  const router = useRouter();
  return (
    <PhoneFrame className="bg-forest pattern-leaf">
      <div className="flex flex-1 flex-col items-center px-6 pt-16 text-center text-primary-foreground safe-top">
        <Neto mood="celebrate" size={150} className="animate-pop" />
        <h1 className="animate-rise mt-4 font-display text-3xl font-bold">
          {daily ? tr("result.challengeDone") : tr("result.lessonDone")}
        </h1>
        <div className="mt-6 flex gap-3">
          <span
            className="animate-pop inline-flex items-center gap-1.5 rounded-2xl bg-sun px-4 py-2 font-display text-xl font-bold text-accent-foreground"
            style={{ animationDelay: ".3s" }}
          >
            <Star className="size-5 fill-current" />+{xp} XP
          </span>
          <span
            className="animate-pop inline-flex items-center gap-1.5 rounded-2xl bg-primary-foreground px-4 py-2 font-display text-xl font-bold text-secondary"
            style={{ animationDelay: ".45s" }}
          >
            <Coins className="size-5" />+{coins}
          </span>
        </div>
        <div className="mt-8 grid w-full grid-cols-3 gap-3">
          {[
            { icon: Target, label: tr("result.accuracy"), v: `${acc}%` },
            { icon: Clock, label: tr("result.time"), v: formatDuration(t) },
            { icon: Flame, label: tr("result.streak"), v: tr("result.days", { count: g.streak }) },
          ].map(({ icon: I, label, v }, k) => (
            <div
              key={label}
              className="animate-rise rounded-2xl bg-primary-foreground/12 p-3 ring-1 ring-primary-foreground/20"
              style={{ animationDelay: `${0.5 + k * 0.1}s` }}
            >
              <I className="mx-auto size-5 text-accent" />
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-80">
                {label}
              </p>
              <p className="font-display text-lg font-bold">{v}</p>
            </div>
          ))}
        </div>
        {showAd && (
          <div className="mt-6 w-full">
            <AdSlot placement="result" />
          </div>
        )}
        <div className="mt-auto w-full space-y-3 pb-6 pt-8 safe-bottom">
          <Link to="/learn">
            <AppButton variant="light">{tr("common.continue")}</AppButton>
          </Link>
          <AppButton
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => router.history.back()}
          >
            {daily ? tr("common.back") : tr("result.repeat")}
          </AppButton>
        </div>
      </div>
    </PhoneFrame>
  );
}
