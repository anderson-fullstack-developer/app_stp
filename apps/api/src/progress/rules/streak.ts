import { addDays, daysBetween } from "./local-date.js";

/** docs/REGRAS_DE_NEGOCIO.md §6. Datas são locais (`AAAA-MM-DD`). */
export const MAX_STREAK_FREEZES = 2;

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakFreezes: number;
}

export interface StreakUpdate {
  state: StreakState;
  /** Dias cobertos por proteções gastas nesta atividade. */
  frozenDays: string[];
  /** Falso se já tinha havido atividade neste dia. */
  counted: boolean;
}

/** Aplica uma atividade válida no dia local `today`. */
export function applyActivity(prev: StreakState, today: string): StreakUpdate {
  if (prev.lastActiveDate === null) {
    return {
      state: {
        ...prev,
        currentStreak: 1,
        longestStreak: Math.max(prev.longestStreak, 1),
        lastActiveDate: today,
      },
      frozenDays: [],
      counted: true,
    };
  }
  const gap = daysBetween(prev.lastActiveDate, today);
  // Mesmo dia — ou relógio a andar para trás (ex.: mudança de fuso): não conta outra vez.
  if (gap <= 0) return { state: prev, frozenDays: [], counted: false };

  const missed = gap - 1;
  let current: number;
  let freezes = prev.streakFreezes;
  const frozenDays: string[] = [];
  if (missed === 0) {
    current = prev.currentStreak + 1;
  } else if (missed <= freezes) {
    // As proteções só se gastam se cobrirem a falha toda.
    for (let i = 1; i <= missed; i++) frozenDays.push(addDays(prev.lastActiveDate, i));
    freezes -= missed;
    current = prev.currentStreak + 1;
  } else {
    current = 1;
  }
  return {
    state: {
      currentStreak: current,
      longestStreak: Math.max(prev.longestStreak, current),
      lastActiveDate: today,
      streakFreezes: freezes,
    },
    frozenDays,
    counted: true,
  };
}

/**
 * Streak como o utilizador a vê hoje, sem registar atividade: se já falhou mais dias do
 * que as proteções cobrem, mostra 0 (a perda vê-se ao abrir a app).
 */
export function effectiveStreak(state: StreakState, today: string): number {
  if (state.lastActiveDate === null) return 0;
  const missed = daysBetween(state.lastActiveDate, today) - 1;
  if (missed <= 0) return state.currentStreak;
  return missed <= state.streakFreezes ? state.currentStreak : 0;
}
