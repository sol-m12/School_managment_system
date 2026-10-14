import { and, asc, count, eq, gte, inArray, like, lte, ne, or, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  attendance,
  classSchedule,
  classes,
  expenses,
  grades,
  income,
  schoolSettings,
  staff,
  staffFiles,
  studentFinalReports,
  students,
  subjects,
  systemSettings,
  teacherAssignments,
  users,
} from "../../db/schema/index.js";
import { ER_DUP_ENTRY, ER_ROW_IS_REFERENCED, mysqlErrno } from "../../lib/mysqlError.js";
import { hashPassword } from "../../lib/password.js";
import { PERMISSIONS, permissionsForRole } from "../../lib/permissions.js";
import { ROLES } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type {
  AcademicYearInput,
  BaseClassInput,
  ClassInput,
  ExpenseInput,
  GradeUnlockInput,
  HomeroomInput,
  IncomeInput,
  ProfileInput,
  SchoolInfoInput,
  StudentQuery,
  TeacherUpdateInput,
} from "./admin.schema.js";

export type AdminErrorCode =
  | "NOT_FOUND"
  | "USERNAME_TAKEN"
  | "GRADE_NOT_FOUND"
  | "BACKUP_BLOCKED"
  | "CLASS_EXISTS"
  | "GRADE_SECTION_EXISTS"
  | "TEACHER_ASSIGNED"
  | "TEACHER_IN_USE"
  | "CLASS_IN_USE";

export class AdminError extends Error {
  constructor(readonly code: AdminErrorCode) {
    super(code);
    this.name = "AdminError";
  }
}

const REGISTRATION_TYPES = ["አዲስ", "ነባር", "አቋራጭ", "ደጋሚ", "መልሶ ቅበላ"] as const;
type RegistrationType = (typeof REGISTRATION_TYPES)[number];

function isRegistrationType(value: string): value is RegistrationType {
  return (REGISTRATION_TYPES as readonly string[]).includes(value);
}

const YEAR_KEY = "current_academic_year";
const SEMESTER_KEY = "current_semester";

function nowStamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

async function settingValue(tenantId: number, key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, key)))
    .limit(1);
  return row?.value ?? null;
}

async function upsertSetting(tenantId: number, key: string, value: string): Promise<void> {
  const [existing] = await db
    .select({ id: systemSettings.settingId })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, key)))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ settingValue: value })
      .where(scoped(systemSettings, tenantId, eq(systemSettings.settingId, existing.id)));
    return;
  }
  await db.insert(systemSettings).values(withTenant({ settingKey: key, settingValue: value }, tenantId));
}

export async function getAcademicYear(tenantId: number) {
  return {
    academicYear: await settingValue(tenantId, YEAR_KEY),
    semester: (await settingValue(tenantId, SEMESTER_KEY)) ?? "1",
  };
}

export async function updateAcademicYear(tenantId: number, input: AcademicYearInput) {
  await upsertSetting(tenantId, YEAR_KEY, input.academicYear);
  await upsertSetting(tenantId, SEMESTER_KEY, input.semester);
  return getAcademicYear(tenantId);
}

export async function searchUsers(tenantId: number, query: string | undefined) {
  const needle = query?.trim() ?? "";
  const nameFilter =
    needle.length === 0
      ? undefined
      : or(
          like(users.username, `%${needle}%`),
          like(students.fullName, `%${needle}%`),
          like(staff.firstName, `%${needle}%`),
          like(staff.lastName, `%${needle}%`),
        );
  const rows = await db
    .select({
      id: users.userId,
      username: users.username,
      role: users.role,
      studentName: students.fullName,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(users)
    .leftJoin(students, and(eq(students.userId, users.userId), eq(students.tenantId, tenantId)))
    .leftJoin(staff, and(eq(staff.userId, users.userId), eq(staff.tenantId, tenantId)))
    .where(scoped(users, tenantId, nameFilter))
    .orderBy(asc(users.username))
    .limit(200);

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    role: row.role,
    name: row.studentName ?? ([row.firstName, row.lastName].filter(Boolean).join(" ") || row.username),
  }));
}

export async function resetPassword(tenantId: number, userId: number, password: string): Promise<void> {
  const [user] = await db
    .select({ id: users.userId, tokenVersion: users.tokenVersion })
    .from(users)
    .where(scoped(users, tenantId, eq(users.userId, userId)))
    .limit(1);
  if (!user) throw new AdminError("NOT_FOUND");
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      passwordChanged: 0,
      tokenVersion: user.tokenVersion + 1,
    })
    .where(scoped(users, tenantId, eq(users.userId, userId)));
}

export async function getSchoolInfo(tenantId: number) {
  const [row] = await db
    .select({
      id: schoolSettings.id,
      schoolName: schoolSettings.schoolName,
      schoolVision: schoolSettings.schoolVision,
      schoolEmail: schoolSettings.schoolEmail,
      schoolPhone: schoolSettings.schoolPhone,
      schoolAddress: schoolSettings.schoolAddress,
      aboutText: schoolSettings.aboutText,
      schoolNeeds: schoolSettings.schoolNeeds,
      promoVideoUrl: schoolSettings.promoVideoUrl,
      schoolLogo: schoolSettings.schoolLogo,
    })
    .from(schoolSettings)
    .where(scoped(schoolSettings, tenantId))
    .limit(1);
  return row ?? null;
}

export async function updateSchoolInfo(tenantId: number, input: SchoolInfoInput) {
  const values = {
    schoolName: input.schoolName,
    schoolVision: blankToNull(input.schoolVision),
    schoolEmail: blankToNull(input.schoolEmail),
    schoolPhone: blankToNull(input.schoolPhone),
    schoolAddress: blankToNull(input.schoolAddress),
    aboutText: blankToNull(input.aboutText),
    schoolNeeds: blankToNull(input.schoolNeeds),
    promoVideoUrl: blankToNull(input.promoVideoUrl),
  };
  const current = await getSchoolInfo(tenantId);
  if (!current) throw new AdminError("NOT_FOUND");
  await db.update(schoolSettings).set(values).where(scoped(schoolSettings, tenantId, eq(schoolSettings.id, current.id)));
  return getSchoolInfo(tenantId);
}

function studentFilters(query: StudentQuery): SQL | undefined {
  const parts: SQL[] = [];
  if (query.academicYear) parts.push(eq(students.academicYear, query.academicYear));
  if (query.gradeLevel) parts.push(eq(students.gradeLevel, query.gradeLevel));
  if (query.section) parts.push(eq(students.section, query.section));
  if (query.gender) parts.push(eq(students.gender, query.gender));
  if (query.registrationType && isRegistrationType(query.registrationType)) {
    parts.push(eq(students.registrationType, query.registrationType));
  }
  return parts.length > 0 ? and(...parts) : undefined;
}

const studentColumns = {
  id: students.studentId,
  fullName: students.fullName,
  gender: students.gender,
  age: students.age,
  gradeLevel: students.gradeLevel,
  stream: students.stream,
  section: students.section,
  academicYear: students.academicYear,
  registrationType: students.registrationType,
  submissionStatus: students.submissionStatus,
  kebele: students.kebele,
  gote: students.gote,
};

export async function listStudents(tenantId: number, query: StudentQuery) {
  const [rows, academicYear] = await Promise.all([
    db
      .select({ ...studentColumns, isActive: users.isActive })
      .from(students)
      .leftJoin(users, and(eq(users.userId, students.userId), eq(users.tenantId, tenantId)))
      .where(scoped(students, tenantId, studentFilters(query)))
      .orderBy(asc(students.gradeLevel), asc(students.section), asc(students.fullName)),
    settingValue(tenantId, YEAR_KEY),
  ]);
  return { rows, total: rows.length, academicYear: academicYear ?? "" };
}

export async function listRepeaters(tenantId: number, query: StudentQuery) {
  const extra = and(ne(students.gradeLevel, 12), eq(students.registrationType, "ደጋሚ"), studentFilters(query));
  const rows = await db
    .select(studentColumns)
    .from(students)
    .where(scoped(students, tenantId, extra))
    .orderBy(asc(students.gradeLevel), asc(students.fullName));
  const male = rows.filter((row) => row.gender === "M").length;
  const female = rows.filter((row) => row.gender === "F").length;
  const [yearRows, gradeRows, sectionRows] = await Promise.all([
    db
      .selectDistinct({ academicYear: students.academicYear })
      .from(students)
      .where(scoped(students, tenantId))
      .orderBy(asc(students.academicYear)),
    db
      .selectDistinct({ gradeLevel: classes.gradeLevel })
      .from(classes)
      .where(scoped(classes, tenantId, ne(classes.gradeLevel, 12)))
      .orderBy(asc(classes.gradeLevel)),
    db
      .selectDistinct({ section: classes.section })
      .from(classes)
      .where(scoped(classes, tenantId))
      .orderBy(asc(classes.section)),
  ]);
  return {
    rows,
    total: rows.length,
    male,
    female,
    years: yearRows.map((row) => row.academicYear),
    grades: gradeRows.map((row) => row.gradeLevel),
    sections: sectionRows.map((row) => row.section),
    academicYear: (await settingValue(tenantId, YEAR_KEY)) ?? query.academicYear ?? "",
  };
}

export async function listTeachers(tenantId: number) {
  const academicYear = (await settingValue(tenantId, YEAR_KEY)) ?? "";
  const rows = await db
    .select({
      id: staff.staffId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      gender: staff.gender,
      jobTitle: staff.jobTitle,
      phoneNumber: staff.phoneNumber,
      salary: staff.salary,
      experienceYears: staff.experienceYears,
      isHomeroomAssigned: staff.isHomeroomAssigned,
      isApproved: staff.isApproved,
      isActive: users.isActive,
    })
    .from(staff)
    .innerJoin(users, and(eq(users.userId, staff.userId), eq(users.tenantId, tenantId)))
    // Legacy filter: role Teacher OR job title contains "Teacher".
    .where(scoped(staff, tenantId, or(eq(users.role, "Teacher"), like(staff.jobTitle, "%Teacher%"))))
    .orderBy(asc(staff.firstName), asc(staff.lastName));

  const yearFilter = academicYear ? eq(teacherAssignments.academicYear, academicYear) : undefined;
  const assignments = await db
    .select({
      staffId: teacherAssignments.staffId,
      subjectName: subjects.subjectName,
      creditHours: subjects.creditHours,
    })
    .from(teacherAssignments)
    .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(teacherAssignments, tenantId, yearFilter));

  const homes = await db
    .select({
      classTeacherId: classes.classTeacherId,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
    })
    .from(classes)
    .where(scoped(classes, tenantId));

  const loadByStaff = new Map<number, { subjects: Set<string>; hours: number }>();
  for (const row of assignments) {
    const entry = loadByStaff.get(row.staffId) ?? { subjects: new Set<string>(), hours: 0 };
    if (row.subjectName) entry.subjects.add(row.subjectName);
    entry.hours += row.creditHours;
    loadByStaff.set(row.staffId, entry);
  }
  const homeroomByStaff = new Map<number, string>();
  for (const row of homes) {
    if (row.classTeacherId != null && !homeroomByStaff.has(row.classTeacherId)) {
      homeroomByStaff.set(row.classTeacherId, `Grade ${row.gradeLevel} ${row.section}`);
    }
  }

  return {
    academicYear,
    total: rows.length,
    rows: rows.map((row) => {
      const load = loadByStaff.get(row.id);
      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        gender: row.gender,
        jobTitle: row.jobTitle,
        phoneNumber: row.phoneNumber,
        salary: Number(row.salary ?? 0),
        experienceYears: Number(row.experienceYears ?? 0),
        subjects: load ? [...load.subjects].join(", ") : "",
        loadHours: load?.hours ?? 0,
        homeroom: homeroomByStaff.get(row.id) ?? null,
        isHomeroomAssigned: row.isHomeroomAssigned === 1,
        isApproved: row.isApproved === 1,
        isActive: row.isActive === 1,
      };
    }),
  };
}

export async function updateTeacher(tenantId: number, staffId: number, input: TeacherUpdateInput): Promise<void> {
  const [member] = await db
    .select({ id: staff.staffId })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, staffId)))
    .limit(1);
  if (!member) throw new AdminError("NOT_FOUND");
  await db
    .update(staff)
    .set({
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      gender: input.gender,
      jobTitle: input.jobTitle,
      salary: input.salary.toFixed(2),
      experienceYears: input.experienceYears.toFixed(2),
    })
    .where(scoped(staff, tenantId, eq(staff.staffId, staffId)));
}

/** Legacy toggle: the client sends the current status and the new status is the opposite. */
export async function toggleTeacherStatus(tenantId: number, staffId: number, currentStatus: 0 | 1) {
  const [member] = await db
    .select({ userId: staff.userId, firstName: staff.firstName })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, staffId)))
    .limit(1);
  if (!member) throw new AdminError("NOT_FOUND");
  const nextStatus = currentStatus === 1 ? 0 : 1;
  if (member.userId != null) {
    await db
      .update(users)
      .set({ isActive: nextStatus })
      .where(scoped(users, tenantId, eq(users.userId, member.userId)));
  }
  return { firstName: member.firstName, isActive: nextStatus === 1 };
}

/** Legacy delete: free the homeroom, remove assignments, the staff row and the login user. */
export async function deleteTeacher(tenantId: number, staffId: number) {
  const [member] = await db
    .select({ userId: staff.userId, firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, staffId)))
    .limit(1);
  if (!member) throw new AdminError("NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx
      .update(classes)
      .set({ classTeacherId: null })
      .where(scoped(classes, tenantId, eq(classes.classTeacherId, staffId)));
    await tx.delete(teacherAssignments).where(scoped(teacherAssignments, tenantId, eq(teacherAssignments.staffId, staffId)));
    await tx.delete(staff).where(scoped(staff, tenantId, eq(staff.staffId, staffId)));
    if (member.userId != null) {
      await tx.delete(users).where(scoped(users, tenantId, eq(users.userId, member.userId)));
    }
  });
  return { name: `${member.firstName} ${member.lastName}` };
}

export async function listSchedule(tenantId: number) {
  const year = await settingValue(tenantId, YEAR_KEY);
  const yearFilter = year ? eq(classSchedule.academicYear, year) : undefined;
  const rows = await db
    .select({
      id: classSchedule.timetableId,
      academicYear: classSchedule.academicYear,
      dayOfWeek: classSchedule.dayOfWeek,
      periodNumber: classSchedule.periodNumber,
      startTime: classSchedule.startTime,
      endTime: classSchedule.endTime,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      subjectName: subjects.subjectName,
      teacherFirstName: staff.firstName,
      teacherLastName: staff.lastName,
    })
    .from(classSchedule)
    .leftJoin(classes, and(eq(classes.classId, classSchedule.classId), eq(classes.tenantId, tenantId)))
    .leftJoin(subjects, and(eq(subjects.subjectId, classSchedule.subjectId), eq(subjects.tenantId, tenantId)))
    .leftJoin(staff, and(eq(staff.staffId, classSchedule.teacherStaffId), eq(staff.tenantId, tenantId)))
    .where(scoped(classSchedule, tenantId, yearFilter))
    .orderBy(asc(classSchedule.dayOfWeek), asc(classSchedule.periodNumber));
  return {
    academicYear: year,
    rows: rows.map((row) => ({
      id: row.id,
      academicYear: row.academicYear,
      dayOfWeek: row.dayOfWeek,
      periodNumber: row.periodNumber,
      startTime: String(row.startTime),
      endTime: String(row.endTime),
      gradeLevel: row.gradeLevel,
      section: row.section,
      subjectName: row.subjectName,
      teacherName: [row.teacherFirstName, row.teacherLastName].filter(Boolean).join(" "),
    })),
  };
}

export async function listReports(tenantId: number) {
  const rows = await db
    .select({
      id: studentFinalReports.reportId,
      studentName: students.fullName,
      academicYear: studentFinalReports.academicYear,
      yearlyAvg: studentFinalReports.yearlyAvg,
      finalRank: studentFinalReports.finalRank,
      remark: studentFinalReports.remark,
    })
    .from(studentFinalReports)
    .innerJoin(students, and(eq(students.studentId, studentFinalReports.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(studentFinalReports, tenantId))
    .orderBy(asc(studentFinalReports.finalRank));
  return { rows, total: rows.length };
}

export async function unlockGrades(tenantId: number, input: GradeUnlockInput) {
  const studentFilter = input.studentId ? eq(grades.studentId, input.studentId) : undefined;
  const match = scoped(
    grades,
    tenantId,
    and(
      eq(grades.subjectId, input.subjectId),
      eq(grades.academicYear, input.academicYear),
      eq(grades.semester, input.semester),
      eq(grades.submissionStatus, "Submitted"),
      studentFilter,
    ),
  );
  const [existing] = await db.select({ total: count() }).from(grades).where(match);
  if (Number(existing?.total ?? 0) === 0) throw new AdminError("GRADE_NOT_FOUND");
  await db
    .update(grades)
    .set({ submissionStatus: "Draft", isSubmitted: 0, adminApproved: 0 })
    .where(match);
  return { updated: Number(existing?.total ?? 0) };
}

export async function listApprovals(tenantId: number) {
  const pendingStaff = await db
    .select({
      id: staff.staffId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      jobTitle: staff.jobTitle,
    })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.isApproved, 0)))
    .orderBy(asc(staff.firstName));

  const submitted = await db
    .select({
      gradeLevel: students.gradeLevel,
      gender: students.gender,
      registrationType: students.registrationType,
    })
    .from(students)
    .where(scoped(students, tenantId, eq(students.submissionStatus, "Submitted")));

  const registration = new Map<string, { gradeLevel: number; registrationType: string; male: number; female: number }>();
  for (const row of submitted) {
    const type = row.registrationType ?? "";
    const key = `${row.gradeLevel}:${type}`;
    const current = registration.get(key) ?? { gradeLevel: row.gradeLevel, registrationType: type, male: 0, female: 0 };
    if (row.gender === "M") current.male += 1;
    if (row.gender === "F") current.female += 1;
    registration.set(key, current);
  }

  const attendanceRows = await db
    .select({ recordedBy: attendance.recordedBy, total: count() })
    .from(attendance)
    .where(scoped(attendance, tenantId, eq(attendance.approvalStatus, "Pending")))
    .groupBy(attendance.recordedBy);

  return {
    academicYear: await settingValue(tenantId, YEAR_KEY),
    staff: pendingStaff,
    registration: [...registration.values()].map((row) => ({ ...row, total: row.male + row.female })),
    attendance: attendanceRows.map((row) => ({ recordedBy: row.recordedBy, total: Number(row.total) })),
  };
}

export async function approveStaff(tenantId: number, staffId: number): Promise<void> {
  const [member] = await db
    .select({ id: staff.staffId, userId: staff.userId })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, staffId)))
    .limit(1);
  if (!member) throw new AdminError("NOT_FOUND");
  const stamp = nowStamp();
  await db
    .update(staff)
    .set({ isApproved: 1, approvalDate: stamp })
    .where(scoped(staff, tenantId, eq(staff.staffId, staffId)));
  if (member.userId) {
    await db
      .update(users)
      .set({ isActive: 1 })
      .where(scoped(users, tenantId, eq(users.userId, member.userId)));
  }
}

export async function approveStudents(tenantId: number, userId: number, gradeLevel: number) {
  const year = await settingValue(tenantId, YEAR_KEY);
  const yearFilter = year ? eq(students.academicYear, year) : undefined;
  const match = scoped(
    students,
    tenantId,
    and(eq(students.gradeLevel, gradeLevel), eq(students.submissionStatus, "Submitted"), yearFilter),
  );
  const pending = await db.select({ id: students.studentId, userId: students.userId }).from(students).where(match);
  if (pending.length === 0) throw new AdminError("NOT_FOUND");
  const stamp = nowStamp();
  await db
    .update(students)
    .set({ submissionStatus: "Approved", isApproved: 1, approvedBy: userId, approvalDate: stamp })
    .where(match);
  const userIds = pending.flatMap((row) => (row.userId ? [row.userId] : []));
  if (userIds.length > 0) {
    await db.update(users).set({ isActive: 1 }).where(scoped(users, tenantId, inArray(users.userId, userIds)));
  }
  return { updated: pending.length };
}

export async function approveAttendance(
  tenantId: number,
  userId: number,
  recordedBy: number,
  startDate: string,
  endDate: string,
) {
  const match = scoped(
    attendance,
    tenantId,
    and(
      eq(attendance.recordedBy, recordedBy),
      eq(attendance.approvalStatus, "Pending"),
      gte(attendance.date, startDate),
      lte(attendance.date, endDate),
    ),
  );
  const [existing] = await db.select({ total: count() }).from(attendance).where(match);
  if (Number(existing?.total ?? 0) === 0) throw new AdminError("NOT_FOUND");
  await db
    .update(attendance)
    .set({ approvalStatus: "Approved", approvedBy: userId, approvalDate: nowStamp() })
    .where(match);
  return { updated: Number(existing?.total ?? 0) };
}

export async function listFiles(tenantId: number) {
  const rows = await db
    .select({
      id: staffFiles.fileId,
      title: staffFiles.fileTitle,
      category: staffFiles.fileCategory,
      fileType: staffFiles.fileType,
      uploadDate: staffFiles.uploadDate,
      targetRole: staffFiles.targetRole,
      academicYear: staffFiles.academicYear,
    })
    .from(staffFiles)
    .where(scoped(staffFiles, tenantId))
    .orderBy(asc(staffFiles.fileTitle));
  return { rows, total: rows.length };
}

export async function getProfile(tenantId: number, userId: number) {
  const [user] = await db
    .select({ username: users.username, role: users.role })
    .from(users)
    .where(scoped(users, tenantId, eq(users.userId, userId)))
    .limit(1);
  if (!user) throw new AdminError("NOT_FOUND");
  const [member] = await db
    .select({ firstName: staff.firstName, lastName: staff.lastName, photo: staff.photo })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.userId, userId)))
    .limit(1);
  const [student] = await db
    .select({ fullName: students.fullName, photo: students.photo })
    .from(students)
    .where(scoped(students, tenantId, eq(students.userId, userId)))
    .limit(1);
  return {
    username: user.username,
    role: user.role,
    name: student?.fullName ?? ([member?.firstName, member?.lastName].filter(Boolean).join(" ") || user.username),
    photo: student?.photo ?? member?.photo ?? null,
  };
}

export async function updateProfile(tenantId: number, userId: number, input: ProfileInput) {
  const [user] = await db
    .select({ tokenVersion: users.tokenVersion })
    .from(users)
    .where(scoped(users, tenantId, eq(users.userId, userId)))
    .limit(1);
  if (!user) throw new AdminError("NOT_FOUND");
  const password = input.password?.trim() ?? "";
  try {
    await db
      .update(users)
      .set({
        username: input.username,
        ...(password
          ? { passwordHash: await hashPassword(password), passwordChanged: 1, tokenVersion: user.tokenVersion + 1 }
          : {}),
      })
      .where(scoped(users, tenantId, eq(users.userId, userId)));
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new AdminError("USERNAME_TAKEN");
    throw error;
  }
  return getProfile(tenantId, userId);
}

export async function listIncome(tenantId: number) {
  const rows = await db
    .select({
      id: income.incomeId,
      source: income.source,
      amount: income.amount,
      dateReceived: income.dateReceived,
    })
    .from(income)
    .where(scoped(income, tenantId))
    .orderBy(asc(income.dateReceived));
  return { rows, total: rows.length };
}

export async function createIncome(tenantId: number, userId: number, input: IncomeInput) {
  const result = await db.insert(income).values(
    withTenant(
      { source: input.source, amount: input.amount, dateReceived: input.dateReceived, recordedBy: userId },
      tenantId,
    ),
  );
  return { id: Number(result[0].insertId) };
}

export async function listExpenses(tenantId: number) {
  const rows = await db
    .select({
      id: expenses.expenseId,
      category: expenses.category,
      amount: expenses.amount,
      datePaid: expenses.datePaid,
      description: expenses.description,
    })
    .from(expenses)
    .where(scoped(expenses, tenantId))
    .orderBy(asc(expenses.datePaid));
  return { rows, total: rows.length };
}

export async function createExpense(tenantId: number, userId: number, input: ExpenseInput) {
  const result = await db.insert(expenses).values(
    withTenant(
      {
        category: input.category,
        amount: input.amount,
        datePaid: input.datePaid,
        description: blankToNull(input.description),
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  return { id: Number(result[0].insertId) };
}

type ClassStream = "Natural" | "Social";

async function teacherOwnsAnotherClass(tenantId: number, teacherId: number, exceptClassId?: number): Promise<boolean> {
  const except = exceptClassId === undefined ? undefined : ne(classes.classId, exceptClassId);
  const [row] = await db
    .select({ id: classes.classId })
    .from(classes)
    .where(scoped(classes, tenantId, and(eq(classes.classTeacherId, teacherId), except)))
    .limit(1);
  return row !== undefined;
}

async function setHomeroomFlag(tenantId: number, teacherId: number | null, value: 0 | 1): Promise<void> {
  if (!teacherId) return;
  await db
    .update(staff)
    .set({ isHomeroomAssigned: value })
    .where(scoped(staff, tenantId, eq(staff.staffId, teacherId)));
}

async function releaseHomeroom(tenantId: number, teacherId: number | null): Promise<void> {
  if (!teacherId) return;
  if (!(await teacherOwnsAnotherClass(tenantId, teacherId))) {
    await setHomeroomFlag(tenantId, teacherId, 0);
  }
}

async function requireStaff(tenantId: number, staffId: number): Promise<void> {
  const [member] = await db
    .select({ id: staff.staffId })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, staffId)))
    .limit(1);
  if (!member) throw new AdminError("NOT_FOUND");
}

function duplicateClassCode(error: unknown, code: "CLASS_EXISTS" | "GRADE_SECTION_EXISTS"): never {
  if (mysqlErrno(error) === ER_DUP_ENTRY) throw new AdminError(code);
  throw error;
}

export async function listClasses(tenantId: number) {
  const academicYear = (await settingValue(tenantId, YEAR_KEY)) ?? "";
  const yearFilter = academicYear ? eq(students.academicYear, academicYear) : undefined;
  const assignmentYear = academicYear ? eq(teacherAssignments.academicYear, academicYear) : undefined;

  const [classRows, studentRows, teacherRows, assignmentRows] = await Promise.all([
    db
      .select({
        id: classes.classId,
        gradeLevel: classes.gradeLevel,
        section: classes.section,
        stream: classes.stream,
        classTeacherId: classes.classTeacherId,
        maxCapacity: classes.maxCapacity,
        teacherFirstName: staff.firstName,
        teacherLastName: staff.lastName,
      })
      .from(classes)
      .leftJoin(staff, and(eq(staff.staffId, classes.classTeacherId), eq(staff.tenantId, tenantId)))
      .where(scoped(classes, tenantId))
      .orderBy(asc(classes.gradeLevel), asc(classes.section), asc(classes.stream)),
    db
      .select({ gradeLevel: students.gradeLevel, section: students.section, stream: students.stream })
      .from(students)
      .where(scoped(students, tenantId, yearFilter)),
    db
      .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName })
      .from(staff)
      .innerJoin(users, and(eq(users.userId, staff.userId), eq(users.tenantId, tenantId)))
      .where(scoped(staff, tenantId, eq(users.role, "Teacher")))
      .orderBy(asc(staff.firstName), asc(staff.lastName)),
    db
      .select({
        staffId: teacherAssignments.staffId,
        gradeLevel: teacherAssignments.gradeLevel,
        section: teacherAssignments.section,
        subjectName: subjects.subjectName,
        subjectGrade: subjects.gradeLevel,
        subjectStream: subjects.stream,
        creditHours: subjects.creditHours,
        firstName: staff.firstName,
        lastName: staff.lastName,
      })
      .from(teacherAssignments)
      .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
      .innerJoin(staff, and(eq(staff.staffId, teacherAssignments.staffId), eq(staff.tenantId, tenantId)))
      .where(scoped(teacherAssignments, tenantId, assignmentYear)),
  ]);

  const workload = new Map<number, { assignments: number; credits: number }>();
  for (const row of assignmentRows) {
    const current = workload.get(row.staffId) ?? { assignments: 0, credits: 0 };
    current.assignments += 1;
    current.credits += row.creditHours;
    workload.set(row.staffId, current);
  }

  const homeroomOwner = new Map<number, number>();
  for (const row of classRows) {
    if (row.classTeacherId != null) homeroomOwner.set(row.classTeacherId, row.id);
  }

  const rows = classRows.map((row) => {
    const stream = row.stream;
    const studentCount = studentRows.filter((student) => {
      if (student.gradeLevel !== row.gradeLevel || (student.section ?? "") !== row.section) return false;
      if (stream == null) return student.stream == null || student.stream === "";
      return student.stream == null || student.stream === "" || student.stream === stream;
    }).length;
    const load = row.classTeacherId == null ? undefined : workload.get(row.classTeacherId);
    const recommendations = recommendationsFor(row.id, row.gradeLevel, row.section, stream, assignmentRows, workload, homeroomOwner);
    return {
      id: row.id,
      gradeLevel: row.gradeLevel,
      section: row.section,
      stream,
      classTeacherId: row.classTeacherId,
      teacherName: [row.teacherFirstName, row.teacherLastName].filter(Boolean).join(" ").trim(),
      maxCapacity: row.maxCapacity ?? 59,
      studentCount,
      yearAssignmentCount: load?.assignments ?? 0,
      yearTotalCredits: load?.credits ?? 0,
      recommendations,
    };
  });

  return {
    academicYear,
    teachers: teacherRows.map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}`.trim() })),
    rows,
  };
}

type AssignmentPick = {
  staffId: number;
  gradeLevel: number;
  section: string | null;
  subjectName: string;
  subjectGrade: number;
  subjectStream: "Natural" | "Social" | "Common";
  creditHours: number;
  firstName: string;
  lastName: string;
};

function recommendationsFor(
  classId: number,
  gradeLevel: number,
  section: string,
  stream: ClassStream | null,
  assignments: AssignmentPick[],
  workload: Map<number, { assignments: number; credits: number }>,
  homeroomOwner: Map<number, number>,
) {
  const byStaff = new Map<number, { name: string; subjects: Map<string, number> }>();
  for (const row of assignments) {
    if (row.gradeLevel !== gradeLevel || (row.section ?? "") !== section) continue;
    if (row.subjectGrade !== gradeLevel) continue;
    if (row.subjectStream !== "Common" && row.subjectStream !== stream) continue;
    const owner = homeroomOwner.get(row.staffId);
    if (owner !== undefined && owner !== classId) continue;
    const entry = byStaff.get(row.staffId) ?? { name: `${row.firstName} ${row.lastName}`.trim(), subjects: new Map() };
    entry.subjects.set(row.subjectName, row.creditHours);
    byStaff.set(row.staffId, entry);
  }

  return [...byStaff.entries()]
    .map(([staffId, entry]) => {
      const load = workload.get(staffId) ?? { assignments: 0, credits: 0 };
      return {
        staffId,
        teacherName: entry.name,
        totalYearAssignments: load.assignments,
        totalYearCredits: load.credits,
        matchingSubjectCount: entry.subjects.size,
        matchingSubjects: [...entry.subjects.entries()].map(([name, credits]) => `${name} (${credits} cr)`).join(", "),
      };
    })
    .sort(
      (left, right) =>
        left.totalYearCredits - right.totalYearCredits ||
        left.totalYearAssignments - right.totalYearAssignments ||
        right.matchingSubjectCount - left.matchingSubjectCount ||
        left.teacherName.localeCompare(right.teacherName),
    );
}

export async function createBaseClass(tenantId: number, input: BaseClassInput) {
  try {
    const result = await db.insert(classes).values(
      withTenant({ gradeLevel: input.gradeLevel, section: input.section, stream: null, maxCapacity: 59 }, tenantId),
    );
    return { id: Number(result[0].insertId) };
  } catch (error) {
    duplicateClassCode(error, "GRADE_SECTION_EXISTS");
  }
}

export async function createClass(tenantId: number, input: ClassInput) {
  if (input.classTeacherId) {
    await requireStaff(tenantId, input.classTeacherId);
    if (await teacherOwnsAnotherClass(tenantId, input.classTeacherId)) throw new AdminError("TEACHER_ASSIGNED");
  }
  try {
    const result = await db.insert(classes).values(
      withTenant(
        {
          gradeLevel: input.gradeLevel,
          section: input.section,
          stream: input.stream,
          classTeacherId: input.classTeacherId,
          maxCapacity: input.maxCapacity,
        },
        tenantId,
      ),
    );
    if (input.classTeacherId) await setHomeroomFlag(tenantId, input.classTeacherId, 1);
    return { id: Number(result[0].insertId) };
  } catch (error) {
    duplicateClassCode(error, "CLASS_EXISTS");
  }
}

export async function updateClass(tenantId: number, classId: number, input: ClassInput) {
  const [current] = await db
    .select({ classTeacherId: classes.classTeacherId })
    .from(classes)
    .where(scoped(classes, tenantId, eq(classes.classId, classId)))
    .limit(1);
  if (!current) throw new AdminError("NOT_FOUND");
  if (input.classTeacherId) {
    await requireStaff(tenantId, input.classTeacherId);
    if (await teacherOwnsAnotherClass(tenantId, input.classTeacherId, classId)) throw new AdminError("TEACHER_ASSIGNED");
  }
  try {
    await db
      .update(classes)
      .set({
        gradeLevel: input.gradeLevel,
        section: input.section,
        stream: input.stream,
        classTeacherId: input.classTeacherId,
        maxCapacity: input.maxCapacity,
      })
      .where(scoped(classes, tenantId, eq(classes.classId, classId)));
  } catch (error) {
    duplicateClassCode(error, "CLASS_EXISTS");
  }
  const previous = current.classTeacherId;
  if (previous && previous !== input.classTeacherId) await releaseHomeroom(tenantId, previous);
  if (input.classTeacherId) await setHomeroomFlag(tenantId, input.classTeacherId, 1);
}

export async function deleteClass(tenantId: number, classId: number) {
  const [current] = await db
    .select({ classTeacherId: classes.classTeacherId })
    .from(classes)
    .where(scoped(classes, tenantId, eq(classes.classId, classId)))
    .limit(1);
  if (!current) throw new AdminError("NOT_FOUND");
  try {
    await db.delete(classes).where(scoped(classes, tenantId, eq(classes.classId, classId)));
  } catch (error) {
    if (mysqlErrno(error) === ER_ROW_IS_REFERENCED) throw new AdminError("CLASS_IN_USE");
    throw error;
  }
  await releaseHomeroom(tenantId, current.classTeacherId);
}

export async function assignHomeroom(tenantId: number, classId: number, input: HomeroomInput) {
  const [current] = await db
    .select({ classTeacherId: classes.classTeacherId })
    .from(classes)
    .where(scoped(classes, tenantId, eq(classes.classId, classId)))
    .limit(1);
  if (!current) throw new AdminError("NOT_FOUND");
  if (input.teacherId) {
    await requireStaff(tenantId, input.teacherId);
    if (await teacherOwnsAnotherClass(tenantId, input.teacherId, classId)) throw new AdminError("TEACHER_IN_USE");
  }
  await db
    .update(classes)
    .set({ classTeacherId: input.teacherId })
    .where(scoped(classes, tenantId, eq(classes.classId, classId)));
  const previous = current.classTeacherId;
  if (previous && previous !== input.teacherId) await releaseHomeroom(tenantId, previous);
  if (input.teacherId) await setHomeroomFlag(tenantId, input.teacherId, 1);
}

export function listRoleModules() {
  return PERMISSIONS.map((permission) => ({
    permission,
    roles: ROLES.filter((role) => permissionsForRole(role).includes(permission)),
  }));
}

export function refuseBackup(): never {
  throw new AdminError("BACKUP_BLOCKED");
}
