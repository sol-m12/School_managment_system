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
  | "backupBlocked";

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
