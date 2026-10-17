/** Library rules. Suggestions use marks and teacher titles. They are not a trained model. */

export const LOAN_DAYS = 14;

export type LoanStatus = "Borrowed" | "Returned";
export type SuggestReason = "teacher" | "weak" | "grade";
export type BadgeRank = "member" | "scholar";
export type ReminderKind = "due" | "overdue";

export function addDays(today: string, days: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function copiesFree(quantity: number, borrowed: number): number {
  return Math.max(0, quantity - borrowed);
}

export function checkoutBlock(
  free: number,
  alreadyOut: boolean,
  patronOverdue: boolean,
): "NONE_LEFT" | "ALREADY_OUT" | "OVERDUE" | null {
  if (free <= 0) return "NONE_LEFT";
  if (alreadyOut) return "ALREADY_OUT";
  if (patronOverdue) return "OVERDUE";
  return null;
}

export function reserveBlock(free: number, alreadyReserved: boolean): "COPIES_FREE" | "ALREADY_RESERVED" | null {
  if (free > 0) return "COPIES_FREE";
  if (alreadyReserved) return "ALREADY_RESERVED";
  return null;
}

export function reminderKind(due: string | null, today: string): ReminderKind | null {
  if (!due || due > today) return null;
  return due === today ? "due" : "overdue";
}

export function isOverdue(status: LoanStatus, due: string | null, today: string): boolean {
  return status === "Borrowed" && due != null && due < today;
}

export function clearanceBlock(openLoans: number): "BOOKS_OUT" | null {
  return openLoans > 0 ? "BOOKS_OUT" : null;
}

export function intakeBlock(stock: number, copies: number): "INSUFFICIENT_STOCK" | null {
  if (!Number.isInteger(copies) || copies < 1 || copies > stock) return "INSUFFICIENT_STOCK";
  return null;
}

export function entryBlock(last: "In" | "Out" | null, action: "In" | "Out"): "NOT_INSIDE" | "ALREADY_INSIDE" | null {
  if (action === "Out" && last !== "In") return "NOT_INSIDE";
  if (action === "In" && last === "In") return "ALREADY_INSIDE";
  return null;
}

export function ranksFor(points: number): BadgeRank[] {
  const ranks: BadgeRank[] = [];
  if (points >= 20) ranks.push("member");
  if (points >= 50) ranks.push("scholar");
  return ranks;
}

export function patronCode(tenantId: number, studentId: number): string {
  return `KEYT-${tenantId}-${studentId}`;
}

export function readPatronCode(code: string): { tenantId: number; studentId: number } | null {
  const match = /^KEYT-(\d+)-(\d+)$/.exec(code.trim());
  if (!match) return null;
  return { tenantId: Number(match[1]), studentId: Number(match[2]) };
}

export function suggestBooks(
  books: readonly { id: number; title: string; subjectId: number | null; gradeLevel: number | null }[],
  weakSubjectIds: readonly number[],
  grade: number,
  teacherTitles: readonly string[],
): { id: number; reason: SuggestReason }[] {
  const titles = new Set(teacherTitles.map((title) => title.trim().toLowerCase()));
  const weak = new Set(weakSubjectIds);
  return books
    .map((book) => {
      const teacher = titles.has(book.title.trim().toLowerCase());
      const subject = book.subjectId != null && weak.has(book.subjectId);
      const sameGrade = book.gradeLevel === grade;
      const reason: SuggestReason | null = teacher ? "teacher" : subject ? "weak" : sameGrade ? "grade" : null;
      const score = teacher ? 3 : subject ? 2 : sameGrade ? 1 : 0;
      return { id: book.id, reason, score };
    })
    .filter((row): row is { id: number; reason: SuggestReason; score: number } => row.reason != null)
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, 5)
    .map(({ id, reason }) => ({ id, reason }));
}
