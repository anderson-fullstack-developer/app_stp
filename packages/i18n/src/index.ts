/**
 * Traduções da interface, partilhadas pela app web, painel e app mobile (Expo).
 * Formato de recursos compatível com i18next.
 */
import { en } from "./locales/en";
import { pt, type Messages } from "./locales/pt";

export type { Messages };
export { pt, en };

/** Idiomas da interface. `available: false` = aparece como "em breve". */
export const LOCALES = [
  { id: "pt", label: "Português", available: true },
  { id: "en", label: "English", available: true },
  { id: "fr", label: "Français", available: false },
] as const;

export type Locale = (typeof LOCALES)[number]["id"];
export type AvailableLocale = Extract<(typeof LOCALES)[number], { available: true }>["id"];

export const DEFAULT_LOCALE: AvailableLocale = "pt";

export const resources: Record<AvailableLocale, { translation: Messages }> = {
  pt: { translation: pt },
  en: { translation: en },
};

export const isAvailableLocale = (x: string): x is AvailableLocale =>
  LOCALES.some((l) => l.id === x && l.available);

/**
 * Escolhe o idioma da interface a partir das preferências do dispositivo (ex.: navigator.languages).
 * "en-US" → "en"; "pt-BR" → "pt"; sem correspondência → português.
 */
export function detectLocale(preferred: readonly string[]): AvailableLocale {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0] ?? "";
    if (isAvailableLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/**
 * Idioma da interface sugerido a partir das línguas que o utilizador diz falar.
 * Quem fala crioulos de base portuguesa usa a interface em português.
 */
export function localeFromSpoken(spoken: readonly string[]): AvailableLocale | null {
  for (const s of spoken) {
    if (isAvailableLocale(s)) return s;
    if (["kea", "forro", "angolar", "lungie"].includes(s)) return "pt";
  }
  return null;
}

/** Países para o registo (ids das chaves `countries.*`). */
export const COUNTRY_IDS = [
  "st",
  "cv",
  "pt",
  "br",
  "ao",
  "mz",
  "gw",
  "gq",
  "fr",
  "gb",
  "us",
  "nl",
  "lu",
  "es",
  "it",
  "ch",
  "de",
  "be",
  "other",
] as const;
export type CountryId = (typeof COUNTRY_IDS)[number];

/** Línguas que o utilizador pode dizer que fala (ids das chaves `spokenLanguages.*`). */
export const SPOKEN_LANGUAGE_IDS = [
  "pt",
  "en",
  "fr",
  "es",
  "kea",
  "forro",
  "angolar",
  "lungie",
  "other",
] as const;
export type SpokenLanguageId = (typeof SPOKEN_LANGUAGE_IDS)[number];
