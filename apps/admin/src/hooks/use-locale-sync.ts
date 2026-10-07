import { useEffect } from "react";
import { detectLocale, isAvailableLocale } from "@stp/i18n";
import i18n from "@/i18n";
import { useSettings } from "@/hooks/use-settings";

/** Aplica o idioma escolhido (ou o do dispositivo) à interface e ao atributo lang do documento. */
export function useLocaleSync() {
  const { locale } = useSettings();
  useEffect(() => {
    const next =
      locale && isAvailableLocale(locale) ? locale : detectLocale(navigator.languages ?? []);
    if (i18n.language !== next) void i18n.changeLanguage(next);
    document.documentElement.lang = next === "pt" ? "pt-PT" : next;
  }, [locale]);
}
