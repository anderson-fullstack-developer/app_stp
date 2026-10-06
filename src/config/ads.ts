/**
 * Single source of truth for ad policy (future: Google AdMob).
 * RULE: never show ads during a question, countdown, multiplayer or active lesson.
 */
import { useSyncExternalStore, useEffect } from "react";

/** Only these placements may ever show an ad. */
export const AD_PLACEMENTS = ["home", "result", "shop"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/** Contexts in which ads are forbidden. */
export const AD_BLOCKED_CONTEXTS = ["question", "countdown", "multiplayer", "lesson"] as const;
export type AdBlockedContext = (typeof AD_BLOCKED_CONTEXTS)[number];

const active = new Map<AdBlockedContext, number>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const adPolicy = {
  block(ctx: AdBlockedContext) {
    active.set(ctx, (active.get(ctx) ?? 0) + 1);
    emit();
    return () => {
      const n = (active.get(ctx) ?? 1) - 1;
      if (n <= 0) active.delete(ctx); else active.set(ctx, n);
      emit();
    };
  },
  isBlocked: () => active.size > 0,
  blockedBy: () => [...active.keys()],
  /** Central check used by every ad component and adsService. */
  canShow: (placement: string) => (AD_PLACEMENTS as readonly string[]).includes(placement) && active.size === 0,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** Call in any screen where ads are forbidden (lesson, match, countdown). */
export function useBlockAds(ctx: AdBlockedContext, when = true) {
  useEffect(() => (when ? adPolicy.block(ctx) : undefined), [ctx, when]);
}

export function useAdsBlocked() {
  return useSyncExternalStore(adPolicy.subscribe, adPolicy.isBlocked, () => false);
}
