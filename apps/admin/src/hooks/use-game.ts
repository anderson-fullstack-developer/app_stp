import { useSyncExternalStore } from "react";
import { APP_CONFIG } from "@stp/config";
import { userService } from "@/services";
const currentUser = userService.getMeSnapshot();

/**
 * Client-side gamification state (XP, coins, streak, daily challenge).
 * Will later be hydrated from / synced to progressService.
 */
export interface GameState {
  xp: number;
  coins: number;
  streak: number;
  longestStreak: number;
  /** Mon..Sun activity for the current week */
  week: boolean[];
  todayIndex: number;
  dailyDone: boolean;
  lessonsSinceAd: number;
  owned: string[];
}

export type GameEvent =
  | { id: number; kind: "xp"; amount: number }
  | { id: number; kind: "coins"; amount: number }
  | { id: number; kind: "levelUp"; level: number }
  | { id: number; kind: "streak"; days: number };

const KEY = "lstp-game-v1";
const initial: GameState = {
  xp: currentUser.xp, coins: currentUser.coins, streak: currentUser.streak - 1, longestStreak: currentUser.longestStreak,
  week: [true, true, true, true, false, false, false], todayIndex: 4, dailyDone: false, lessonsSinceAd: 0, owned: [],
};

let state = initial;
let events: GameEvent[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } };

export const levelInfo = (xp: number) => {
  const per = APP_CONFIG.xpPerLevel;
  return { level: 1 + Math.floor(xp / per), progress: Math.round(((xp % per) / per) * 100), toNext: per - (xp % per) };
};

type NewEvent = GameEvent extends infer E ? (E extends GameEvent ? Omit<E, "id"> : never) : never;
function push(e: NewEvent) {
  events = [...events, { ...e, id: ++seq } as GameEvent];
}

function set(next: Partial<GameState>) {
  const prevLevel = levelInfo(state.xp).level;
  state = { ...state, ...next };
  const lvl = levelInfo(state.xp).level;
  if (lvl > prevLevel) push({ kind: "levelUp", level: lvl });
  save(); emit();
}

function markToday() {
  if (state.week[state.todayIndex]) return {};
  const week = [...state.week]; week[state.todayIndex] = true;
  const streak = state.streak + 1;
  push({ kind: "streak", days: streak });
  return { week, streak, longestStreak: Math.max(state.longestStreak, streak) };
}

export const game = {
  hydrate() {
    try { const raw = localStorage.getItem(KEY); if (raw) { state = { ...initial, ...JSON.parse(raw) }; emit(); } } catch { /* ignore */ }
  },
  addXp(amount: number) { push({ kind: "xp", amount }); set({ xp: state.xp + amount }); },
  addCoins(amount: number) { push({ kind: "coins", amount }); set({ coins: state.coins + amount }); },
  completeLesson(xp: number, coins: number) {
    push({ kind: "xp", amount: xp }); push({ kind: "coins", amount: coins });
    set({ xp: state.xp + xp, coins: state.coins + coins, lessonsSinceAd: state.lessonsSinceAd + 1, ...markToday() });
  },
  completeDaily() {
    const { dailyXp, dailyCoins } = APP_CONFIG.rewards;
    push({ kind: "xp", amount: dailyXp }); push({ kind: "coins", amount: dailyCoins });
    set({ xp: state.xp + dailyXp, coins: state.coins + dailyCoins, dailyDone: true, ...markToday() });
  },
  buy(itemId: string, price: number) {
    if (state.coins < price || state.owned.includes(itemId)) return false;
    set({ coins: state.coins - price, owned: [...state.owned, itemId] });
    return true;
  },
  resetAdCounter() { set({ lessonsSinceAd: 0 }); },
  dismissEvent(id: number) { events = events.filter((e) => e.id !== id); emit(); },
  reset() { state = initial; save(); emit(); },
};

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useGame = () => useSyncExternalStore(subscribe, () => state, () => initial);
const NO_EVENTS: GameEvent[] = [];
export const useGameEvents = () => useSyncExternalStore(subscribe, () => events, () => NO_EVENTS);
