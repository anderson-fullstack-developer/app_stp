/**
 * Traduções da interface (as mesmas da web, em @stp/i18n). O idioma inicial é o do
 * telemóvel (português ou inglês); depois o utilizador pode mudar nas Definições.
 */
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, detectLocale, type Messages, resources } from "@stp/i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Messages };
  }
}

if (!i18n.isInitialized) {
  const device = getLocales().map((l) => l.languageTag);
  // "use" é o método da instância do i18next (não um hook do React).
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources,
    lng: detectLocale(device),
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
