/**
 * Voz do navegador (Web Speech API) para ler as perguntas em voz alta.
 *
 * ⚠️ Só lê texto na LÍNGUA DA INTERFACE (português ou inglês). Palavras em Kriolu, Forro,
 * Angolar ou Lung'Ie nunca passam por aqui: uma voz automática inventaria a pronúncia
 * (AGENTS.md). A pronúncia dessas palavras virá de gravações de falantes nativos, aprovadas.
 *
 * Respeita as Definições: Som (geral) + "Ler as perguntas em voz alta".
 */
import type { TFunction } from "i18next";
import { settings } from "@/hooks/use-settings";

const LANG: Record<string, string> = { pt: "pt-PT", en: "en-GB" };

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.slice(0, 2);
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.replace("_", "-").startsWith(`${base}-`))
  );
}

export const speech = {
  supported,
  /** Lê `text` (interrompe o que estava a ler). `locale`: idioma da interface. */
  speak(text: string, locale: string) {
    if (!supported()) return;
    const prefs = settings.get();
    if (!prefs.sound || !prefs.voice) return;
    const lang = LANG[locale.slice(0, 2)] ?? "pt-PT";
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.rate = 0.95;
    synth.speak(u);
  },
  stop() {
    if (supported()) window.speechSynthesis.cancel();
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
