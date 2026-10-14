import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { classes, grades, students, subjects } from "../../db/schema/index.js";
import { scoped } from "../../lib/tenant.js";
import { loadTeacherContext } from "./teacher.service.js";
import { buildRosterRows, type GradeHit, type RosterStudentView } from "./rosterRules.js";

export type OfficialRoster =
  | { allowed: false }
  | {
      allowed: true;
      academicYear: string;
      teacherName: string;
      classes: { id: number; label: string }[];
      classId: number;
      gradeLevel: number;
      section: string;
      stream: string;
      subjects: { id: number; name: string }[];
      showVocational: boolean;
      students: RosterStudentView[];
    };

export async function loadOfficialRoster(
  tenantId: number,
  userId: number,
  classId: number | undefined,
): Promise<OfficialRoster> {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) return { allowed: false };
  const rooms = await db
    .select({
      id: classes.classId,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      stream: classes.stream,
    })
    .from(classes)
    .where(scoped(classes, tenantId, eq(classes.classTeacherId, context.staffId)))
    .orderBy(asc(classes.gradeLevel), asc(classes.section));
  if (rooms.length === 0) return { allowed: false };
  const selected = rooms.find((room) => room.id === classId) ?? rooms[0];
  if (!selected) return { allowed: false };

  const subjectFilters = [eq(subjects.gradeLevel, selected.gradeLevel), eq(subjects.isVocational, 0)];
  if (selected.gradeLevel >= 11) {
    subjectFilters.push(
      selected.stream
        ? or(eq(subjects.stream, "Common"), eq(subjects.stream, selected.stream))!
        : eq(subjects.stream, "Common"),
    );
  }
  const subjectRows = await db
    .select({ id: subjects.subjectId, name: subjects.subjectName })
    .from(subjects)
    .where(scoped(subjects, tenantId, and(...subjectFilters)))
    .orderBy(asc(subjects.sortOrder), asc(subjects.subjectId));

  const people = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gender: students.gender,
      age: students.age,
      isTransfer: students.isTransfer,
      vocationalId: students.vocationalId,
    })
    .from(students)
    .where(
      scoped(
        students,
        tenantId,
        and(
          eq(students.academicYear, context.academicYear),
          eq(students.gradeLevel, selected.gradeLevel),
          eq(students.section, selected.section),
        ),
      ),
    )
    .orderBy(asc(students.fullName));

  const ids = people.map((person) => person.id);
  const gradeRows =
    ids.length === 0
      ? []
      : await db
          .select({
            studentId: grades.studentId,
            subjectId: grades.subjectId,
            semester: grades.semester,
            totalScore: sql<string>`sum(${grades.score})`,
            recorded: sql<number>`count(${grades.score})`,
          })
          .from(grades)
          .where(
            scoped(
              grades,
              tenantId,
              and(
                inArray(grades.studentId, ids),
                eq(grades.academicYear, context.academicYear),
                or(eq(grades.submissionStatus, "Submitted"), eq(grades.submissionStatus, "Approved")),
              ),
            ),
          )
          .groupBy(grades.studentId, grades.subjectId, grades.semester);

  const gradeMap = new Map<string, GradeHit>();
  for (const row of gradeRows) {
    gradeMap.set(`${row.studentId}:${row.subjectId}:${row.semester}`, {
      score: Number(row.totalScore ?? 0),
      recorded: Number(row.recorded) > 0,
    });
  }

  const vocationalIds = [...new Set(people.flatMap((person) => (person.vocationalId == null ? [] : [person.vocationalId])))];
  const vocationalNames = new Map<number, string>();
  if (vocationalIds.length > 0) {
    const named = await db
      .select({ id: subjects.subjectId, name: subjects.subjectName })
      .from(subjects)
      .where(scoped(subjects, tenantId, inArray(subjects.subjectId, vocationalIds)));
    for (const row of named) vocationalNames.set(row.id, row.name);
  }

  const built = buildRosterRows(
    selected.gradeLevel,
    subjectRows,
    people.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      gender: person.gender,
      age: person.age,
      isTransfer: person.isTransfer === 1,
      vocationalId: person.vocationalId,
    })),
    gradeMap,
    vocationalNames,
  );

  return {
    allowed: true,
    academicYear: context.academicYear,
    teacherName: context.teacherName,
    classes: rooms.map((room) => ({ id: room.id, label: `${room.gradeLevel}${room.section}` })),
    classId: selected.id,
    gradeLevel: selected.gradeLevel,
    section: selected.section,
    stream: selected.stream ?? "Common",
    subjects: subjectRows,
    showVocational: built.showVocational,
    students: built.students,
  };
}
