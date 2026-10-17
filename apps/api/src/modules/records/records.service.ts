import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../../db/index.js";
import {
  auditLog,
  grades,
  roAccessLog,
  roAlumni,
  roArchiveRows,
  roArchives,
  roDocuments,
  roFiles,
  roImports,
  roLocks,
  roRequests,
  roStaffRecords,
  staff,
  stDocumentRequests,
  students,
  subjects,
  tcGradeReviews,
  tenants,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import {
  acceptAllowed,
  alumniAllowed,
  correctionAllowed,
  markSummary,
  nextQueue,
  parseImport,
  scoreAllowed,
  unlockAllowed,
  type ImportRow,
  type OverrideState,
} from "./recordsRules.js";

const FILE_LIMIT = 8 * 1024 * 1024;

export type RecordsErrorCode =
  | "NOT_FOUND"
  | "NOT_SENT"
  | "NOT_ACCEPTED"
  | "NOT_READY"
  | "OVERRIDE_REQUIRED"
  | "LOCKED"
  | "ALREADY_ARCHIVED"
  | "NOT_GRADUATE"
  | "ALREADY_ALUMNI"
  | "ALREADY_OPEN"
  | "IMPORT_EMPTY"
  | "EXCEL_SAVE_AS_CSV"
  | "PDF_FILE"
  | "IMPORT_FORMAT"
  | "FILE_TYPE"
  | "FILE_SIZE"
  | "SCORE_OVER"
  | "NOTE_REQUIRED";

export class RecordsError extends Error {
  constructor(readonly code: RecordsErrorCode) {
    super(code);
    this.name = "RecordsError";
  }
}

function addisNow(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function insertId(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const header = result[0] as { insertId?: number } | undefined;
  return Number(header?.insertId ?? 0);
}

function money(value: number): string {
  return value.toFixed(2);
}

function num(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

export function recordsDir(): string {
  return path.resolve(process.cwd(), "uploads", "records");
}

function isPdf(bytes: Buffer): boolean {
  return bytes.length >= 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-";
}

async function writeAccess(tenantId: number, userId: number, actionType: string, targetCode: string, description: string) {
  await db.insert(roAccessLog).values(withTenant({ userId, actionType, targetCode, description }, tenantId));
  await db.insert(auditLog).values(withTenant({ userId, actionType, description, timestamp: addisNow() }, tenantId));
}

async function lockOf(tenantId: number, year: string, gradeLevel: number, section: string) {
  const [row] = await db
    .select({ id: roLocks.lockId, status: roLocks.status })
    .from(roLocks)
    .where(
      scoped(
        roLocks,
        tenantId,
        and(eq(roLocks.academicYear, year), eq(roLocks.gradeLevel, gradeLevel), eq(roLocks.section, section)),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function studentOf(tenantId: number, studentId: number) {
  const [row] = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gender: students.gender,
      gradeLevel: students.gradeLevel,
      section: students.section,
      academicYear: students.academicYear,
    })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!row) throw new RecordsError("NOT_FOUND");
  return row;
}

async function acceptedMarks(tenantId: number, studentId: number, year: string | null) {
  const rows = await db
    .select({
      id: grades.gradeEntryId,
      subject: subjects.subjectName,
      year: grades.academicYear,
      score: grades.score,
      maxScore: grades.maxScore,
    })
    .from(grades)
    .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(
        grades,
        tenantId,
        and(eq(grades.studentId, studentId), eq(grades.submissionStatus, "Accepted"), year ? eq(grades.academicYear, year) : undefined),
      ),
    )
    .orderBy(asc(grades.academicYear), asc(subjects.subjectName));
  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    year: row.year,
    score: num(row.score),
    maxScore: num(row.maxScore ?? 100),
  }));
}

async function freshCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `REC-${randomBytes(4).toString("hex").toUpperCase()}`;
    const [existing] = await db.select({ id: roDocuments.documentId }).from(roDocuments).where(eq(roDocuments.verifyCode, code)).limit(1);
    if (!existing) return code;
  }
  throw new RecordsError("NOT_READY");
}

async function issueDocument(
  tenantId: number,
  userId: number,
  studentId: number,
  kind: "transcript" | "cumulative",
  requestId: number | null,
) {
  const student = await studentOf(tenantId, studentId);
  const marks = await acceptedMarks(tenantId, studentId, kind === "transcript" ? student.academicYear : null);
  if (marks.length === 0) throw new RecordsError("NOT_READY");
  const verifyCode = await freshCode();
  const summary = markSummary(marks);
  const id = insertId(
    await db.insert(roDocuments).values(
      withTenant(
        {
          studentId,
          requestId,
          kind,
          academicYear: student.academicYear,
          verifyCode,
          summary,
          recordedBy: userId,
        },
        tenantId,
      ),
    ),
  );
  await writeAccess(tenantId, userId, "records.transcript", verifyCode, `${kind} for student ${studentId}: ${summary}`);
  return {
    id,
    verifyCode,
    summary,
    qrSvg: await QRCode.toString(verifyCode, { type: "svg", margin: 1, width: 220 }),
  };
}

export async function desk(tenantId: number) {
  const [queue, waiting, locks, alumni, documents] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(stDocumentRequests)
      .where(scoped(stDocumentRequests, tenantId, sql`${stDocumentRequests.status} <> 'Collected'`)),
    db
      .select({ total: sql<number>`count(*)` })
      .from(grades)
      .innerJoin(tcGradeReviews, and(eq(tcGradeReviews.gradeEntryId, grades.gradeEntryId), eq(tcGradeReviews.tenantId, tenantId)))
      .where(scoped(grades, tenantId, and(eq(grades.submissionStatus, "Approved"), eq(tcGradeReviews.status, "Sent")))),
    db.select({ total: sql<number>`count(*)` }).from(roLocks).where(scoped(roLocks, tenantId, eq(roLocks.status, "Locked"))),
    db.select({ total: sql<number>`count(*)` }).from(roAlumni).where(scoped(roAlumni, tenantId)),
    db.select({ total: sql<number>`count(*)` }).from(roDocuments).where(scoped(roDocuments, tenantId)),
  ]);
  return {
    queue: num(queue[0]?.total),
    waiting: num(waiting[0]?.total),
    locks: num(locks[0]?.total),
    alumni: num(alumni[0]?.total),
    documents: num(documents[0]?.total),
  };
}

export async function listStudents(tenantId: number) {
  const rows = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
      academicYear: students.academicYear,
    })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(asc(students.fullName))
    .limit(500);
  return { rows: rows.map((row) => ({ ...row, section: row.section ?? "" })) };
}

export async function inbox(tenantId: number) {
  const rows = await db
    .select({
      id: grades.gradeEntryId,
      student: students.fullName,
      subject: subjects.subjectName,
      score: grades.score,
      maxScore: grades.maxScore,
      year: grades.academicYear,
      gradeLevel: students.gradeLevel,
      section: students.section,
    })
    .from(grades)
    .innerJoin(students, and(eq(students.studentId, grades.studentId), eq(students.tenantId, tenantId)))
    .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
    .innerJoin(tcGradeReviews, and(eq(tcGradeReviews.gradeEntryId, grades.gradeEntryId), eq(tcGradeReviews.tenantId, tenantId)))
    .where(scoped(grades, tenantId, and(eq(grades.submissionStatus, "Approved"), eq(tcGradeReviews.status, "Sent"))))
    .orderBy(asc(grades.gradeEntryId));
  return {
    rows: rows.map((row) => ({
      id: row.id,
      student: row.student,
      subject: row.subject,
      score: num(row.score),
      maxScore: num(row.maxScore ?? 100),
      year: row.year,
      gradeLevel: row.gradeLevel,
      section: row.section ?? "",
    })),
  };
}

export async function acceptGrade(tenantId: number, userId: number, gradeId: number) {
  const [row] = await db
    .select({
      id: grades.gradeEntryId,
      status: grades.submissionStatus,
      review: tcGradeReviews.status,
      year: grades.academicYear,
      gradeLevel: students.gradeLevel,
      section: students.section,
    })
    .from(grades)
    .innerJoin(students, and(eq(students.studentId, grades.studentId), eq(students.tenantId, tenantId)))
    .leftJoin(tcGradeReviews, and(eq(tcGradeReviews.gradeEntryId, grades.gradeEntryId), eq(tcGradeReviews.tenantId, tenantId)))
    .where(scoped(grades, tenantId, eq(grades.gradeEntryId, gradeId)))
    .limit(1);
  if (!row) throw new RecordsError("NOT_FOUND");
  if (row.status === "Accepted") throw new RecordsError("NOT_READY");
  if (!acceptAllowed(row.status, row.review)) throw new RecordsError("NOT_SENT");
  const lock = await lockOf(tenantId, row.year, row.gradeLevel, row.section ?? "");
  if (lock?.status === "Locked") throw new RecordsError("LOCKED");
  await db
    .update(grades)
    .set({ submissionStatus: "Accepted", registrarAccepted: 1 })
    .where(scoped(grades, tenantId, eq(grades.gradeEntryId, row.id)));
  await writeAccess(tenantId, userId, "records.accept", String(row.id), `Accepted mark ${row.id}`);
  return { id: row.id };
}

export async function queue(tenantId: number) {
  const rows = await db
    .select({
      id: stDocumentRequests.requestId,
      studentId: stDocumentRequests.studentId,
      student: students.fullName,
      kind: stDocumentRequests.kind,
      purpose: stDocumentRequests.purpose,
      status: stDocumentRequests.status,
      createdAt: stDocumentRequests.createdAt,
    })
    .from(stDocumentRequests)
    .innerJoin(students, and(eq(students.studentId, stDocumentRequests.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(stDocumentRequests, tenantId))
    .orderBy(desc(stDocumentRequests.requestId));
  return { rows };
}

export async function advanceQueue(tenantId: number, userId: number, requestId: number) {
  const [row] = await db
    .select({
      id: stDocumentRequests.requestId,
      studentId: stDocumentRequests.studentId,
      kind: stDocumentRequests.kind,
      status: stDocumentRequests.status,
    })
    .from(stDocumentRequests)
    .where(scoped(stDocumentRequests, tenantId, eq(stDocumentRequests.requestId, requestId)))
    .limit(1);
  if (!row) throw new RecordsError("NOT_FOUND");
  const next = nextQueue(row.status);
  if (!next) throw new RecordsError("NOT_READY");
  let issued: { verifyCode: string } | null = null;
  if (next === "Ready") {
    issued = await issueDocument(tenantId, userId, row.studentId, row.kind === "transcript" ? "transcript" : "cumulative", row.id);
  }
  await db
    .update(stDocumentRequests)
    .set({ status: next })
    .where(scoped(stDocumentRequests, tenantId, eq(stDocumentRequests.requestId, row.id)));
  await writeAccess(tenantId, userId, "records.queue", String(row.id), `Queue ${row.id} moved to ${next}`);
  return { id: row.id, status: next, verifyCode: issued?.verifyCode ?? null };
}

export async function listTranscripts(tenantId: number) {
  const rows = await db
    .select({
      id: roDocuments.documentId,
      student: students.fullName,
      kind: roDocuments.kind,
      academicYear: roDocuments.academicYear,
      verifyCode: roDocuments.verifyCode,
      summary: roDocuments.summary,
      createdAt: roDocuments.createdAt,
    })
    .from(roDocuments)
    .innerJoin(students, and(eq(students.studentId, roDocuments.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(roDocuments, tenantId))
    .orderBy(desc(roDocuments.documentId));
  const withQr = [];
  for (const row of rows) {
    withQr.push({ ...row, qrSvg: await QRCode.toString(row.verifyCode, { type: "svg", margin: 1, width: 180 }) });
  }
  return { rows: withQr };
}

export async function createTranscript(
  tenantId: number,
  userId: number,
  input: { studentId: number; kind: "transcript" | "cumulative" },
) {
  return issueDocument(tenantId, userId, input.studentId, input.kind, null);
}

export async function listArchives(tenantId: number) {
  const archives = await db
    .select({
      id: roArchives.archiveId,
      academicYear: roArchives.academicYear,
      gradeLevel: roArchives.gradeLevel,
      section: roArchives.section,
      rowCount: roArchives.rowCount,
      createdAt: roArchives.createdAt,
    })
    .from(roArchives)
    .where(scoped(roArchives, tenantId))
    .orderBy(desc(roArchives.archiveId));
  const locks = await db
    .select({
      id: roLocks.lockId,
      academicYear: roLocks.academicYear,
      gradeLevel: roLocks.gradeLevel,
      section: roLocks.section,
      status: roLocks.status,
    })
    .from(roLocks)
    .where(scoped(roLocks, tenantId))
    .orderBy(desc(roLocks.lockId));
  return { archives, locks };
}

export async function archiveRoster(
  tenantId: number,
  userId: number,
  input: { academicYear: string; gradeLevel: number; section: string },
) {
  const [existing] = await db
    .select({ id: roArchives.archiveId })
    .from(roArchives)
    .where(
      scoped(
        roArchives,
        tenantId,
        and(
          eq(roArchives.academicYear, input.academicYear),
          eq(roArchives.gradeLevel, input.gradeLevel),
          eq(roArchives.section, input.section),
        ),
      ),
    )
    .limit(1);
  if (existing) throw new RecordsError("ALREADY_ARCHIVED");
  const marks = await db
    .select({
      id: grades.gradeEntryId,
      student: students.fullName,
      subject: subjects.subjectName,
      score: grades.score,
      maxScore: grades.maxScore,
    })
    .from(grades)
    .innerJoin(students, and(eq(students.studentId, grades.studentId), eq(students.tenantId, tenantId)))
    .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(
        grades,
        tenantId,
        and(
          eq(grades.submissionStatus, "Accepted"),
          eq(grades.academicYear, input.academicYear),
          eq(students.gradeLevel, input.gradeLevel),
          eq(students.section, input.section),
        ),
      ),
    );
  if (marks.length === 0) throw new RecordsError("NOT_READY");
  const archiveId = insertId(
    await db.insert(roArchives).values(withTenant({ ...input, rowCount: marks.length, recordedBy: userId }, tenantId)),
  );
  await db.insert(roArchiveRows).values(
    marks.map((row) =>
      withTenant(
        {
          archiveId,
          gradeEntryId: row.id,
          studentName: row.student,
          subjectName: row.subject,
          score: money(num(row.score)),
          maxScore: money(num(row.maxScore ?? 100)),
        },
        tenantId,
      ),
    ),
  );
  const lock = await lockOf(tenantId, input.academicYear, input.gradeLevel, input.section);
  if (lock) {
    await db.update(roLocks).set({ status: "Locked" }).where(scoped(roLocks, tenantId, eq(roLocks.lockId, lock.id)));
  } else {
    await db.insert(roLocks).values(withTenant({ ...input, status: "Locked" as const, recordedBy: userId }, tenantId));
  }
  await writeAccess(tenantId, userId, "records.archive", String(archiveId), `Archived ${input.gradeLevel}${input.section} ${input.academicYear}`);
  return { id: archiveId, rowCount: marks.length };
}

async function openRequest(
  tenantId: number,
  kind: "correction" | "unlock",
  gradeEntryId: number | null,
  section: { academicYear: string; gradeLevel: number; section: string },
) {
  const [row] = await db
    .select({ id: roRequests.requestId })
    .from(roRequests)
    .where(
      scoped(
        roRequests,
        tenantId,
        and(
          eq(roRequests.kind, kind),
          eq(roRequests.status, "Pending"),
          gradeEntryId == null ? undefined : eq(roRequests.gradeEntryId, gradeEntryId),
          eq(roRequests.academicYear, section.academicYear),
          eq(roRequests.gradeLevel, section.gradeLevel),
          eq(roRequests.section, section.section),
        ),
      ),
    )
    .limit(1);
  if (row) throw new RecordsError("ALREADY_OPEN");
}

export async function listRequests(tenantId: number) {
  const rows = await db
    .select({
      id: roRequests.requestId,
      kind: roRequests.kind,
      gradeEntryId: roRequests.gradeEntryId,
      academicYear: roRequests.academicYear,
      gradeLevel: roRequests.gradeLevel,
      section: roRequests.section,
      proposedScore: roRequests.proposedScore,
      reason: roRequests.reason,
      status: roRequests.status,
      principalNote: roRequests.principalNote,
      createdAt: roRequests.createdAt,
    })
    .from(roRequests)
    .where(scoped(roRequests, tenantId))
    .orderBy(desc(roRequests.requestId));
  const accepted = await db
    .select({
      id: grades.gradeEntryId,
      student: students.fullName,
      subject: subjects.subjectName,
      score: grades.score,
      year: grades.academicYear,
    })
    .from(grades)
    .innerJoin(students, and(eq(students.studentId, grades.studentId), eq(students.tenantId, tenantId)))
    .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(grades, tenantId, eq(grades.submissionStatus, "Accepted")))
    .orderBy(asc(students.fullName))
    .limit(300);
  return {
    rows: rows.map((row) => ({ ...row, proposedScore: row.proposedScore == null ? null : num(row.proposedScore) })),
    accepted: accepted.map((row) => ({ ...row, score: num(row.score) })),
  };
}

export async function askCorrection(
  tenantId: number,
  userId: number,
  input: { gradeEntryId: number; proposedScore: number; reason: string },
) {
  const [row] = await db
    .select({
      id: grades.gradeEntryId,
      status: grades.submissionStatus,
      maxScore: grades.maxScore,
      year: grades.academicYear,
      gradeLevel: students.gradeLevel,
      section: students.section,
    })
    .from(grades)
    .innerJoin(students, and(eq(students.studentId, grades.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(grades, tenantId, eq(grades.gradeEntryId, input.gradeEntryId)))
    .limit(1);
  if (!row) throw new RecordsError("NOT_FOUND");
  if (row.status !== "Accepted") throw new RecordsError("NOT_ACCEPTED");
  if (!scoreAllowed(input.proposedScore, num(row.maxScore ?? 100))) throw new RecordsError("SCORE_OVER");
  const section = { academicYear: row.year, gradeLevel: row.gradeLevel, section: row.section ?? "" };
  await openRequest(tenantId, "correction", row.id, section);
  const id = insertId(
    await db.insert(roRequests).values(
      withTenant(
        {
          kind: "correction" as const,
          gradeEntryId: row.id,
          ...section,
          proposedScore: money(input.proposedScore),
          reason: input.reason,
          status: "Pending" as const,
          recordedBy: userId,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function askUnlock(
  tenantId: number,
  userId: number,
  input: { academicYear: string; gradeLevel: number; section: string; reason: string },
) {
  const lock = await lockOf(tenantId, input.academicYear, input.gradeLevel, input.section);
  if (!lock || lock.status !== "Locked") throw new RecordsError("NOT_FOUND");
  await openRequest(tenantId, "unlock", null, input);
  const id = insertId(
    await db.insert(roRequests).values(
      withTenant(
        {
          kind: "unlock" as const,
          gradeEntryId: null,
          academicYear: input.academicYear,
          gradeLevel: input.gradeLevel,
          section: input.section,
          proposedScore: null,
          reason: input.reason,
          status: "Pending" as const,
          recordedBy: userId,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function decideRequest(
  tenantId: number,
  userId: number,
  requestId: number,
  input: { action: "grant" | "refuse"; note: string },
) {
  if (input.note.trim().length < 3) throw new RecordsError("NOTE_REQUIRED");
  const [row] = await db
    .select({ id: roRequests.requestId, status: roRequests.status })
    .from(roRequests)
    .where(scoped(roRequests, tenantId, eq(roRequests.requestId, requestId)))
    .limit(1);
  if (!row) throw new RecordsError("NOT_FOUND");
  if (row.status !== "Pending") throw new RecordsError("NOT_READY");
  await db
    .update(roRequests)
    .set({
      status: input.action === "grant" ? "Granted" : "Refused",
      principalNote: input.note.trim(),
      decidedBy: userId,
    })
    .where(scoped(roRequests, tenantId, eq(roRequests.requestId, row.id)));
  await writeAccess(tenantId, userId, "records.override", String(row.id), `Principal ${input.action} on request ${row.id}`);
  return { id: row.id };
}

export async function applyCorrection(tenantId: number, userId: number, requestId: number) {
  const [request] = await db
    .select({
      id: roRequests.requestId,
      kind: roRequests.kind,
      status: roRequests.status,
      gradeEntryId: roRequests.gradeEntryId,
      proposedScore: roRequests.proposedScore,
    })
    .from(roRequests)
    .where(scoped(roRequests, tenantId, eq(roRequests.requestId, requestId)))
    .limit(1);
  if (!request || request.kind !== "correction" || request.gradeEntryId == null) throw new RecordsError("NOT_FOUND");
  const [grade] = await db
    .select({ id: grades.gradeEntryId, status: grades.submissionStatus, score: grades.score, maxScore: grades.maxScore })
    .from(grades)
    .where(scoped(grades, tenantId, eq(grades.gradeEntryId, request.gradeEntryId)))
    .limit(1);
  if (!grade) throw new RecordsError("NOT_FOUND");
  const block = correctionAllowed({ gradeStatus: grade.status, override: request.status as OverrideState });
  if (block === "NOT_ACCEPTED") throw new RecordsError("NOT_READY");
  if (block === "OVERRIDE_REQUIRED") throw new RecordsError("OVERRIDE_REQUIRED");
  const nextScore = num(request.proposedScore);
  if (!scoreAllowed(nextScore, num(grade.maxScore ?? 100))) throw new RecordsError("SCORE_OVER");
  await db
    .update(grades)
    .set({ score: money(nextScore) })
    .where(scoped(grades, tenantId, eq(grades.gradeEntryId, grade.id)));
  await db
    .update(roArchiveRows)
    .set({ score: money(nextScore) })
    .where(scoped(roArchiveRows, tenantId, eq(roArchiveRows.gradeEntryId, grade.id)));
  await db
    .update(roRequests)
    .set({ status: "Applied" })
    .where(scoped(roRequests, tenantId, eq(roRequests.requestId, request.id)));
  await writeAccess(
    tenantId,
    userId,
    "records.correct",
    String(grade.id),
    `Mark ${grade.id} changed from ${num(grade.score)} to ${nextScore}`,
  );
  return { id: grade.id };
}

export async function applyUnlock(tenantId: number, userId: number, requestId: number) {
  const [request] = await db
    .select({
      id: roRequests.requestId,
      kind: roRequests.kind,
      status: roRequests.status,
      academicYear: roRequests.academicYear,
      gradeLevel: roRequests.gradeLevel,
      section: roRequests.section,
    })
    .from(roRequests)
    .where(scoped(roRequests, tenantId, eq(roRequests.requestId, requestId)))
    .limit(1);
  if (!request || request.kind !== "unlock") throw new RecordsError("NOT_FOUND");
  const lock = await lockOf(tenantId, request.academicYear, request.gradeLevel, request.section);
  const block = unlockAllowed(lock?.status ?? "none", request.status as OverrideState);
  if (block === "NOT_FOUND") throw new RecordsError("NOT_FOUND");
  if (block === "OVERRIDE_REQUIRED") throw new RecordsError("OVERRIDE_REQUIRED");
  await db.update(roLocks).set({ status: "Unlocked" }).where(scoped(roLocks, tenantId, eq(roLocks.lockId, lock!.id)));
  await db
    .update(roRequests)
    .set({ status: "Applied" })
    .where(scoped(roRequests, tenantId, eq(roRequests.requestId, request.id)));
  await writeAccess(tenantId, userId, "records.unlock", String(lock!.id), `Unlocked ${request.gradeLevel}${request.section} ${request.academicYear}`);
  return { id: lock!.id };
}

export async function importStudents(tenantId: number, userId: number, kind: "csv" | "structured" | "excel" | "pdf", text: string) {
  const parsed = parseImport(kind, text);
  if (!Array.isArray(parsed)) throw new RecordsError(parsed);
  let inserted = 0;
  let skipped = 0;
  for (const row of parsed) {
    const saved = await insertStudent(tenantId, userId, row);
    if (saved) inserted += 1;
    else skipped += 1;
  }
  const id = insertId(
    await db.insert(roImports).values(
      withTenant({ fileKind: kind === "structured" ? "structured" : "csv", rowCount: inserted, recordedBy: userId }, tenantId),
    ),
  );
  await writeAccess(tenantId, userId, "records.import", String(id), `Imported ${inserted} students, skipped ${skipped}`);
  return { id, inserted, skipped };
}

async function insertStudent(tenantId: number, userId: number, row: ImportRow): Promise<boolean> {
  const [existing] = await db
    .select({ id: students.studentId })
    .from(students)
    .where(
      scoped(
        students,
        tenantId,
        and(
          eq(students.fullName, row.fullName),
          eq(students.gradeLevel, row.gradeLevel),
          eq(students.section, row.section),
          eq(students.academicYear, row.academicYear),
        ),
      ),
    )
    .limit(1);
  if (existing) return false;
  await db.insert(students).values(
    withTenant(
      {
        fullName: row.fullName,
        gender: row.gender,
        age: row.age,
        gradeLevel: row.gradeLevel,
        section: row.section,
        academicYear: row.academicYear,
        registrationType: "አዲስ" as const,
        submissionStatus: "Draft" as const,
        isApproved: 0,
        registeredBy: userId,
      },
      tenantId,
    ),
  );
  return true;
}

export async function staffBoard(tenantId: number) {
  const people = await db
    .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName, role: staff.role, jobTitle: staff.jobTitle })
    .from(staff)
    .where(scoped(staff, tenantId))
    .orderBy(asc(staff.firstName));
  const records = await db
    .select({
      id: roStaffRecords.recordId,
      staffId: roStaffRecords.staffId,
      kind: roStaffRecords.kind,
      title: roStaffRecords.title,
      body: roStaffRecords.body,
      createdAt: roStaffRecords.createdAt,
    })
    .from(roStaffRecords)
    .where(scoped(roStaffRecords, tenantId))
    .orderBy(desc(roStaffRecords.recordId));
  return { staff: people, records };
}

export async function addStaffRecord(
  tenantId: number,
  userId: number,
  input: { staffId: number; kind: "credential" | "work" | "file"; title: string; body: string },
) {
  const [person] = await db
    .select({ id: staff.staffId })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, input.staffId)))
    .limit(1);
  if (!person) throw new RecordsError("NOT_FOUND");
  const id = insertId(await db.insert(roStaffRecords).values(withTenant({ ...input, recordedBy: userId }, tenantId)));
  await writeAccess(tenantId, userId, "records.staff", String(id), `${input.kind} for staff ${input.staffId}`);
  return { id };
}

export async function listFiles(tenantId: number) {
  const rows = await db
    .select({
      id: roFiles.fileId,
      studentId: roFiles.studentId,
      student: students.fullName,
      title: roFiles.title,
      createdAt: roFiles.createdAt,
    })
    .from(roFiles)
    .innerJoin(students, and(eq(students.studentId, roFiles.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(roFiles, tenantId))
    .orderBy(desc(roFiles.fileId));
  return { rows };
}

export async function saveStudentFile(tenantId: number, userId: number, studentId: number, title: string, bytes: Buffer) {
  if (bytes.length > FILE_LIMIT) throw new RecordsError("FILE_SIZE");
  if (!isPdf(bytes)) throw new RecordsError("FILE_TYPE");
  await studentOf(tenantId, studentId);
  const storedName = `${randomBytes(16).toString("hex")}.pdf`;
  await mkdir(recordsDir(), { recursive: true });
  await writeFile(path.join(recordsDir(), storedName), bytes);
  const id = insertId(
    await db.insert(roFiles).values(withTenant({ studentId, title, storedName, recordedBy: userId }, tenantId)),
  );
  await writeAccess(tenantId, userId, "records.file", String(id), `Filed PDF for student ${studentId}`);
  return { id };
}

export async function readStudentFile(tenantId: number, userId: number, fileId: number) {
  const [row] = await db
    .select({ id: roFiles.fileId, storedName: roFiles.storedName, title: roFiles.title })
    .from(roFiles)
    .where(scoped(roFiles, tenantId, eq(roFiles.fileId, fileId)))
    .limit(1);
  if (!row) throw new RecordsError("NOT_FOUND");
  const bytes = await readFile(path.join(recordsDir(), path.basename(row.storedName))).catch(() => null);
  if (!bytes || !isPdf(bytes)) throw new RecordsError("NOT_FOUND");
  await writeAccess(tenantId, userId, "records.file", String(row.id), `Opened file ${row.id}`);
  return { title: row.title, bytes };
}

export async function listAlumni(tenantId: number, filter: { q: string; year: string; gender: "" | "M" | "F" }) {
  const needle = filter.q.replace(/[%_]/g, "").trim();
  const rows = await db
    .select({
      id: roAlumni.alumniId,
      studentId: roAlumni.studentId,
      fullName: students.fullName,
      gender: students.gender,
      section: students.section,
      graduationYear: roAlumni.graduationYear,
      note: roAlumni.note,
    })
    .from(roAlumni)
    .innerJoin(students, and(eq(students.studentId, roAlumni.studentId), eq(students.tenantId, tenantId)))
    .where(
      scoped(
        roAlumni,
        tenantId,
        and(
          needle ? like(students.fullName, `%${needle}%`) : undefined,
          filter.year ? eq(roAlumni.graduationYear, filter.year) : undefined,
          filter.gender ? eq(students.gender, filter.gender) : undefined,
        ),
      ),
    )
    .orderBy(asc(students.fullName));
  return { rows: rows.map((row) => ({ ...row, section: row.section ?? "" })) };
}

export async function addAlumni(
  tenantId: number,
  userId: number,
  input: { studentId: number; graduationYear: string; note: string },
) {
  const student = await studentOf(tenantId, input.studentId);
  const [existing] = await db
    .select({ id: roAlumni.alumniId })
    .from(roAlumni)
    .where(scoped(roAlumni, tenantId, eq(roAlumni.studentId, input.studentId)))
    .limit(1);
  const block = alumniAllowed(student.gradeLevel, Boolean(existing));
  if (block) throw new RecordsError(block);
  const id = insertId(
    await db.insert(roAlumni).values(withTenant({ ...input, recordedBy: userId }, tenantId)),
  );
  await writeAccess(tenantId, userId, "records.alumni", String(id), `Alumni ${student.fullName} ${input.graduationYear}`);
  return { id };
}

export async function ministryExport(tenantId: number, userId: number, kind: "marks" | "alumni", year: string) {
  if (kind === "alumni") {
    const board = await listAlumni(tenantId, { q: "", year, gender: "" });
    const lines = ["fullName,gender,section,graduationYear,note"];
    for (const row of board.rows) {
      lines.push([row.fullName, row.gender, row.section, row.graduationYear, row.note].map(csvCell).join(","));
    }
    await writeAccess(tenantId, userId, "records.export", kind, `Exported ${board.rows.length} alumni rows`);
    return { csv: `\uFEFF${lines.join("\n")}`, rows: board.rows };
  }
  const marks = await db
    .select({
      student: students.fullName,
      subject: subjects.subjectName,
      year: grades.academicYear,
      gradeLevel: students.gradeLevel,
      section: students.section,
      score: grades.score,
      maxScore: grades.maxScore,
    })
    .from(grades)
    .innerJoin(students, and(eq(students.studentId, grades.studentId), eq(students.tenantId, tenantId)))
    .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(grades, tenantId, and(eq(grades.submissionStatus, "Accepted"), year ? eq(grades.academicYear, year) : undefined)))
    .orderBy(asc(students.fullName), asc(subjects.subjectName));
  const rows = marks.map((row) => ({
    student: row.student,
    subject: row.subject,
    year: row.year,
    gradeLevel: row.gradeLevel,
    section: row.section ?? "",
    score: num(row.score),
    maxScore: num(row.maxScore ?? 100),
  }));
  const lines = ["student,subject,year,grade,section,score,maxScore"];
  for (const row of rows) {
    lines.push([row.student, row.subject, row.year, row.gradeLevel, row.section, row.score, row.maxScore].map(csvCell).join(","));
  }
  await writeAccess(tenantId, userId, "records.export", kind, `Exported ${rows.length} accepted marks`);
  return { csv: `\uFEFF${lines.join("\n")}`, rows };
}

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function accessLog(tenantId: number) {
  const rows = await db
    .select({
      id: roAccessLog.logId,
      actionType: roAccessLog.actionType,
      targetCode: roAccessLog.targetCode,
      description: roAccessLog.description,
      createdAt: roAccessLog.createdAt,
    })
    .from(roAccessLog)
    .where(scoped(roAccessLog, tenantId))
    .orderBy(desc(roAccessLog.logId))
    .limit(200);
  return { rows };
}

export async function verifyDocument(code: string) {
  const [row] = await db
    .select({
      student: students.fullName,
      kind: roDocuments.kind,
      academicYear: roDocuments.academicYear,
      issuedOn: roDocuments.createdAt,
      school: tenants.name,
    })
    .from(roDocuments)
    .innerJoin(students, and(eq(students.studentId, roDocuments.studentId), eq(students.tenantId, roDocuments.tenantId)))
    .innerJoin(tenants, eq(tenants.id, roDocuments.tenantId))
    .where(eq(roDocuments.verifyCode, code.trim().toUpperCase()))
    .limit(1);
  if (!row) throw new RecordsError("NOT_FOUND");
  return { valid: true, ...row };
}
