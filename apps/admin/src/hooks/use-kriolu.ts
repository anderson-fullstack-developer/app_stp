import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import data from "@content/sources/wiktionary-kea/entries.json";
import ptSuggestions from "@content/sources/wiktionary-kea/pt-suggestions.json";
import recordings from "@content/sources/lingua-libre-kea/recordings.json";
import { settings } from "@/hooks/use-settings";
import { buildKrioluCourse, type KrioluUnit } from "@/lib/kriolu-course";
import type { MeaningLocale, SourceEntry } from "@/lib/preview-quiz";

export const krioluEntries = data.entries as SourceEntry[];
export const krioluPtSuggestions = ptSuggestions.translations as Record<string, string>;

/** Gravação de pronúncia por falante nativa (Lingua Libre, CC0), por palavra. */
export interface Pronunciation {
  url: string;
  speaker: string | null;
}
export const krioluAudio = new Map<string, Pronunciation>(
  (recordings.recordings as { word: string; url: string; speaker: string | null }[]).map((r) => [
    r.word,
    { url: r.url, speaker: r.speaker },
  ]),
);

/** Toca a pronúncia (respeita o interruptor geral "Som" das Definições). */
export function playPronunciation(p: Pronunciation) {
  if (typeof window === "undefined" || !settings.get().sound) return;
  const el = new Audio(p.url);
  void el.play().catch(() => {});
}

/** Idioma dos significados: o da interface (português ou inglês). */
export function useMeaningLocale(): MeaningLocale {
  const { i18n } = useTranslation();
  return i18n.language === "en" ? "en" : "pt";
}

/** Curso de Kriolu (Beta) no idioma de quem joga. */
export function useKrioluCourse(): KrioluUnit[] {
  const locale = useMeaningLocale();
  return useMemo(() => buildKrioluCourse(krioluEntries, locale, krioluPtSuggestions), [locale]);
}

/*
 * Progresso das lições de Kriolu no dispositivo (protótipo). No backend passa para
 * UserLessonProgress, calculado pelo servidor.
 */
const KEY = "lstp-kriolu-progress-v1";
let done: string[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    done = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    done = [];
  }
}

export const krioluProgress = {
  get: () => {
    hydrate();
    return done;
  },
  complete(lessonId: string) {
    hydrate();
    if (done.includes(lessonId)) return;
    done = [...done, lessonId];
    try {
      localStorage.setItem(KEY, JSON.stringify(done));
    } catch {
      /* ignorar */
    }
    listeners.forEach((l) => l());
  },
};

const EMPTY: string[] = [];
export const useKrioluProgress = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    krioluProgress.get,
    () => EMPTY,
  );

/** Estado de cada lição no caminho: concluída, atual (a primeira por fazer) ou bloqueada. */
export function lessonStates(units: KrioluUnit[], completed: string[]) {
  const states = new Map<string, "completed" | "current" | "locked">();
  let currentGiven = false;
  for (const u of units)
    for (const l of u.lessons) {
      if (completed.includes(l.id)) states.set(l.id, "completed");
      else if (!currentGiven) {
        states.set(l.id, "current");
        currentGiven = true;
      } else states.set(l.id, "locked");
    }
  return states;
}
