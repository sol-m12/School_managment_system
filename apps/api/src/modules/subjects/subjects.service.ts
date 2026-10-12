import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { subjects } from "../../db/schema/index.js";
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
};

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

export async function listSubjects(tenantId: number): Promise<SubjectPage> {
  const rows = await db
    .select(subjectColumns)
    .from(subjects)
    .where(scoped(subjects, tenantId))
    .orderBy(asc(subjects.gradeLevel), asc(subjects.sortOrder));
  return { rows: rows.map(toView), total: rows.length };
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
  await getSubject(tenantId, id);
  try {
    await db.delete(subjects).where(scoped(subjects, tenantId, eq(subjects.subjectId, id)));
  } catch (error) {
    if (mysqlErrno(error) === ER_ROW_IS_REFERENCED) throw new SubjectError("SUBJECT_IN_USE");
    throw error;
  }
}
