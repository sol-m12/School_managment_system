import amAdmin from "@/locales/am/admin.json";
import amAuth from "@/locales/am/auth.json";
import amCommon from "@/locales/am/common.json";
import amDashboard from "@/locales/am/dashboard.json";
import amErrors from "@/locales/am/errors.json";
import amHome from "@/locales/am/home.json";
import amNav from "@/locales/am/nav.json";
import amSubjects from "@/locales/am/subjects.json";
import amOperations from "@/locales/am/operations.json";
import amPrincipal from "@/locales/am/principal.json";
import amVice from "@/locales/am/vice.json";
import amOffice from "@/locales/am/office.json";
import amRecords from "@/locales/am/records.json";
import amLibrary from "@/locales/am/library.json";
import amProcurement from "@/locales/am/procurement.json";
import amSecretary from "@/locales/am/secretary.json";
import amStore from "@/locales/am/store.json";
import amStudent from "@/locales/am/student.json";
import amTeacher from "@/locales/am/teacher.json";
import amTechnician from "@/locales/am/technician.json";
import amPlatform from "@/locales/am/platform.json";
import amParents from "@/locales/am/parents.json";
import amClubs from "@/locales/am/clubs.json";
import amLostfound from "@/locales/am/lostfound.json";
import amForum from "@/locales/am/forum.json";
import amScholarships from "@/locales/am/scholarships.json";
import enAdmin from "@/locales/en/admin.json";
import enAuth from "@/locales/en/auth.json";
import enCommon from "@/locales/en/common.json";
import enDashboard from "@/locales/en/dashboard.json";
import enErrors from "@/locales/en/errors.json";
import enHome from "@/locales/en/home.json";
import enNav from "@/locales/en/nav.json";
import enSubjects from "@/locales/en/subjects.json";
import enOperations from "@/locales/en/operations.json";
import enPrincipal from "@/locales/en/principal.json";
import enVice from "@/locales/en/vice.json";
import enOffice from "@/locales/en/office.json";
import enRecords from "@/locales/en/records.json";
import enLibrary from "@/locales/en/library.json";
import enProcurement from "@/locales/en/procurement.json";
import enSecretary from "@/locales/en/secretary.json";
import enStore from "@/locales/en/store.json";
import enStudent from "@/locales/en/student.json";
import enTeacher from "@/locales/en/teacher.json";
import enTechnician from "@/locales/en/technician.json";
import enPlatform from "@/locales/en/platform.json";
import enParents from "@/locales/en/parents.json";
import enClubs from "@/locales/en/clubs.json";
import enLostfound from "@/locales/en/lostfound.json";
import enForum from "@/locales/en/forum.json";
import enScholarships from "@/locales/en/scholarships.json";

export const NAMESPACES = ["common", "auth", "nav", "dashboard", "subjects", "admin", "errors", "home", "teacher", "technician", "student", "store", "operations", "principal", "vice", "office", "records", "library", "procurement", "secretary", "platform", "parents", "clubs", "lostfound", "forum", "scholarships"] as const;

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
    student: amStudent,
    store: amStore,
    operations: amOperations,
    principal: amPrincipal,
    vice: amVice,
    office: amOffice,
    records: amRecords,
    library: amLibrary,
    procurement: amProcurement,
    secretary: amSecretary,
    platform: amPlatform,
    parents: amParents,
    clubs: amClubs,
    lostfound: amLostfound,
    forum: amForum,
    scholarships: amScholarships,
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
    student: enStudent,
    store: enStore,
    operations: enOperations,
    principal: enPrincipal,
    vice: enVice,
    office: enOffice,
    records: enRecords,
    library: enLibrary,
    procurement: enProcurement,
    secretary: enSecretary,
    platform: enPlatform,
    parents: enParents,
    clubs: enClubs,
    lostfound: enLostfound,
    forum: enForum,
    scholarships: enScholarships,
  },
} as const;

export const LANGUAGES = ["am", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "am" || value === "en";
}
