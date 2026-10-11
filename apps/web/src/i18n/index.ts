import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { NAMESPACES, isLanguage, resources, type Language } from "./resources";

export const LANGUAGE_STORAGE_KEY = "keyit.lang";
const DEFAULT_LANGUAGE: Language = "am";

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function applyLanguage(language: string): void {
  document.documentElement.lang = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage can be unavailable (private mode); the language still applies for this visit.
  }
}

i18n.on("languageChanged", applyLanguage);

void i18n.use(initReactI18next).init({
  resources,
  lng: readStoredLanguage(),
  fallbackLng: "en",
  supportedLngs: ["am", "en"],
  ns: NAMESPACES,
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyLanguage(i18n.language);

export { i18n };
