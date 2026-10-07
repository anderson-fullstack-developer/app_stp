import { useSyncExternalStore } from "react";

/**
 * Preferências do dispositivo (som, efeitos, vibração, notificações).
 * Guardadas em localStorage — são preferências locais, não dados de conta.
 */
export interface Settings {
  /** Interruptor geral de som da app. */
  sound: boolean;
  /** Efeitos sonoros (cliques, acertos, contagem…). Só tocam se `sound` também estiver ligado. */
  effects: boolean;
  /** Vibração curta (Android; ignorada onde não existe). */
  haptics: boolean;
  notifications: boolean;
  /** Idioma da interface escolhido pelo utilizador; null = usar o idioma do dispositivo. */
  locale: string | null;
}

const KEY = "lstp-settings-v1";
const DEFAULTS: Settings = {
  sound: true,
  effects: true,
  haptics: true,
  notifications: true,
  locale: null,
};

let state: Settings = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignorar: usa os valores por omissão */
  }
}

export const settings = {
  get(): Settings {
    hydrate();
    return state;
  },
  set(patch: Partial<Settings>) {
    hydrate();
    state = { ...state, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignorar */
    }
    listeners.forEach((l) => l());
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useSettings = () => useSyncExternalStore(subscribe, settings.get, () => DEFAULTS);
