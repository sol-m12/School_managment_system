import amAdmin from "@/locales/am/admin.json";
import amAuth from "@/locales/am/auth.json";
import amCommon from "@/locales/am/common.json";
import amDashboard from "@/locales/am/dashboard.json";
import amErrors from "@/locales/am/errors.json";
import amHome from "@/locales/am/home.json";
import amNav from "@/locales/am/nav.json";
import amSubjects from "@/locales/am/subjects.json";
import amTeacher from "@/locales/am/teacher.json";
import amTechnician from "@/locales/am/technician.json";
import enAdmin from "@/locales/en/admin.json";
import enAuth from "@/locales/en/auth.json";
import enCommon from "@/locales/en/common.json";
import enDashboard from "@/locales/en/dashboard.json";
import enErrors from "@/locales/en/errors.json";
import enHome from "@/locales/en/home.json";
import enNav from "@/locales/en/nav.json";
import enSubjects from "@/locales/en/subjects.json";
import enTeacher from "@/locales/en/teacher.json";
import enTechnician from "@/locales/en/technician.json";

export const NAMESPACES = ["common", "auth", "nav", "dashboard", "subjects", "admin", "errors", "home", "teacher", "technician"] as const;

export const resources = {
  am: {
    common: amCommon,
    auth: amAuth,
    nav: amNav,
    dashboard: amDashboard,
    subjects: amSubjects,
    admin: amAdmin,
    errors: amErrors,
    home: amHome,
    teacher: amTeacher,
    technician: amTechnician,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    nav: enNav,
    dashboard: enDashboard,
    subjects: enSubjects,
    admin: enAdmin,
    errors: enErrors,
    home: enHome,
    teacher: enTeacher,
    technician: enTechnician,
  },
} as const;

export const LANGUAGES = ["am", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "am" || value === "en";
}
