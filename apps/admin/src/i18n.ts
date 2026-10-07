/**
 * Inicialização do i18next (interface em vários idiomas). As mensagens vivem em @stp/i18n,
 * partilhadas com a app mobile. O servidor renderiza em português; no cliente o idioma passa
 * para a escolha do utilizador (ou o idioma do dispositivo) — ver useLocaleSync.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, resources, type Messages } from "@stp/i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Messages };
  }
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false }, // o React já protege contra XSS
    returnNull: false,
  });
}

export default i18n;
