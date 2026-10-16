export const DEPARTMENTS = [
  "Languages",
  "Mathematics",
  "Natural Science",
  "Social Science",
  "Aesthetics",
  "Vocational",
  "Physical Education",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

const WORDS: Record<Department, readonly string[]> = {
  Languages: ["english", "amharic", "oromo", "afaan", "language"],
  Mathematics: ["math"],
  "Natural Science": ["physics", "chemistry", "biology", "science", "integrated"],
  "Social Science": ["history", "geography", "civics", "economics", "social"],
  Aesthetics: ["art", "music", "drawing", "aesthetic"],
  Vocational: ["ict", "vocational", "garment", "wood", "electric"],
  "Physical Education": ["sport", "physical", "hpe"],
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const CRITERIA = [
  { key: "planning", max: 20 },
  { key: "delivery", max: 30 },
  { key: "assessment", max: 25 },
  { key: "punctuality", max: 15 },
  { key: "care", max: 10 },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export type SlotRef = {
  id: number;
  day: string;
  period: number;
  teacherId: number | null;
};

export function weekdayOf(isoDate: string): Weekday {
  return WEEKDAYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()] ?? "Monday";
}

export function subjectInDepartment(name: string, department: Department): boolean {
  const text = name.toLowerCase();
  if (department === "Natural Science" && text.includes("social")) return false;
  return WORDS[department].some((word) => text.includes(word));
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** True when either teacher would hold two classes in the same period after the exchange. */
export function swapBlocked(left: SlotRef, right: SlotRef, others: readonly SlotRef[]): boolean {
  if (left.id === right.id) return true;
  if (left.teacherId == null || right.teacherId == null) return true;
  const busy = (teacherId: number, day: string, period: number) =>
    others.some((row) => row.teacherId === teacherId && row.day === day && row.period === period);
  if (busy(right.teacherId, left.day, left.period)) return true;
  if (busy(left.teacherId, right.day, right.period)) return true;
  return false;
}

export type CoverBlock = "WRONG_DAY" | "SELF" | "COVER_BUSY";

export function coverBlocked(
  slot: SlotRef,
  substituteId: number,
  coverDate: string,
  timetable: readonly SlotRef[],
  covers: readonly { staffId: number; date: string; day: string; period: number }[],
): CoverBlock | null {
  if (weekdayOf(coverDate) !== slot.day) return "WRONG_DAY";
  if (slot.teacherId === substituteId) return "SELF";
  const teaching = timetable.some(
    (row) => row.teacherId === substituteId && row.day === slot.day && row.period === slot.period,
  );
  if (teaching) return "COVER_BUSY";
  const covering = covers.some(
    (row) => row.staffId === substituteId && row.date === coverDate && row.day === slot.day && row.period === slot.period,
  );
  if (covering) return "COVER_BUSY";
  return null;
}

/** Oldest free questions, in id order. Returns null when the bank cannot fill the paper. */
export function pickQuestions(ids: readonly number[], used: ReadonlySet<number>, count: number): number[] | null {
  if (!Number.isInteger(count) || count < 1) return null;
  const free = ids.filter((id) => !used.has(id)).sort((a, b) => a - b);
  if (free.length < count) return null;
  return free.slice(0, count);
}

export function coveragePercent(total: number, covered: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(Math.max(covered, 0), total) / total) * 100);
}

export function evaluationTotal(scores: Readonly<Record<string, number>>): { total: number; max: number } | null {
  const keys = Object.keys(scores);
  if (keys.length !== CRITERIA.length) return null;
  let total = 0;
  let max = 0;
  for (const item of CRITERIA) {
    if (!Object.prototype.hasOwnProperty.call(scores, item.key)) return null;
    const score = scores[item.key] ?? Number.NaN;
    if (!Number.isFinite(score) || score < 0 || score > item.max) return null;
    total += score;
    max += item.max;
  }
  return { total, max };
}

export type SyncApproval = "Pending" | "Approved" | "Rejected";

export function syncPlan<T extends { key: string }>(
  existing: readonly { key: string; approval: SyncApproval }[],
  incoming: readonly T[],
): { apply: (T & { exists: boolean })[]; conflicts: T[] } {
  const byKey = new Map<string, SyncApproval[]>();
  for (const row of existing) {
    const list = byKey.get(row.key) ?? [];
    list.push(row.approval);
    byKey.set(row.key, list);
  }
  const latest = new Map<string, T>();
  for (const row of incoming) latest.set(row.key, row);
  const apply: (T & { exists: boolean })[] = [];
  const conflicts: T[] = [];
  for (const row of latest.values()) {
    const states = byKey.get(row.key) ?? [];
    if (states.includes("Approved")) conflicts.push(row);
    else apply.push({ ...row, exists: states.length > 0 });
  }
  return { apply, conflicts };
}
