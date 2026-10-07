import { PlayCircle } from "lucide-react";
import { useState } from "react";
import { APP_CONFIG, isEnabled } from "@stp/config";
import { game } from "@/hooks/use-game";
import { adsService } from "@/services";
import { AppButton } from "./Buttons";
import { useAdsBlocked, type AdPlacement } from "@/config/ads";

/**
 * Placeholder for a future Google AdMob banner/native slot.
 * RULE: never render during a question, countdown, multiplayer match or active exercise.
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const blocked = useAdsBlocked();
  if (blocked || !isEnabled("adsEnabled") || !adsService.canShow(placement)) return null;
  return (
    <div
      className="relative flex h-20 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-xs font-medium text-muted-foreground/80"
      data-ad-placement={placement}
    >
      <span className="absolute left-3 top-2 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground ring-1 ring-border/70">
        Publicidade
      </span>
      Espaço reservado para anúncio
    </div>
  );
}

export function RewardedAdCard() {
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");
  const blocked = useAdsBlocked();
  if (blocked || !isEnabled("rewardedAdsEnabled")) return null;
  const coins = APP_CONFIG.rewards.rewardedAdCoins;
  const watch = async () => {
    setState("playing");
    const ok = await adsService.showRewarded();
    if (ok) game.addCoins(coins);
    setState("done");
  };
  return (
    <div className="card flex items-center gap-3 rounded-3xl p-4">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ocean-grad text-ocean-foreground">
        <PlayCircle />
      </div>
      <div className="flex-1">
        <p className="font-display font-bold">Anúncio recompensado</p>
        <p className="text-xs text-muted-foreground">Vê um vídeo e ganha +{coins} moedas</p>
      </div>
      <AppButton
        size="sm"
        variant={state === "done" ? "secondary" : "primary"}
        disabled={state !== "idle"}
        onClick={watch}
      >
        {state === "idle" ? "Ver anúncio" : state === "playing" ? "A ver…" : `+${coins} ✓`}
      </AppButton>
    </div>
  );
}
