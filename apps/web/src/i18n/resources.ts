import amAuth from "@/locales/am/auth.json";
import amCommon from "@/locales/am/common.json";
import amDashboard from "@/locales/am/dashboard.json";
import amErrors from "@/locales/am/errors.json";
import amNav from "@/locales/am/nav.json";
import amSubjects from "@/locales/am/subjects.json";
import enAuth from "@/locales/en/auth.json";
import enCommon from "@/locales/en/common.json";
import enDashboard from "@/locales/en/dashboard.json";
import enErrors from "@/locales/en/errors.json";
import enNav from "@/locales/en/nav.json";
import enSubjects from "@/locales/en/subjects.json";

export const NAMESPACES = ["common", "auth", "nav", "dashboard", "subjects", "errors"] as const;

export const resources = {
  am: {
    common: amCommon,
    auth: amAuth,
    nav: amNav,
    dashboard: amDashboard,
    subjects: amSubjects,
    errors: amErrors,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    nav: enNav,
    dashboard: enDashboard,
    subjects: enSubjects,
    errors: enErrors,
  },
} as const;

export const LANGUAGES = ["am", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "am" || value === "en";
}
