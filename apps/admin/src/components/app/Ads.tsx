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
    <div className="flex h-20 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground" data-ad-placement={placement}>
      Espaço publicitário · {placement}
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
    <div className="flex items-center gap-3 rounded-3xl border-2 border-border bg-surface p-4">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ocean-grad text-ocean-foreground"><PlayCircle /></div>
      <div className="flex-1">
        <p className="font-display font-extrabold">Anúncio recompensado</p>
        <p className="text-xs text-muted-foreground">Vê um vídeo e ganha +{coins} moedas</p>
      </div>
      <AppButton size="sm" variant={state === "done" ? "secondary" : "primary"} disabled={state !== "idle"} onClick={watch}>
        {state === "idle" ? "Ver anúncio" : state === "playing" ? "A ver…" : `+${coins} ✓`}
      </AppButton>
    </div>
  );
}
