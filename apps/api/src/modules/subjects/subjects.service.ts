import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import type { AnyMySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";
import { db } from "../../db/index.js";
import {
  annualLessonPlan,
  attendance,
  classSchedule,
  grades,
  groupTasks,
  groupsInfo,
  libraryBooks,
  liveQuizQuestions,
  onlineExams,
  staff,
  studentAssessments,
  studentGroups,
  subjectWeightings,
  subjects,
  teacherAssignments,
  vocationalRequests,
} from "../../db/schema/index.js";
import { ER_DUP_ENTRY, ER_ROW_IS_REFERENCED, mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type { SubjectInput } from "./subjects.schema.js";

export type SubjectErrorCode = "SUBJECT_NOT_FOUND" | "SUBJECT_DUPLICATE" | "SUBJECT_IN_USE";

export class SubjectError extends Error {
  constructor(readonly code: SubjectErrorCode) {
    super(code);
    this.name = "SubjectError";
  }
}

export type SubjectView = {
  id: number;
  subjectName: string;
  gradeLevel: number;
  stream: "Common" | "Natural" | "Social";
  creditHours: number;
  isVocational: boolean;
  sortOrder: number | null;
};

export type SubjectPage = {
  rows: SubjectView[];
  total: number;
  page: number;
  pageSize: number;
};

type SubjectReference = {
  table: MySqlTable;
  tenantId: AnyMySqlColumn;
  subjectId: AnyMySqlColumn;
};

/**
 * Every column that points at subjects.subject_id. Only the four marked FK have a
 * database foreign key; the rest are checked here only, so keep this list complete.
 */
export const SUBJECT_REFERENCES: readonly SubjectReference[] = [
  { table: annualLessonPlan, tenantId: annualLessonPlan.tenantId, subjectId: annualLessonPlan.subjectId },
  { table: attendance, tenantId: attendance.tenantId, subjectId: attendance.subjectId },
  { table: classSchedule, tenantId: classSchedule.tenantId, subjectId: classSchedule.subjectId },
  { table: grades, tenantId: grades.tenantId, subjectId: grades.subjectId },
  { table: groupsInfo, tenantId: groupsInfo.tenantId, subjectId: groupsInfo.subjectId }, // FK
  { table: groupTasks, tenantId: groupTasks.tenantId, subjectId: groupTasks.subjectId }, // FK
  { table: libraryBooks, tenantId: libraryBooks.tenantId, subjectId: libraryBooks.subjectId },
  { table: liveQuizQuestions, tenantId: liveQuizQuestions.tenantId, subjectId: liveQuizQuestions.subjectId },
  { table: onlineExams, tenantId: onlineExams.tenantId, subjectId: onlineExams.subjectId }, // FK
  { table: staff, tenantId: staff.tenantId, subjectId: staff.subjectId },
  { table: studentAssessments, tenantId: studentAssessments.tenantId, subjectId: studentAssessments.subjectId },
  { table: studentGroups, tenantId: studentGroups.tenantId, subjectId: studentGroups.subjectId }, // FK
  { table: subjectWeightings, tenantId: subjectWeightings.tenantId, subjectId: subjectWeightings.subjectId },
  { table: teacherAssignments, tenantId: teacherAssignments.tenantId, subjectId: teacherAssignments.subjectId },
  { table: vocationalRequests, tenantId: vocationalRequests.tenantId, subjectId: vocationalRequests.subjectId },
  { table: subjects, tenantId: subjects.tenantId, subjectId: subjects.parentSubjectId },
];

const subjectColumns = {
  id: subjects.subjectId,
  subjectName: subjects.subjectName,
  gradeLevel: subjects.gradeLevel,
  stream: subjects.stream,
  creditHours: subjects.creditHours,
  isVocational: subjects.isVocational,
  sortOrder: subjects.sortOrder,
};

type SubjectRow = {
  id: number;
  subjectName: string;
  gradeLevel: number;
  stream: SubjectView["stream"];
  creditHours: number;
  isVocational: number | null;
  sortOrder: number | null;
};

function toView(row: SubjectRow): SubjectView {
  return { ...row, isVocational: row.isVocational === 1 };
}

/** Only the columns the legacy form edits. teacher_id, full_mark, is_offered and parent_subject_id are never written. */
function toColumns(input: SubjectInput) {
  return {
    subjectName: input.subjectName,
    gradeLevel: input.gradeLevel,
    stream: input.stream,
    creditHours: input.creditHours,
    isVocational: input.isVocational ? 1 : 0,
    sortOrder: input.sortOrder,
  };
}

export async function listSubjects(
  tenantId: number,
  page: number,
  pageSize: number,
): Promise<SubjectPage> {
  const [rows, [totalRow]] = await Promise.all([
    db
      .select(subjectColumns)
      .from(subjects)
      .where(scoped(subjects, tenantId))
      .orderBy(asc(subjects.gradeLevel), asc(subjects.sortOrder), asc(subjects.subjectName), asc(subjects.subjectId))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(subjects).where(scoped(subjects, tenantId)),
  ]);
  return { rows: rows.map(toView), total: totalRow?.total ?? 0, page, pageSize };
}

export async function getSubject(tenantId: number, id: number): Promise<SubjectView> {
  const [row] = await db
    .select(subjectColumns)
    .from(subjects)
    .where(scoped(subjects, tenantId, eq(subjects.subjectId, id)))
    .limit(1);
  if (!row) throw new SubjectError("SUBJECT_NOT_FOUND");
  return toView(row);
}

async function assertNotDuplicate(tenantId: number, input: SubjectInput, exceptId?: number): Promise<void> {
  const sameKey = and(
    eq(subjects.subjectName, input.subjectName),
    eq(subjects.gradeLevel, input.gradeLevel),
    eq(subjects.stream, input.stream),
    exceptId === undefined ? undefined : ne(subjects.subjectId, exceptId),
  );
  const [existing] = await db
    .select({ id: subjects.subjectId })
    .from(subjects)
    .where(scoped(subjects, tenantId, sameKey))
    .limit(1);
  if (existing) throw new SubjectError("SUBJECT_DUPLICATE");
}

function rethrowDuplicate(error: unknown): never {
  if (mysqlErrno(error) === ER_DUP_ENTRY) throw new SubjectError("SUBJECT_DUPLICATE");
  throw error;
}

export async function createSubject(tenantId: number, input: SubjectInput): Promise<SubjectView> {
  await assertNotDuplicate(tenantId, input);
  try {
    const result = await db.insert(subjects).values(withTenant(toColumns(input), tenantId));
    return await getSubject(tenantId, Number(result[0].insertId));
  } catch (error) {
    return rethrowDuplicate(error);
  }
}

export async function updateSubject(tenantId: number, id: number, input: SubjectInput): Promise<SubjectView> {
  await getSubject(tenantId, id);
  await assertNotDuplicate(tenantId, input, id);
  try {
    await db
      .update(subjects)
      .set(toColumns(input))
      .where(scoped(subjects, tenantId, eq(subjects.subjectId, id)));
  } catch (error) {
    rethrowDuplicate(error);
  }
  return getSubject(tenantId, id);
}

export async function deleteSubject(tenantId: number, id: number): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ id: subjects.subjectId })
        .from(subjects)
        .where(scoped(subjects, tenantId, eq(subjects.subjectId, id)))
        .for("update");
      if (!row) throw new SubjectError("SUBJECT_NOT_FOUND");

      for (const ref of SUBJECT_REFERENCES) {
        const [used] = await tx
          .select({ one: sql<number>`1` })
          .from(ref.table)
          .where(scoped(ref, tenantId, eq(ref.subjectId, id)))
          .limit(1);
        if (used) throw new SubjectError("SUBJECT_IN_USE");
      }

      await tx.delete(subjects).where(scoped(subjects, tenantId, eq(subjects.subjectId, id)));
    });
  } catch (error) {
    if (mysqlErrno(error) === ER_ROW_IS_REFERENCED) throw new SubjectError("SUBJECT_IN_USE");
    throw error;
  }
}
