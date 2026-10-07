import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Clock, Coins, Flame, Star, Target } from "lucide-react";
import { z } from "zod";
import { AppButton } from "@/components/app/Buttons";
import { PhoneFrame } from "@/layouts/AppShell";
import { formatDuration } from "@/utils/format";
import { APP_CONFIG } from "@stp/config";
import { game, useGame } from "@/hooks/use-game";
import { AdSlot } from "@/components/app/Ads";
import { useEffect } from "react";
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
      { title: "Lição concluída — Língua STP" },
      { name: "description", content: "Vê o teu XP, moedas, precisão e sequência." },
      { property: "og:title", content: "Lição concluída — Língua STP" },
      { property: "og:description", content: "Mais uma lição concluída!" },
    ],
  }),
  component: Result,
});

function Result() {
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
        <div className="animate-pop text-7xl">🎉</div>
        <h1 className="animate-rise mt-4 font-display text-3xl font-bold">
          {daily ? "Desafio concluído!" : "Lição concluída!"}
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
            { icon: Target, label: "Precisão", v: `${acc}%` },
            { icon: Clock, label: "Tempo", v: formatDuration(t) },
            { icon: Flame, label: "Streak", v: `${g.streak} dias` },
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
            <AppButton variant="light">Continuar</AppButton>
          </Link>
          <AppButton
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => router.history.back()}
          >
            {daily ? "Voltar" : "Repetir lição"}
          </AppButton>
        </div>
      </div>
    </PhoneFrame>
  );
}
