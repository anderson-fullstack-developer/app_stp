import { Coins, Flame, Star } from "lucide-react";
import { useEffect } from "react";
import { game, useGameEvents } from "@/hooks/use-game";
import { sound } from "@/lib/sound";
import { AppButton } from "./Buttons";

/** Global overlay for reward micro-interactions: +XP, +coins, streak kept, level up. */
export function RewardLayer() {
  const events = useGameEvents();
  const toasts = events.filter((e) => e.kind === "xp" || e.kind === "coins");
  const big = events.find((e) => e.kind === "levelUp") ?? events.find((e) => e.kind === "streak");

  const coinIds = toasts.filter((t) => t.kind === "coins").map((t) => t.id).join(",");
  useEffect(() => { if (coinIds) sound.play("coins"); }, [coinIds]);
  useEffect(() => { if (big) sound.play(big.kind === "levelUp" ? "levelUp" : "streak"); }, [big?.id]);
  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => game.dismissEvent(t.id), 1800));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] mx-auto max-w-[440px]" aria-live="polite">
      <div className="absolute inset-x-0 top-24 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <span key={t.id} className="animate-xp-float inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 font-display text-lg font-bold shadow-float ring-1 ring-border/60">
            {t.kind === "xp" ? <Star className="size-5 fill-accent-deep text-accent-deep" /> : <Coins className="size-5 text-secondary" />}
            +{t.amount} {t.kind === "xp" ? "XP" : "moedas"}
          </span>
        ))}
      </div>
      {big && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-foreground/40 p-6 backdrop-blur-[3px]">
          <div className="animate-pop w-full rounded-[2rem] bg-surface p-6 text-center shadow-float">
            {big.kind === "levelUp" ? (
              <>
                <div className="mx-auto grid size-24 place-items-center rounded-[2rem] bg-sun animate-float"><Star className="size-12 fill-accent-foreground text-accent-foreground" /></div>
                <p className="mt-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-accent-deep">Subiste de nível</p>
                <p className="font-display text-4xl font-bold">Nível {big.level}</p>
                <p className="mt-1 text-sm text-muted-foreground">Continua assim — estás a preservar uma língua.</p>
              </>
            ) : (
              <>
                <div className="mx-auto grid size-24 place-items-center rounded-full bg-coral text-destructive-foreground animate-float"><Flame className="size-12 fill-current" /></div>
                <p className="mt-4 font-display text-3xl font-bold">Sequência mantida!</p>
                <p className="font-display text-xl font-bold text-destructive">🔥 {big.days} dias</p>
              </>
            )}
            <AppButton className="mt-5" onClick={() => game.dismissEvent(big.id)}>Continuar</AppButton>
          </div>
        </div>
      )}
    </div>
  );
}
