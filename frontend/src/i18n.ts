import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

const supportedLanguage = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en")
  ? "en"
  : "en";

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: supportedLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;