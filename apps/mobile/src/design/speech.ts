/**
 * Voz do telemóvel (expo-speech) para ler as perguntas em voz alta.
 *
 * ⚠️ Só lê texto na LÍNGUA DA INTERFACE (português ou inglês). Palavras em Kriolu, Forro,
 * Angolar ou Lung'Ie nunca passam por aqui: uma voz automática inventaria a pronúncia
 * (AGENTS.md). A pronúncia dessas palavras virá de gravações de falantes nativos, aprovadas.
 */
import * as Speech from "expo-speech";
import type { TFunction } from "i18next";
import { isSoundEnabled } from "./sound";

const LANG: Record<string, string> = { pt: "pt-PT", en: "en-GB" };

let enabled = true;
export const setVoiceEnabled = (on: boolean) => {
  enabled = on;
  if (!on) void Speech.stop();
};
export const isVoiceEnabled = () => enabled;

export const speech = {
  /** Lê `text` (interrompe o que estava a ler). `locale`: idioma da interface. */
  speak(text: string, locale: string) {
    if (!enabled || !isSoundEnabled()) return;
    try {
      void Speech.stop();
      Speech.speak(text, { language: LANG[locale.slice(0, 2)] ?? "pt-PT", rate: 0.95 });
    } catch {
      // Sem voz disponível: segue em silêncio.
    }
  },
  stop() {
    void Speech.stop();
  },
};

/** Frase a ler para uma pergunta do quiz (nunca inclui a palavra em Kriolu). */
export function questionSpeech(
  t: TFunction,
  q: { mode: "meaning" | "word"; prompt: string },
): string {
  return q.mode === "meaning"
    ? t("preview.speakWhatMeans")
    : t("preview.speakHowToSay", { word: q.prompt });
}
