/**
 * Mark, rank, and promotion rules copied from legacy generate_report.php.
 * The roster table and the report card both read this result.
 */

export type GradeHit = { score: number; recorded: boolean };

export type RosterSubject = { id: number; name: string };

export type RosterStudentInput = {
  id: number;
  fullName: string;
  gender: string;
  age: number | null;
  isTransfer: boolean;
  vocationalId: number | null;
};

export type TermView = {
  incomplete: boolean;
  marks: string[];
  vocational: string | null;
  total: string;
  average: string;
  rank: string;
};

export type CardSubject = { name: string; first: string; second: string; average: string };

export type RosterStudentView = {
  id: number;
  fullName: string;
  sex: string;
  age: string;
  transfer: boolean;
  remark: "Promoted" | "Detained" | "Pending" | "Incomplete";
  yearRemark: "Promoted" | "Detained" | "Incomplete";
  yearAverage: number;
  sem1: TermView;
  sem2: TermView;
  year: TermView;
  cardSubjects: CardSubject[];
  cardTotals: {
    firstTotal: string;
    secondTotal: string;
    yearTotal: string;
    firstAverage: string;
    secondAverage: string;
    yearAverage: string;
    firstRank: string;
    secondRank: string;
    yearRank: string;
  };
};

type Summary = { total: number; average: number; complete: boolean };

function hitKey(studentId: number, subjectId: number, semester: "1" | "2"): string {
  return `${studentId}:${subjectId}:${semester}`;
}

function oneDecimal(value: number): string {
  return value.toFixed(1);
}

function rounded(value: number): string {
  return String(Math.round(value));
}

function rankPosition(studentId: number, values: Map<number, number>, blank: boolean): number {
  if (blank) return -1;
  const mine = values.get(studentId);
  if (mine == null || mine < 0) return -1;
  const ordered = [...values.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0]);
  let rank = 1;
  for (const [id, average] of ordered) {
    if (id === studentId) return rank;
    if (average >= 0) rank += 1;
  }
  return -1;
}

function yearRemark(complete: boolean, average: number, failCount: number): RosterStudentView["yearRemark"] {
  if (!complete) return "Incomplete";
  const promoted =
    (failCount === 0 && average >= 50) ||
    (failCount === 1 && average >= 51) ||
    (failCount === 2 && average >= 53) ||
    (failCount === 3 && average >= 55);
  return promoted ? "Promoted" : "Detained";
}

function markCell(hit: GradeHit, anyRecorded: boolean): string {
  if (hit.recorded) return oneDecimal(hit.score);
  return anyRecorded ? "!" : "-";
}

function cardMark(hit: GradeHit): string {
  return hit.recorded ? oneDecimal(hit.score) : "-";
}

export function buildRosterRows(
  gradeLevel: number,
  subjects: readonly RosterSubject[],
  students: readonly RosterStudentInput[],
  grades: ReadonlyMap<string, GradeHit>,
  vocationalNames: ReadonlyMap<number, string>,
): { showVocational: boolean; students: RosterStudentView[] } {
  const showVocational = gradeLevel >= 11;
  const rankData: Record<"1" | "2" | "Year", Map<number, number>> = {
    "1": new Map(),
    "2": new Map(),
    Year: new Map(),
  };
  const summaries = new Map<number, { "1": Summary; "2": Summary; Year: Summary; both: boolean }>();

  for (const student of students) {
    let yearSum = 0;
    let both = true;
    const bySem = {} as { "1": Summary; "2": Summary };
    for (const semester of ["1", "2"] as const) {
      let total = 0;
      let recorded = 0;
      const expected = subjects.length + (showVocational && student.vocationalId ? 1 : 0);
      for (const subject of subjects) {
        const cell = grades.get(hitKey(student.id, subject.id, semester)) ?? { score: 0, recorded: false };
        if (cell.recorded) {
          total += cell.score;
          recorded += 1;
        }
      }
      if (showVocational && student.vocationalId) {
        const cell = grades.get(hitKey(student.id, student.vocationalId, semester)) ?? { score: 0, recorded: false };
        if (cell.recorded) {
          total += cell.score;
          recorded += 1;
        }
      }
      const complete = recorded === expected && expected > 0;
      if (complete) {
        const average = total / expected;
        rankData[semester].set(student.id, semester === "1" && student.isTransfer ? -1 : average);
        yearSum += average;
      } else {
        rankData[semester].set(student.id, -1);
        both = false;
      }
      bySem[semester] = { total, average: complete ? total / expected : 0, complete };
    }
    const year: Summary = {
      total: (bySem["1"].total + bySem["2"].total) / 2,
      average: both ? yearSum / 2 : 0,
      complete: both,
    };
    rankData.Year.set(student.id, both ? yearSum / 2 : -1);
    summaries.set(student.id, { "1": bySem["1"], "2": bySem["2"], Year: year, both });
  }

  const rows = students.map((student) => {
    const summary = summaries.get(student.id)!;
    const firstRank = rankPosition(student.id, rankData["1"], student.isTransfer);
    const secondRank = rankPosition(student.id, rankData["2"], false);
    const yearRank = rankPosition(student.id, rankData.Year, false);

    let failCount = 0;
    const read = (subjectId: number, semester: "1" | "2"): GradeHit =>
      grades.get(hitKey(student.id, subjectId, semester)) ?? { score: 0, recorded: false };
    const watched = [
      ...subjects.map((subject) => subject.id),
      ...(showVocational && student.vocationalId ? [student.vocationalId] : []),
    ];
    const anyFirst = watched.some((subjectId) => read(subjectId, "1").recorded);
    const anySecond = watched.some((subjectId) => read(subjectId, "2").recorded);
    const firstMarks: string[] = [];
    const secondMarks: string[] = [];
    const yearMarks: string[] = [];
    const cardSubjects: CardSubject[] = [];

    for (const subject of subjects) {
      const first = read(subject.id, "1");
      const second = read(subject.id, "2");
      firstMarks.push(markCell(first, anyFirst));
      secondMarks.push(markCell(second, anySecond));
      yearMarks.push(summary.Year.complete ? oneDecimal((first.score + second.score) / 2) : "");
      if (summary.Year.complete && (first.score + second.score) / 2 < 50) failCount += 1;
      const bothRecorded = first.recorded && second.recorded;
      cardSubjects.push({
        name: subject.name,
        first: cardMark(first),
        second: cardMark(second),
        average: bothRecorded ? oneDecimal((first.score + second.score) / 2) : "-",
      });
    }

    let vocationalFirst = "";
    let vocationalSecond = "";
    let vocationalYear = "";
    let cardVocational: CardSubject | null = null;
    if (showVocational) {
      if (student.vocationalId) {
        const first = read(student.vocationalId, "1");
        const second = read(student.vocationalId, "2");
        vocationalFirst = markCell(first, anyFirst);
        vocationalSecond = markCell(second, anySecond);
        vocationalYear = summary.Year.complete ? oneDecimal((first.score + second.score) / 2) : "";
        if (summary.Year.complete && (first.score + second.score) / 2 < 50) failCount += 1;
        const bothRecorded = first.recorded && second.recorded;
        cardVocational = {
          name: vocationalNames.get(student.vocationalId) ?? "Vocational",
          first: cardMark(first),
          second: cardMark(second),
          average: bothRecorded ? oneDecimal((first.score + second.score) / 2) : "-",
        };
      } else {
        vocationalFirst = "-";
        vocationalSecond = "-";
        vocationalYear = "";
      }
    }

    const stored = yearRemark(summary.Year.complete, summary.Year.average, failCount);
    const remark: RosterStudentView["remark"] = summary.Year.complete
      ? stored
      : !summary["2"].complete && student.isTransfer && anyFirst
        ? "Pending"
        : summary["1"].complete
          ? "Pending"
          : "Incomplete";

    const showFirst = student.isTransfer ? anyFirst : summary["1"].complete;
    const term = (
      incomplete: boolean,
      marks: string[],
      vocational: string,
      summaryRow: Summary,
      rank: number,
      shown: boolean,
    ): TermView => ({
      incomplete,
      marks,
      vocational: showVocational ? vocational : null,
      total: shown ? rounded(summaryRow.total) : "",
      average: shown ? oneDecimal(summaryRow.average) : "",
      rank: shown && rank > 0 ? String(rank) : "",
    });

    const rankText = (rank: number) => (rank > 0 ? String(rank) : "-");

    return {
      id: student.id,
      fullName: student.fullName,
      sex: student.gender.charAt(0),
      age: student.age == null ? "-" : String(student.age),
      transfer: student.isTransfer,
      remark,
      yearRemark: stored,
      yearAverage: summary.Year.average,
      sem1: term(
        !summary["1"].complete && anyFirst && !student.isTransfer,
        firstMarks,
        vocationalFirst,
        summary["1"],
        firstRank,
        showFirst,
      ),
      sem2: term(!summary["2"].complete && anySecond, secondMarks, vocationalSecond, summary["2"], secondRank, summary["2"].complete),
      year: {
        incomplete: false,
        marks: yearMarks,
        vocational: showVocational ? vocationalYear : null,
        total: summary.Year.complete ? rounded(summary.Year.total) : "",
        average: summary.Year.complete ? oneDecimal(summary.Year.average) : "",
        rank: summary.Year.complete && yearRank > 0 ? String(yearRank) : "",
      },
      cardSubjects: cardVocational ? [...cardSubjects, cardVocational] : cardSubjects,
      cardTotals: {
        firstTotal: rounded(summary["1"].total),
        secondTotal: rounded(summary["2"].total),
        yearTotal: rounded(summary.Year.total),
        firstAverage: oneDecimal(summary["1"].average),
        secondAverage: oneDecimal(summary["2"].average),
        yearAverage: oneDecimal(summary.Year.average),
        firstRank: rankText(firstRank),
        secondRank: rankText(secondRank),
        yearRank: rankText(yearRank),
      },
    };
  });

  return { showVocational, students: rows };
}
