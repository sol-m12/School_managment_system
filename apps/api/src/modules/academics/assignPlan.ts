/** System teacher assignment. 24 credit-hour cap, experience base-share, then leftovers. */

export const TEACHER_HOUR_CAP = 24;

export type PoolTeacher = {
  id: number;
  experience: number;
  load: number;
};

export type AssignBlock = {
  subjectId: number;
  gradeLevel: number;
  section: string | null;
  creditHours: number;
};

export type PlannedAssignment = {
  staffId: number;
  block: AssignBlock;
};

export type AssignCategory = {
  teachers: PoolTeacher[];
  blocks: AssignBlock[];
};

/**
 * Teachers are shared objects. Hours given in an earlier category count toward later ones.
 * Phase 1 walks most experienced first and fills up to this category's base share.
 * Phase 2 walks least experienced first and keeps each teacher at or under 24 hours.
 */
export function planAutoAssign(categories: AssignCategory[]): PlannedAssignment[] {
  const placed: PlannedAssignment[] = [];
  for (const category of categories) {
    if (category.teachers.length === 0 || category.blocks.length === 0) continue;
    const byExperience = [...category.teachers].sort(
      (left, right) => right.experience - left.experience || left.id - right.id,
    );
    const total = category.blocks.reduce((sum, block) => sum + block.creditHours, 0);
    const baseShare = Math.floor(total / byExperience.length);
    const remaining = [...category.blocks];

    for (const teacher of byExperience) {
      for (let index = 0; index < remaining.length; ) {
        const block = remaining[index];
        if (block && teacher.load + block.creditHours <= baseShare) {
          teacher.load += block.creditHours;
          placed.push({ staffId: teacher.id, block });
          remaining.splice(index, 1);
        } else {
          index += 1;
        }
      }
    }

    const leastFirst = [...byExperience].sort(
      (left, right) => left.experience - right.experience || left.id - right.id,
    );
    for (const block of remaining) {
      const teacher = leastFirst.find((item) => item.load + block.creditHours <= TEACHER_HOUR_CAP);
      if (!teacher) continue;
      teacher.load += block.creditHours;
      placed.push({ staffId: teacher.id, block });
    }
  }
  return placed;
}
