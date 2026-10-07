import { Coins, Star } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { game, useGameEvents } from "@/hooks/use-game";
import { sound } from "@/lib/sound";
import { AppButton } from "./Buttons";
import { Neto } from "./Neto";

/** Global overlay for reward micro-interactions: +XP, +coins, streak kept, level up. */
export function RewardLayer() {
  const events = useGameEvents();
  const { t } = useTranslation();
  const toasts = events.filter((e) => e.kind === "xp" || e.kind === "coins");
  const big = events.find((e) => e.kind === "levelUp") ?? events.find((e) => e.kind === "streak");

  const coinIds = toasts
    .filter((t) => t.kind === "coins")
    .map((t) => t.id)
    .join(",");
  useEffect(() => {
    if (coinIds) sound.play("coins");
  }, [coinIds]);
  const bigId = big?.id;
  const bigKind = big?.kind;
  useEffect(() => {
    if (bigKind) sound.play(bigKind === "levelUp" ? "levelUp" : "streak");
  }, [bigId, bigKind]);
  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => game.dismissEvent(t.id), 1800));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] mx-auto max-w-[440px]"
      aria-live="polite"
    >
      <div className="absolute inset-x-0 top-24 flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <span
            key={toast.id}
            className="animate-xp-float inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 font-display text-lg font-bold shadow-float ring-1 ring-border/60"
          >
            {toast.kind === "xp" ? (
              <Star className="size-5 fill-accent-deep text-accent-deep" />
            ) : (
              <Coins className="size-5 text-secondary" />
            )}
            +{toast.amount} {toast.kind === "xp" ? "XP" : "moedas"}
          </span>
        ))}
      </div>
      {big && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-foreground/40 p-6 backdrop-blur-[3px]">
          <div className="animate-pop w-full rounded-[2rem] bg-surface p-6 text-center shadow-float">
            {big.kind === "levelUp" ? (
              <>
                <Neto mood="celebrate" size={150} className="mx-auto animate-float" />
                <p className="mt-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-accent-deep">
                  {t("neto.levelUpKicker")}
                </p>
                <p className="font-display text-3xl font-bold">
                  {t("neto.levelUpTitle", { level: big.level })}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{t("neto.levelUpText")}</p>
              </>
            ) : (
              <>
                <Neto mood="happy" size={132} className="mx-auto animate-float" />
                <p className="mt-2 font-display text-3xl font-bold">{t("neto.streakKept")}</p>
                <p className="font-display text-xl font-bold text-destructive">
                  🔥 {t("neto.streakDays", { count: big.days })}
                </p>
              </>
            )}
            <AppButton className="mt-5" onClick={() => game.dismissEvent(big.id)}>
              {t("common.continue")}
            </AppButton>
          </div>
        </div>
      )}
    </div>
  );
}
