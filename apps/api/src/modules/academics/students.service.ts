import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { parentGuardian, staff, students, systemSettings, users } from "../../db/schema/index.js";
import { ER_DUP_ENTRY, ER_ROW_IS_REFERENCED, mysqlErrno } from "../../lib/mysqlError.js";
import { hashPassword } from "../../lib/password.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type { StudentBody } from "./academics.schema.js";
import { PhotoError, readPhoto, removePhoto, savePhoto } from "./photoStore.js";

const YEAR_KEY = "current_academic_year";
const DEFAULT_PASSWORD = "123456";

export type AcademicsCode =
  | "NOT_FOUND"
  | "STUDENT_IN_USE"
  | "USERNAME_TAKEN"
  | "PHOTO_TYPE"
  | "PHOTO_SIZE"
  | "PLACEMENT_GRADE"
  | "PLACEMENT_NO_SECTION"
  | "PLACEMENT_FULL"
  | "PLACEMENT_NONE"
  | "PLACEMENT_CONFLICT"
  | "PLACEMENT_SCOPE"
  | "TEACHER_LIMIT"
  | "ASSIGNMENT_EXISTS"
  | "SCHEDULE_SHIFT"
  | "SCHEDULE_NO_CLASS"
  | "SCHEDULE_OVER_CAPACITY"
  | "SCHEDULE_TEACHER_WEEK"
  | "SCHEDULE_TEACHER_DAILY"
  | "SCHEDULE_SUBJECT_DAYS"
  | "SCHEDULE_PACKING"
  | "SCHEDULE_UNSOLVED"
  | "SCHEDULE_MOVE";

export class AcademicsError extends Error {
  constructor(
    readonly code: AcademicsCode,
    readonly extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function storedStream(gradeLevel: number, stream: StudentBody["stream"]): string | null {
  if (gradeLevel < 11 || stream == null || stream === "Common") return null;
  return stream;
}

async function academicYearOf(tenantId: number): Promise<string> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, YEAR_KEY)))
    .limit(1);
  return row?.value ?? String(new Date().getFullYear());
}

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export async function getStudent(tenantId: number, studentId: number) {
  const [row] = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gender: students.gender,
      age: students.age,
      gradeLevel: students.gradeLevel,
      stream: students.stream,
      section: students.section,
      academicYear: students.academicYear,
      registrationType: students.registrationType,
      previousSchool: students.previousSchool,
      kebele: students.kebele,
      gote: students.gote,
      houseNumber: students.houseNumber,
      isTransfer: students.isTransfer,
      submissionStatus: students.submissionStatus,
      isApproved: students.isApproved,
      photo: students.photo,
      userId: students.userId,
      username: users.username,
      isActive: users.isActive,
      parentFirst: parentGuardian.firstName,
      parentLast: parentGuardian.lastName,
      parentPhone: parentGuardian.phoneNumber,
      parentEmail: parentGuardian.email,
    })
    .from(students)
    .leftJoin(users, and(eq(users.userId, students.userId), eq(users.tenantId, tenantId)))
    .leftJoin(parentGuardian, and(eq(parentGuardian.pgId, students.parentPgId), eq(parentGuardian.tenantId, tenantId)))
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!row) throw new AcademicsError("NOT_FOUND");
  const parentName = [row.parentFirst, row.parentLast].filter(Boolean).join(" ").trim();
  return {
    id: row.id,
    fullName: row.fullName,
    gender: row.gender,
    age: row.age,
    gradeLevel: row.gradeLevel,
    stream: row.stream,
    section: row.section,
    academicYear: row.academicYear,
    registrationType: row.registrationType,
    previousSchool: row.previousSchool,
    kebele: row.kebele,
    gote: row.gote,
    houseNumber: row.houseNumber,
    isTransfer: row.isTransfer === 1,
    submissionStatus: row.submissionStatus,
    isApproved: row.isApproved === 1,
    photo: row.photo && row.photo !== "default_profile.png" ? row.photo : null,
    username: row.username,
    isActive: row.isActive === 1,
    parentName,
    parentPhone: row.parentPhone,
    parentEmail: row.parentEmail,
  };
}

export async function createStudent(tenantId: number, actorId: number, input: StudentBody) {
  const year = input.academicYear?.trim() || (await academicYearOf(tenantId));
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  try {
    const studentId = await db.transaction(async (tx) => {
      const userInsert = await tx.insert(users).values(
        withTenant(
          {
            username: `std_${Date.now()}`,
            passwordHash,
            role: "Student" as const,
            passwordChanged: 0,
            isActive: 1,
            tokenVersion: 0,
          },
          tenantId,
        ),
      );
      const userId = Number(userInsert[0].insertId);
      const studentInsert = await tx.insert(students).values(
        withTenant(
          {
            fullName: input.fullName,
            gender: input.gender,
            age: input.age,
            gradeLevel: input.gradeLevel,
            stream: storedStream(input.gradeLevel, input.stream),
            academicYear: year,
            registrationType: input.registrationType,
            previousSchool: emptyToNull(input.previousSchool),
            kebele: emptyToNull(input.kebele),
            gote: emptyToNull(input.gote),
            houseNumber: emptyToNull(input.houseNumber),
            isTransfer: input.isTransfer ? 1 : 0,
            admissionDate: today(),
            submissionStatus: "Draft" as const,
            isApproved: 0,
            registeredBy: actorId,
            userId,
            photo: "default_profile.png",
          },
          tenantId,
        ),
      );
      return Number(studentInsert[0].insertId);
    });
    return getStudent(tenantId, studentId);
  } catch (error) {
    if (error instanceof AcademicsError) throw error;
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new AcademicsError("USERNAME_TAKEN");
    throw error;
  }
}

export async function updateStudent(tenantId: number, studentId: number, input: StudentBody) {
  const [existing] = await db
    .select({ id: students.studentId, academicYear: students.academicYear })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!existing) throw new AcademicsError("NOT_FOUND");
  await db
    .update(students)
    .set({
      fullName: input.fullName,
      gender: input.gender,
      age: input.age,
      gradeLevel: input.gradeLevel,
      stream: storedStream(input.gradeLevel, input.stream),
      registrationType: input.registrationType,
      previousSchool: emptyToNull(input.previousSchool),
      kebele: emptyToNull(input.kebele),
      gote: emptyToNull(input.gote),
      houseNumber: emptyToNull(input.houseNumber),
      ...(input.academicYear ? { academicYear: input.academicYear } : {}),
    })
    .where(scoped(students, tenantId, eq(students.studentId, studentId)));
  return getStudent(tenantId, studentId);
}

export async function deleteStudent(tenantId: number, studentId: number) {
  const [existing] = await db
    .select({ userId: students.userId, photo: students.photo })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!existing) throw new AcademicsError("NOT_FOUND");
  try {
    await db.transaction(async (tx) => {
      await tx.delete(students).where(scoped(students, tenantId, eq(students.studentId, studentId)));
      if (existing.userId) {
        await tx.delete(users).where(scoped(users, tenantId, eq(users.userId, existing.userId)));
      }
    });
  } catch (error) {
    if (mysqlErrno(error) === ER_ROW_IS_REFERENCED) throw new AcademicsError("STUDENT_IN_USE");
    throw error;
  }
  await removePhoto(existing.photo);
}

export async function saveOwnPhoto(tenantId: number, userId: number, bytes: Buffer) {
  let fileName: string;
  try {
    fileName = await savePhoto(bytes);
  } catch (error) {
    if (error instanceof PhotoError && error.code !== "NOT_FOUND") throw new AcademicsError(error.code);
    throw error;
  }
  const [student] = await db
    .select({ id: students.studentId, photo: students.photo })
    .from(students)
    .where(scoped(students, tenantId, eq(students.userId, userId)))
    .limit(1);
  if (student) {
    await db.update(students).set({ photo: fileName }).where(scoped(students, tenantId, eq(students.studentId, student.id)));
    await removePhoto(student.photo);
    return { photo: fileName };
  }
  const [member] = await db
    .select({ id: staff.staffId, photo: staff.photo })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.userId, userId)))
    .limit(1);
  if (!member) {
    await removePhoto(fileName);
    throw new AcademicsError("NOT_FOUND");
  }
  await db.update(staff).set({ photo: fileName }).where(scoped(staff, tenantId, eq(staff.staffId, member.id)));
  await removePhoto(member.photo);
  return { photo: fileName };
}

export async function ownPhoto(tenantId: number, userId: number) {
  const [student] = await db
    .select({ photo: students.photo })
    .from(students)
    .where(scoped(students, tenantId, eq(students.userId, userId)))
    .limit(1);
  const fileName = student?.photo;
  if (fileName && fileName !== "default_profile.png") return readPhoto(fileName);
  const [member] = await db
    .select({ photo: staff.photo })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.userId, userId)))
    .limit(1);
  if (!member?.photo) throw new AcademicsError("NOT_FOUND");
  return readPhoto(member.photo);
}

export async function studentPhoto(tenantId: number, studentId: number) {
  const [row] = await db
    .select({ photo: students.photo })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!row?.photo) throw new AcademicsError("NOT_FOUND");
  return readPhoto(row.photo);
}
