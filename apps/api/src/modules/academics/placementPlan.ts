/** Merit and equal section placement. Same decision rules as the legacy page. */

export type GenderKey = "M" | "F" | "O";

export type SectionSeat = {
  id: number;
  gradeLevel: number;
  stream: string | null;
  section: string;
  maxCapacity: number;
  currentCount: number;
};

export type Candidate = {
  id: number;
  fullName: string;
  gender: GenderKey;
  avgMark: number;
  totalScore: number;
};

export type Placement = { studentId: number; sectionId: number };

export function genderKey(raw: string | null | undefined): GenderKey {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "m" || value === "male" || value === "ወንድ") return "M";
  if (value === "f" || value === "female" || value === "ሴት") return "F";
  return "O";
}

function compareSection(left: SectionSeat, right: SectionSeat): number {
  if (left.gradeLevel !== right.gradeLevel) return left.gradeLevel - right.gradeLevel;
  const leftStream = left.stream ?? "";
  const rightStream = right.stream ?? "";
  if (leftStream < rightStream) return -1;
  if (leftStream > rightStream) return 1;
  const section = left.section.localeCompare(right.section, undefined, { numeric: true, sensitivity: "base" });
  if (section !== 0) return section;
  return left.id - right.id;
}

function compareMerit(left: Candidate, right: Candidate): number {
  if (left.avgMark !== right.avgMark) return right.avgMark - left.avgMark;
  if (left.totalScore !== right.totalScore) return right.totalScore - left.totalScore;
  if (left.fullName < right.fullName) return -1;
  if (left.fullName > right.fullName) return 1;
  return left.id - right.id;
}

/** 0..n-1 then n-1..0, so both ends repeat. Three sections: A B C C B A. */
export function snakeIndex(index: number, count: number): number {
  if (count <= 1) return 0;
  const cycle = count * 2;
  const pos = index % cycle;
  if (pos < count) return pos;
  return cycle - 1 - pos;
}

type OpenSeat = SectionSeat & { free: number };

function openSeats(sections: SectionSeat[]): OpenSeat[] {
  return [...sections]
    .sort(compareSection)
    .map((seat) => ({ ...seat, free: Math.max(0, seat.maxCapacity - seat.currentCount) }));
}

export function planMerit(sections: SectionSeat[], candidates: Candidate[]): { placed: Placement[]; left: number } {
  const seats = openSeats(sections);
  const people = [...candidates].sort(compareMerit);
  const placed: Placement[] = [];
  for (const person of people) {
    const seat = seats.find((item) => item.free > 0);
    if (!seat) break;
    placed.push({ studentId: person.id, sectionId: seat.id });
    seat.free -= 1;
  }
  return { placed, left: people.length - placed.length };
}

export function planEqual(sections: SectionSeat[], candidates: Candidate[]): { placed: Placement[]; left: number } {
  const seats = openSeats(sections).map((seat) => ({ ...seat, load: seat.currentCount, quota: 0 }));
  const people = [...candidates].sort(compareMerit);
  const freeSum = seats.reduce((sum, seat) => sum + seat.free, 0);
  const take = Math.min(people.length, freeSum);
  if (seats.length === 0 || take === 0) return { placed: [], left: people.length };

  const chosen = people.slice(0, take);
  for (let n = 0; n < take; n += 1) {
    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < seats.length; index += 1) {
      const seat = seats[index];
      if (!seat || seat.quota >= seat.free) continue;
      const score = seat.load + seat.quota;
      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    }
    const winner = seats[best];
    if (!winner) break;
    winner.quota += 1;
  }

  const ordered = [
    ...chosen.filter((person) => person.gender === "M"),
    ...chosen.filter((person) => person.gender === "F"),
    ...chosen.filter((person) => person.gender === "O"),
  ];
  const placed: Placement[] = [];
  let cursor = 0;
  for (const person of ordered) {
    for (let guard = 0; guard < seats.length * 2; guard += 1) {
      const index = snakeIndex(cursor, seats.length);
      cursor += 1;
      const seat = seats[index];
      if (seat && seat.quota > 0) {
        seat.quota -= 1;
        placed.push({ studentId: person.id, sectionId: seat.id });
        break;
      }
    }
  }
  return { placed, left: people.length - placed.length };
}
