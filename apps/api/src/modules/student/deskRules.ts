/**
 * Career and Technical Education in the current Ethiopian general-education curriculum.
 * Grades 1–6 have no vocational placement.
 * Grades 7–8 explore the fields and cannot lock a trade.
 * Grades 9–10 choose one vocational subject offered at that grade.
 * Grades 11–12 continue that same skill and cannot start a different trade.
 */
export type VocationalBand = "none" | "explore" | "choose" | "continue";

export type CurriculumBlock =
  | "GRADE_CLOSED"
  | "EXPLORE_ONLY"
  | "CONTINUE_ONLY"
  | "ALREADY_CHOSEN"
  | "NOT_IN_CURRICULUM"
  | "WRONG_GRADE";

export function vocationalBand(grade: number): VocationalBand {
  if (grade >= 7 && grade <= 8) return "explore";
  if (grade >= 9 && grade <= 10) return "choose";
  if (grade >= 11 && grade <= 12) return "continue";
  return "none";
}

export function tradeMatches(trade: string, subjectName: string): boolean {
  return trade.trim().toLowerCase() === subjectName.trim().toLowerCase();
}

export function chooseBlock(band: VocationalBand, alreadyChosen: boolean, offered: boolean): CurriculumBlock | null {
  if (band === "none") return "GRADE_CLOSED";
  if (band === "explore") return "EXPLORE_ONLY";
  if (band === "continue") return "CONTINUE_ONLY";
  if (alreadyChosen) return "ALREADY_CHOSEN";
  if (!offered) return "NOT_IN_CURRICULUM";
  return null;
}

export function placementBlock(input: {
  studentGrade: number;
  programGrade: number | null;
  trade: string;
  curriculumNames: readonly string[];
  currentSkill: string | null;
}): CurriculumBlock | null {
  const band = vocationalBand(input.studentGrade);
  if (band === "none") return "GRADE_CLOSED";
  if (band === "explore") return "EXPLORE_ONLY";
  if (input.programGrade !== input.studentGrade) return "WRONG_GRADE";
  const known = input.curriculumNames.some((name) => tradeMatches(input.trade, name));
  if (!known) return "NOT_IN_CURRICULUM";
  if (band === "continue" && (!input.currentSkill || !tradeMatches(input.trade, input.currentSkill))) return "CONTINUE_ONLY";
  if (band === "choose" && input.currentSkill && !tradeMatches(input.trade, input.currentSkill)) return "ALREADY_CHOSEN";
  return null;
}

export function programGradeBlock(grade: number | null): "GRADE_CLOSED" | null {
  if (grade == null || grade < 7 || grade > 12) return "GRADE_CLOSED";
  return null;
}

export function libraryPoints(visits: number, returned: number, late: number): number {
  return Math.max(0, visits * 2 + returned * 10 - late * 5);
}

export type LibraryRank = "reader" | "member" | "scholar";

export function libraryRank(points: number): LibraryRank {
  if (points >= 50) return "scholar";
  if (points >= 20) return "member";
  return "reader";
}

export function documentBlock(grade: number, openRequest: boolean): "GRADE_CLOSED" | "ALREADY_OPEN" | null {
  if (grade !== 12) return "GRADE_CLOSED";
  if (openRequest) return "ALREADY_OPEN";
  return null;
}

export function homeworkBlock(deadline: string | null, nowIso: string, submitted: boolean): "DEADLINE" | "ALREADY_SUBMITTED" | null {
  if (submitted) return "ALREADY_SUBMITTED";
  if (deadline && deadline.slice(0, 19) < nowIso.slice(0, 19)) return "DEADLINE";
  return null;
}

export type StudyReason = "weak" | "absent";

export function studyPlan(
  rows: readonly { name: string; average: number | null; absences: number }[],
): { subject: string; reason: StudyReason; minutes: number }[] {
  const weak = rows
    .filter((row) => row.average != null && row.average < 50)
    .map((row) => ({ subject: row.name, reason: "weak" as const, minutes: 40 }));
  const missed = rows
    .filter((row) => row.absences >= 3 && !weak.some((item) => item.subject === row.name))
    .map((row) => ({ subject: row.name, reason: "absent" as const, minutes: 30 }));
  return [...weak, ...missed].slice(0, 5);
}
