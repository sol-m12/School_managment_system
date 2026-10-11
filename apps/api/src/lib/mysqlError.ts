export const ER_DUP_ENTRY = 1062;
export const ER_ROW_IS_REFERENCED = 1451;

/** MySQL errno from a mysql2 error, also when Drizzle wraps it in `cause`. */
export function mysqlErrno(error: unknown): number | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return undefined;
    const errno = (current as { errno?: unknown }).errno;
    if (typeof errno === "number") return errno;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}
