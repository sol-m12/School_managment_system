import { isEthiopianYear } from "../../lib/academicYear.js";

export const QUEUE = ["Submitted", "Reviewing", "Ready", "Collected"] as const;
export type QueueStatus = (typeof QUEUE)[number];

export type OverrideState = "none" | "Pending" | "Granted" | "Applied" | "Refused";

export type ImportRow = {
  fullName: string;
  gender: "M" | "F";
  age: number;
  gradeLevel: number;
  section: string;
  academicYear: string;
};

export type ImportBlock = "EXCEL_SAVE_AS_CSV" | "PDF_FILE" | "IMPORT_EMPTY" | "IMPORT_FORMAT";

export function nextQueue(status: string): "Reviewing" | "Ready" | "Collected" | null {
  if (status === "Submitted") return "Reviewing";
  if (status === "Reviewing") return "Ready";
  if (status === "Ready") return "Collected";
  return null;
}

/** The department head must send an approved mark. Sending does not accept it. */
export function acceptAllowed(gradeStatus: string | null, review: string | null): boolean {
  return gradeStatus === "Approved" && review === "Sent";
}

/** An accepted mark changes only after the principal grants that request. A lock uses the same grant. */
export function correctionAllowed(input: {
  gradeStatus: string | null;
  override: OverrideState;
}): "NOT_ACCEPTED" | "OVERRIDE_REQUIRED" | null {
  if (input.gradeStatus !== "Accepted") return "NOT_ACCEPTED";
  if (input.override !== "Granted") return "OVERRIDE_REQUIRED";
  return null;
}

export function unlockAllowed(
  lock: "Locked" | "Unlocked" | "none",
  override: OverrideState,
): "NOT_FOUND" | "OVERRIDE_REQUIRED" | null {
  if (lock !== "Locked") return "NOT_FOUND";
  if (override !== "Granted") return "OVERRIDE_REQUIRED";
  return null;
}

export function alumniAllowed(grade: number, already: boolean): "NOT_GRADUATE" | "ALREADY_ALUMNI" | null {
  if (grade !== 12) return "NOT_GRADUATE";
  if (already) return "ALREADY_ALUMNI";
  return null;
}

export function scoreAllowed(score: number, maxScore: number): boolean {
  return Number.isFinite(score) && score >= 0 && score <= maxScore;
}

function rowOf(record: Record<string, unknown>): ImportRow | null {
  const fullName = String(record.fullName ?? record.fullname ?? "").trim();
  const gender = String(record.gender ?? "").trim().toUpperCase();
  const age = Number(record.age);
  const gradeLevel = Number(record.gradeLevel ?? record.grade);
  const section = String(record.section ?? "").trim();
  const academicYear = String(record.academicYear ?? record.year ?? "").trim();
  if (!fullName || fullName.length > 255) return null;
  if (gender !== "M" && gender !== "F") return null;
  if (!Number.isInteger(age) || age < 1 || age > 99) return null;
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) return null;
  if (!section || section.length > 10) return null;
  if (!isEthiopianYear(academicYear)) return null;
  return { fullName, gender, age, gradeLevel, section, academicYear };
}

function csvRows(text: string): ImportRow[] | ImportBlock {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return "IMPORT_EMPTY";
  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  const index = (name: string) => header.indexOf(name);
  if (index("fullname") < 0 || index("gender") < 0) return "IMPORT_FORMAT";
  const rows: ImportRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((cell) => cell.trim());
    const row = rowOf({
      fullName: cells[index("fullname")] ?? "",
      gender: cells[index("gender")] ?? "",
      age: cells[index("age")] ?? "",
      gradeLevel: cells[index("gradelevel")] ?? cells[index("grade")] ?? "",
      section: cells[index("section")] ?? "",
      academicYear: cells[index("academicyear")] ?? cells[index("year")] ?? "",
    });
    if (!row) return "IMPORT_FORMAT";
    rows.push(row);
  }
  return uniqueRows(rows);
}

function uniqueRows(rows: ImportRow[]): ImportRow[] | ImportBlock {
  if (rows.length === 0) return "IMPORT_EMPTY";
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.fullName}|${row.gradeLevel}|${row.section}|${row.academicYear}`.toLowerCase();
    if (seen.has(key)) return "IMPORT_FORMAT";
    seen.add(key);
  }
  return rows;
}

export function parseImport(kind: "csv" | "structured" | "excel" | "pdf", text: string): ImportRow[] | ImportBlock {
  if (kind === "excel") return "EXCEL_SAVE_AS_CSV";
  if (kind === "pdf") return "PDF_FILE";
  if (kind === "csv") return csvRows(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "IMPORT_FORMAT";
  }
  if (!Array.isArray(parsed)) return "IMPORT_FORMAT";
  const rows: ImportRow[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return "IMPORT_FORMAT";
    const row = rowOf(item as Record<string, unknown>);
    if (!row) return "IMPORT_FORMAT";
    rows.push(row);
  }
  return uniqueRows(rows);
}

export function markSummary(scores: { score: number; maxScore: number }[]): string {
  if (scores.length === 0) return "";
  const total = scores.reduce((sum, row) => sum + (row.maxScore === 0 ? 0 : (row.score / row.maxScore) * 100), 0);
  const average = Math.round((total / scores.length) * 100) / 100;
  return `${scores.length} accepted, average ${average}`;
}
