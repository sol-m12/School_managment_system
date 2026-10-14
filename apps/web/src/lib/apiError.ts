import { AxiosError } from "axios";

/** Locale keys in the `errors` namespace. The API returns codes; the UI shows these. */
export type ErrorKey =
  | "invalidCredentials"
  | "rateLimited"
  | "validation"
  | "unauthorized"
  | "network"
  | "server"
  | "unknown"
  | "forbidden"
  | "subjectNotFound"
  | "subjectDuplicate"
  | "subjectInUse"
  | "accountInactive"
  | "notFound"
  | "usernameTaken"
  | "gradeNotFound"
  | "backupBlocked"
  | "classExists"
  | "gradeSectionExists"
  | "teacherAssigned"
  | "teacherInUse"
  | "classInUse"
  | "studentInUse"
  | "photoType"
  | "photoSize"
  | "placementGrade"
  | "placementNoSection"
  | "placementFull"
  | "placementNone"
  | "placementConflict"
  | "placementScope"
  | "teacherLimit"
  | "assignmentExists"
  | "scheduleNoClass"
  | "scheduleOverCapacity"
  | "scheduleTeacherWeek"
  | "scheduleTeacherDaily"
  | "scheduleSubjectDays"
  | "schedulePacking"
  | "scheduleUnsolved"
  | "scheduleMove"
  | "notAssigned"
  | "gradesLocked"
  | "gradesNoPlan"
  | "scoreOver"
  | "planNotFound"
  | "attendanceLocked"
  | "examNotFound"
  | "examPassword"
  | "examWeight"
  | "storeUnavailable"
  | "roleUnknown";

const CODE_TO_KEY: Record<string, ErrorKey> = {
  AUTH_INVALID_CREDENTIALS: "invalidCredentials",
  AUTH_RATE_LIMITED: "rateLimited",
  VALIDATION_ERROR: "validation",
  AUTH_UNAUTHORIZED: "unauthorized",
  AUTH_FORBIDDEN: "forbidden",
  INTERNAL_ERROR: "server",
  SUBJECT_NOT_FOUND: "subjectNotFound",
  SUBJECT_DUPLICATE: "subjectDuplicate",
  SUBJECT_IN_USE: "subjectInUse",
  AUTH_INACTIVE: "accountInactive",
  NOT_FOUND: "notFound",
  USERNAME_TAKEN: "usernameTaken",
  GRADE_NOT_FOUND: "gradeNotFound",
  BACKUP_BLOCKED: "backupBlocked",
  CLASS_EXISTS: "classExists",
  GRADE_SECTION_EXISTS: "gradeSectionExists",
  TEACHER_ASSIGNED: "teacherAssigned",
  TEACHER_IN_USE: "teacherInUse",
  CLASS_IN_USE: "classInUse",
  STUDENT_IN_USE: "studentInUse",
  PHOTO_TYPE: "photoType",
  PHOTO_SIZE: "photoSize",
  PLACEMENT_GRADE: "placementGrade",
  PLACEMENT_NO_SECTION: "placementNoSection",
  PLACEMENT_FULL: "placementFull",
  PLACEMENT_NONE: "placementNone",
  PLACEMENT_CONFLICT: "placementConflict",
  PLACEMENT_SCOPE: "placementScope",
  TEACHER_LIMIT: "teacherLimit",
  ASSIGNMENT_EXISTS: "assignmentExists",
  SCHEDULE_NO_CLASS: "scheduleNoClass",
  SCHEDULE_OVER_CAPACITY: "scheduleOverCapacity",
  SCHEDULE_TEACHER_WEEK: "scheduleTeacherWeek",
  SCHEDULE_TEACHER_DAILY: "scheduleTeacherDaily",
  SCHEDULE_SUBJECT_DAYS: "scheduleSubjectDays",
  SCHEDULE_PACKING: "schedulePacking",
  SCHEDULE_UNSOLVED: "scheduleUnsolved",
  SCHEDULE_MOVE: "scheduleMove",
  NOT_ASSIGNED: "notAssigned",
  GRADES_LOCKED: "gradesLocked",
  GRADES_NO_PLAN: "gradesNoPlan",
  SCORE_OVER: "scoreOver",
  PLAN_NOT_FOUND: "planNotFound",
  ATTENDANCE_LOCKED: "attendanceLocked",
  EXAM_NOT_FOUND: "examNotFound",
  EXAM_PASSWORD: "examPassword",
  EXAM_WEIGHT: "examWeight",
  STORE_UNAVAILABLE: "storeUnavailable",
  ROLE_UNKNOWN: "roleUnknown",
};

function readCode(data: unknown): string | null {
  if (typeof data === "object" && data !== null && "code" in data) {
    const code = (data as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

export function toErrorKey(error: unknown): ErrorKey {
  if (!(error instanceof AxiosError)) return "unknown";
  if (!error.response) return "network";

  const code = readCode(error.response.data);
  if (code && code in CODE_TO_KEY) return CODE_TO_KEY[code];
  if (error.response.status === 429) return "rateLimited";
  if (error.response.status >= 500) return "server";
  return "unknown";
}
