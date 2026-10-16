import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  annualLessonPlan,
  attendance,
  classes,
  classSchedule,
  departmentHeads,
  grades,
  libraryBooks,
  libraryBorrowing,
  staff,
  students,
  subjects,
  tcBookRecommendations,
  tcExamStandards,
  tcGradeReviews,
  tcIncidents,
  tcLeaveRequests,
  tcPaperItems,
  tcPapers,
  tcParticipation,
  tcPerformance,
  tcPerformanceScores,
  tcQuestions,
  tcRequisitions,
  tcSubstitutions,
  tcSwaps,
  tcTopicCoverage,
  teacherAssignments,
  vpReferrals,
} from "../../db/schema/index.js";
import { ER_DUP_ENTRY, mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type {
  CoverageInput,
  EvaluationInput,
  IncidentInput,
  LeaveInput,
  PaperInput,
  ParticipationInput,
  QuestionInput,
  RecommendationInput,
  RequisitionInput,
  StandardInput,
  SubstitutionInput,
  SwapInput,
  SyncInput,
} from "./office.schema.js";
import {
  CRITERIA,
  coverBlocked,
  coveragePercent,
  evaluationTotal,
  pickQuestions,
  rangesOverlap,
  subjectInDepartment,
  swapBlocked,
  syncPlan,
  type Department,
  type SlotRef,
} from "./officeRules.js";
import { loadTeacherContext, type TeacherContext } from "./teacher.service.js";

export type OfficeErrorCode =
  | "NOT_FOUND"
  | "NOT_ASSIGNED"
  | "NOT_HOMEROOM"
  | "NOT_HEAD"
  | "LEAVE_OVERLAP"
  | "NOT_READY"
  | "ALREADY_MARKED"
  | "NOT_ENOUGH"
  | "ALREADY_RECOMMENDED"
  | "SWAP_BUSY"
  | "COVER_BUSY"
  | "SELF"
  | "SCORE_OVER"
  | "ALREADY_EVALUATED"
  | "WRONG_DAY"
  | "SUBSTITUTION_OPEN";

export class OfficeError extends Error {
  readonly code: OfficeErrorCode;

  constructor(code: OfficeErrorCode) {
    super(code);
    this.code = code;
  }
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Taught = { subjectId: number; subjectName: string; gradeLevel: number; section: string };

function insertId(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const header = result[0] as { insertId?: number } | undefined;
  return Number(header?.insertId ?? 0);
}

function personName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

function today(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function clock(value: string): string {
  return value.slice(0, 5);
}

function money(value: number): string {
  return value.toFixed(2);
}

async function contextOf(tenantId: number, userId: number): Promise<TeacherContext> {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) throw new OfficeError("NOT_ASSIGNED");
  return context;
}

async function taughtRows(tenantId: number, staffId: number, year: string): Promise<Taught[]> {
  const rows = await db
    .select({
      subjectId: teacherAssignments.subjectId,
      subjectName: subjects.subjectName,
      gradeLevel: teacherAssignments.gradeLevel,
      section: teacherAssignments.section,
    })
    .from(teacherAssignments)
    .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(
        teacherAssignments,
        tenantId,
        and(eq(teacherAssignments.staffId, staffId), eq(teacherAssignments.academicYear, year)),
      ),
    );
  return rows.map((row) => ({
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    gradeLevel: row.gradeLevel,
    section: row.section?.trim() ?? "",
  }));
}

function teaches(rows: readonly Taught[], subjectId: number, grade: number, section: string): boolean {
  return rows.some(
    (row) => row.subjectId === subjectId && row.gradeLevel === grade && (row.section === "" || row.section === section),
  );
}

async function departmentOf(tenantId: number, staffId: number, year: string): Promise<Department | null> {
  const [row] = await db
    .select({ department: departmentHeads.department })
    .from(departmentHeads)
    .where(
      scoped(departmentHeads, tenantId, and(eq(departmentHeads.staffId, staffId), eq(departmentHeads.academicYear, year))),
    )
    .limit(1);
  return row?.department ?? null;
}

async function requireHead(tenantId: number, staffId: number, year: string): Promise<Department> {
  const department = await departmentOf(tenantId, staffId, year);
  if (!department) throw new OfficeError("NOT_HEAD");
  return department;
}

async function subjectCatalog(tenantId: number) {
  return db
    .select({ id: subjects.subjectId, name: subjects.subjectName })
    .from(subjects)
    .where(scoped(subjects, tenantId))
    .orderBy(asc(subjects.subjectName));
}

function idsInDepartment(catalog: readonly { id: number; name: string }[], department: Department): number[] {
  return catalog.filter((row) => subjectInDepartment(row.name, department)).map((row) => row.id);
}

async function studentRow(tenantId: number, studentId: number) {
  const [row] = await db
    .select({
      id: students.studentId,
      name: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
      year: students.academicYear,
      userId: students.userId,
      stream: students.stream,
    })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  return row ?? null;
}

async function homeroomRooms(tenantId: number, staffId: number) {
  return db
    .select({
      id: classes.classId,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      stream: classes.stream,
    })
    .from(classes)
    .where(scoped(classes, tenantId, eq(classes.classTeacherId, staffId)))
    .orderBy(asc(classes.gradeLevel), asc(classes.section));
}

async function slotRows(tenantId: number, year: string) {
  return db
    .select({
      id: classSchedule.timetableId,
      day: classSchedule.dayOfWeek,
      period: classSchedule.periodNumber,
      startTime: classSchedule.startTime,
      endTime: classSchedule.endTime,
      teacherId: classSchedule.teacherStaffId,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      subject: subjects.subjectName,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(classSchedule)
    .innerJoin(classes, and(eq(classes.classId, classSchedule.classId), eq(classes.tenantId, tenantId)))
    .leftJoin(subjects, and(eq(subjects.subjectId, classSchedule.subjectId), eq(subjects.tenantId, tenantId)))
    .leftJoin(staff, and(eq(staff.staffId, classSchedule.teacherStaffId), eq(staff.tenantId, tenantId)))
    .where(scoped(classSchedule, tenantId, eq(classSchedule.academicYear, year)));
}

function asSlots(rows: Awaited<ReturnType<typeof slotRows>>): SlotRef[] {
  return rows.map((row) => ({ id: row.id, day: row.day, period: row.period, teacherId: row.teacherId }));
}

async function insertOrDup(run: () => Promise<number>, code: OfficeErrorCode): Promise<number> {
  try {
    return await run();
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new OfficeError(code);
    throw error;
  }
}

export async function attendanceBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  const groups = [];
  for (const row of taught) {
    const filters = [
      eq(students.academicYear, context.academicYear),
      eq(students.gradeLevel, row.gradeLevel),
      ...(row.section ? [eq(students.section, row.section)] : []),
    ];
    const people = await db
      .select({ id: students.studentId, name: students.fullName })
      .from(students)
      .where(scoped(students, tenantId, and(...filters)))
      .orderBy(asc(students.fullName));
    groups.push({
      subjectId: row.subjectId,
      subject: row.subjectName,
      classLabel: `Grade ${row.gradeLevel}${row.section ? ` ${row.section}` : ""}`,
      students: people,
    });
  }
  return { academicYear: context.academicYear, groups };
}

export async function syncAttendance(tenantId: number, userId: number, input: SyncInput) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  const ready: { key: string; studentId: number; subjectId: number; date: string; status: "P" | "A" | "T" }[] = [];
  const conflicts: { studentId: number; subjectId: number; date: string; code: "NOT_ASSIGNED" | "ALREADY_APPROVED" }[] = [];

  for (const mark of input.marks) {
    const student = await studentRow(tenantId, mark.studentId);
    const allowed =
      student != null &&
      student.year === context.academicYear &&
      teaches(taught, mark.subjectId, student.gradeLevel, student.section?.trim() ?? "");
    if (!allowed) {
      conflicts.push({ studentId: mark.studentId, subjectId: mark.subjectId, date: mark.date, code: "NOT_ASSIGNED" });
      continue;
    }
    ready.push({ key: `${mark.studentId}|${mark.subjectId}|${mark.date}`, ...mark });
  }

  if (ready.length === 0) return { synced: 0, conflicts };

  const studentIds = [...new Set(ready.map((row) => row.studentId))];
  const existing = await db
    .select({
      id: attendance.attId,
      studentId: attendance.studentId,
      subjectId: attendance.subjectId,
      date: attendance.date,
      approval: attendance.approvalStatus,
    })
    .from(attendance)
    .where(scoped(attendance, tenantId, inArray(attendance.studentId, studentIds)));

  const known = existing
    .filter((row) => row.subjectId != null)
    .map((row) => ({
      id: row.id,
      key: `${row.studentId}|${row.subjectId}|${row.date}`,
      approval: row.approval,
    }));
  const plan = syncPlan(known, ready);
  for (const row of plan.conflicts) {
    conflicts.push({ studentId: row.studentId, subjectId: row.subjectId, date: row.date, code: "ALREADY_APPROVED" });
  }

  let synced = 0;
  for (const row of plan.apply) {
    const matches = known.filter((item) => item.key === row.key);
    if (row.exists && matches.length > 0) {
      await db
        .update(attendance)
        .set({ status: row.status, approvalStatus: "Pending", recordedBy: context.staffId, rejectionReason: null })
        .where(
          scoped(
            attendance,
            tenantId,
            inArray(
              attendance.attId,
              matches.map((item) => item.id),
            ),
          ),
        );
    } else {
      await db.insert(attendance).values(
        withTenant(
          {
            studentId: row.studentId,
            date: row.date,
            status: row.status,
            approvalStatus: "Pending" as const,
            recordedBy: context.staffId,
            subjectId: row.subjectId,
          },
          tenantId,
        ),
      );
    }
    synced += 1;
  }
  return { synced, conflicts };
}

export async function timetableView(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const rows = await slotRows(tenantId, context.academicYear);
  rows.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.period - b.period);
  const school = rows.map((row) => ({
    id: row.id,
    day: row.day,
    period: row.period,
    start: clock(row.startTime),
    end: clock(row.endTime),
    classLabel: `Grade ${row.gradeLevel} ${row.section}`,
    subject: row.subject ?? "",
    teacherId: row.teacherId,
    teacherName: row.firstName ? personName(row.firstName, row.lastName ?? "") : "",
  }));
  const covers = await db
    .select({
      id: tcSubstitutions.substitutionId,
      timetableId: tcSubstitutions.timetableId,
      coverDate: tcSubstitutions.coverDate,
      substituteStaffId: tcSubstitutions.substituteStaffId,
      reason: tcSubstitutions.reason,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(tcSubstitutions)
    .innerJoin(staff, and(eq(staff.staffId, tcSubstitutions.substituteStaffId), eq(staff.tenantId, tenantId)))
    .where(scoped(tcSubstitutions, tenantId, eq(tcSubstitutions.status, "Active")));
  const teachers = await db
    .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.role, "Teacher")))
    .orderBy(asc(staff.firstName), asc(staff.lastName));
  return {
    academicYear: context.academicYear,
    mine: school.filter((row) => row.teacherId === context.staffId),
    school,
    substitutions: covers.map((row) => ({
      id: row.id,
      timetableId: row.timetableId,
      coverDate: row.coverDate,
      substituteStaffId: row.substituteStaffId,
      substituteName: personName(row.firstName, row.lastName),
      reason: row.reason,
    })),
    teachers: teachers.map((row) => ({ id: row.id, name: personName(row.firstName, row.lastName) })),
  };
}

export async function swapPeriods(tenantId: number, userId: number, input: SwapInput) {
  const context = await contextOf(tenantId, userId);
  const rows = await slotRows(tenantId, context.academicYear);
  const slots = asSlots(rows);
  const left = slots.find((row) => row.id === input.leftId);
  const right = slots.find((row) => row.id === input.rightId);
  if (!left || !right) throw new OfficeError("NOT_FOUND");
  if (left.teacherId !== context.staffId && right.teacherId !== context.staffId) throw new OfficeError("NOT_ASSIGNED");
  const open = await db
    .select({ id: tcSubstitutions.substitutionId })
    .from(tcSubstitutions)
    .where(
      scoped(
        tcSubstitutions,
        tenantId,
        and(eq(tcSubstitutions.status, "Active"), inArray(tcSubstitutions.timetableId, [left.id, right.id])),
      ),
    )
    .limit(1);
  if (open.length > 0) throw new OfficeError("SUBSTITUTION_OPEN");
  const others = slots.filter((row) => row.id !== left.id && row.id !== right.id);
  if (swapBlocked(left, right, others)) throw new OfficeError("SWAP_BUSY");
  await db.transaction(async (tx) => {
    await tx
      .update(classSchedule)
      .set({ teacherStaffId: right.teacherId })
      .where(scoped(classSchedule, tenantId, eq(classSchedule.timetableId, left.id)));
    await tx
      .update(classSchedule)
      .set({ teacherStaffId: left.teacherId })
      .where(scoped(classSchedule, tenantId, eq(classSchedule.timetableId, right.id)));
    await tx.insert(tcSwaps).values(
      withTenant(
        {
          leftTimetableId: left.id,
          rightTimetableId: right.id,
          academicYear: context.academicYear,
          recordedBy: context.staffId,
        },
        tenantId,
      ),
    );
  });
  return { id: left.id };
}

export async function addSubstitution(tenantId: number, userId: number, input: SubstitutionInput) {
  const context = await contextOf(tenantId, userId);
  const rows = await slotRows(tenantId, context.academicYear);
  const slots = asSlots(rows);
  const slot = slots.find((row) => row.id === input.timetableId);
  if (!slot) throw new OfficeError("NOT_FOUND");
  if (slot.teacherId !== context.staffId) throw new OfficeError("NOT_ASSIGNED");
  const [substitute] = await db
    .select({ id: staff.staffId })
    .from(staff)
    .where(scoped(staff, tenantId, and(eq(staff.staffId, input.substituteStaffId), eq(staff.role, "Teacher"))))
    .limit(1);
  if (!substitute) throw new OfficeError("NOT_FOUND");
  const active = await db
    .select({
      timetableId: tcSubstitutions.timetableId,
      coverDate: tcSubstitutions.coverDate,
      staffId: tcSubstitutions.substituteStaffId,
    })
    .from(tcSubstitutions)
    .where(scoped(tcSubstitutions, tenantId, eq(tcSubstitutions.status, "Active")));
  const sameSlot = active.some((row) => row.timetableId === slot.id && row.coverDate === input.coverDate);
  if (sameSlot) throw new OfficeError("COVER_BUSY");
  const covers = active.map((row) => {
    const source = slots.find((item) => item.id === row.timetableId);
    return { staffId: row.staffId, date: row.coverDate, day: source?.day ?? "", period: source?.period ?? 0 };
  });
  const block = coverBlocked(slot, input.substituteStaffId, input.coverDate, slots, covers);
  if (block === "WRONG_DAY") throw new OfficeError("WRONG_DAY");
  if (block === "SELF") throw new OfficeError("SELF");
  if (block === "COVER_BUSY") throw new OfficeError("COVER_BUSY");
  const id = insertId(
    await db.insert(tcSubstitutions).values(
      withTenant(
        {
          timetableId: slot.id,
          coverDate: input.coverDate,
          substituteStaffId: input.substituteStaffId,
          reason: input.reason,
          status: "Active" as const,
          recordedBy: context.staffId,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function cancelSubstitution(tenantId: number, userId: number, substitutionId: number) {
  const context = await contextOf(tenantId, userId);
  const [row] = await db
    .select({
      id: tcSubstitutions.substitutionId,
      timetableId: tcSubstitutions.timetableId,
      status: tcSubstitutions.status,
      recordedBy: tcSubstitutions.recordedBy,
    })
    .from(tcSubstitutions)
    .where(scoped(tcSubstitutions, tenantId, eq(tcSubstitutions.substitutionId, substitutionId)))
    .limit(1);
  if (!row) throw new OfficeError("NOT_FOUND");
  if (row.status !== "Active") throw new OfficeError("NOT_READY");
  const [slot] = await db
    .select({ teacherId: classSchedule.teacherStaffId })
    .from(classSchedule)
    .where(scoped(classSchedule, tenantId, eq(classSchedule.timetableId, row.timetableId)))
    .limit(1);
  if (row.recordedBy !== context.staffId && slot?.teacherId !== context.staffId) throw new OfficeError("NOT_ASSIGNED");
  await db
    .update(tcSubstitutions)
    .set({ status: "Cancelled" })
    .where(scoped(tcSubstitutions, tenantId, eq(tcSubstitutions.substitutionId, row.id)));
  return { id: row.id };
}

async function incidentList(tenantId: number, where: ReturnType<typeof eq> | undefined) {
  return db
    .select({
      id: tcIncidents.incidentId,
      studentId: tcIncidents.studentId,
      studentName: students.fullName,
      subjectId: tcIncidents.subjectId,
      subject: subjects.subjectName,
      category: tcIncidents.category,
      summary: tcIncidents.summary,
      status: tcIncidents.status,
      recordedBy: tcIncidents.recordedBy,
    })
    .from(tcIncidents)
    .innerJoin(students, and(eq(students.studentId, tcIncidents.studentId), eq(students.tenantId, tenantId)))
    .innerJoin(subjects, and(eq(subjects.subjectId, tcIncidents.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(tcIncidents, tenantId, where))
    .orderBy(asc(tcIncidents.incidentId));
}

export async function incidentBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const mine = await incidentList(tenantId, eq(tcIncidents.recordedBy, context.staffId));
  const department = await departmentOf(tenantId, context.staffId, context.academicYear);
  if (!department) return { mine, inbox: [] };
  const catalog = await subjectCatalog(tenantId);
  const ids = idsInDepartment(catalog, department);
  if (ids.length === 0) return { mine, inbox: [] };
  const inbox = (await incidentList(tenantId, inArray(tcIncidents.subjectId, ids))).filter((row) => row.status === "Open");
  return { mine, inbox };
}

export async function reportIncident(tenantId: number, userId: number, input: IncidentInput) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  const student = await studentRow(tenantId, input.studentId);
  if (
    !student ||
    student.year !== context.academicYear ||
    !teaches(taught, input.subjectId, student.gradeLevel, student.section?.trim() ?? "")
  ) {
    throw new OfficeError("NOT_FOUND");
  }
  const id = insertId(
    await db.insert(tcIncidents).values(
      withTenant(
        {
          studentId: input.studentId,
          subjectId: input.subjectId,
          category: input.category,
          summary: input.summary,
          status: "Open" as const,
          recordedBy: context.staffId,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function actOnIncident(tenantId: number, userId: number, incidentId: number, action: "acknowledge" | "close") {
  const context = await contextOf(tenantId, userId);
  const [row] = await db
    .select({
      id: tcIncidents.incidentId,
      subjectId: tcIncidents.subjectId,
      status: tcIncidents.status,
      recordedBy: tcIncidents.recordedBy,
    })
    .from(tcIncidents)
    .where(scoped(tcIncidents, tenantId, eq(tcIncidents.incidentId, incidentId)))
    .limit(1);
  if (!row) throw new OfficeError("NOT_FOUND");
  if (action === "close") {
    if (row.recordedBy !== context.staffId) throw new OfficeError("NOT_ASSIGNED");
    if (row.status === "Closed") throw new OfficeError("NOT_READY");
    await db
      .update(tcIncidents)
      .set({ status: "Closed" })
      .where(scoped(tcIncidents, tenantId, eq(tcIncidents.incidentId, row.id)));
    return { id: row.id };
  }
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const catalog = await subjectCatalog(tenantId);
  if (!idsInDepartment(catalog, department).includes(row.subjectId)) throw new OfficeError("NOT_FOUND");
  if (row.status !== "Open") throw new OfficeError("NOT_READY");
  await db
    .update(tcIncidents)
    .set({ status: "Acknowledged" })
    .where(scoped(tcIncidents, tenantId, eq(tcIncidents.incidentId, row.id)));
  return { id: row.id };
}

async function staffInDepartment(tenantId: number, year: string, subjectIds: number[]) {
  if (subjectIds.length === 0) return [];
  const rows = await db
    .select({
      id: staff.staffId,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(teacherAssignments)
    .innerJoin(staff, and(eq(staff.staffId, teacherAssignments.staffId), eq(staff.tenantId, tenantId)))
    .where(
      scoped(
        teacherAssignments,
        tenantId,
        and(eq(teacherAssignments.academicYear, year), inArray(teacherAssignments.subjectId, subjectIds)),
      ),
    );
  const seen = new Map<number, string>();
  for (const row of rows) seen.set(row.id, personName(row.firstName, row.lastName));
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

export async function leaveBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const mineRows = await db
    .select({
      id: tcLeaveRequests.leaveId,
      kind: tcLeaveRequests.kind,
      startsOn: tcLeaveRequests.startsOn,
      endsOn: tcLeaveRequests.endsOn,
      reason: tcLeaveRequests.reason,
      status: tcLeaveRequests.status,
    })
    .from(tcLeaveRequests)
    .where(scoped(tcLeaveRequests, tenantId, eq(tcLeaveRequests.staffId, context.staffId)))
    .orderBy(asc(tcLeaveRequests.leaveId));
  const department = await departmentOf(tenantId, context.staffId, context.academicYear);
  if (!department) return { mine: mineRows, inbox: [] };
  const people = await staffInDepartment(
    tenantId,
    context.academicYear,
    idsInDepartment(await subjectCatalog(tenantId), department),
  );
  const ids = people.filter((row) => row.id !== context.staffId).map((row) => row.id);
  if (ids.length === 0) return { mine: mineRows, inbox: [] };
  const names = new Map(people.map((row) => [row.id, row.name]));
  const inbox = await db
    .select({
      id: tcLeaveRequests.leaveId,
      staffId: tcLeaveRequests.staffId,
      kind: tcLeaveRequests.kind,
      startsOn: tcLeaveRequests.startsOn,
      endsOn: tcLeaveRequests.endsOn,
      reason: tcLeaveRequests.reason,
      status: tcLeaveRequests.status,
    })
    .from(tcLeaveRequests)
    .where(
      scoped(
        tcLeaveRequests,
        tenantId,
        and(eq(tcLeaveRequests.status, "Pending"), inArray(tcLeaveRequests.staffId, ids)),
      ),
    );
  return {
    mine: mineRows,
    inbox: inbox.map((row) => ({ ...row, teacherName: names.get(row.staffId) ?? "" })),
  };
}

export async function requestLeave(tenantId: number, userId: number, input: LeaveInput) {
  const context = await contextOf(tenantId, userId);
  if (input.endsOn < input.startsOn) throw new OfficeError("NOT_READY");
  const open = await db
    .select({ startsOn: tcLeaveRequests.startsOn, endsOn: tcLeaveRequests.endsOn, status: tcLeaveRequests.status })
    .from(tcLeaveRequests)
    .where(scoped(tcLeaveRequests, tenantId, eq(tcLeaveRequests.staffId, context.staffId)));
  const overlap = open.some(
    (row) => (row.status === "Pending" || row.status === "Approved") && rangesOverlap(input.startsOn, input.endsOn, row.startsOn, row.endsOn),
  );
  if (overlap) throw new OfficeError("LEAVE_OVERLAP");
  const id = insertId(
    await db.insert(tcLeaveRequests).values(
      withTenant(
        {
          staffId: context.staffId,
          kind: input.kind,
          startsOn: input.startsOn,
          endsOn: input.endsOn,
          reason: input.reason,
          status: "Pending" as const,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function actOnLeave(tenantId: number, userId: number, leaveId: number, action: "withdraw" | "approve" | "reject") {
  const context = await contextOf(tenantId, userId);
  const [row] = await db
    .select({
      id: tcLeaveRequests.leaveId,
      staffId: tcLeaveRequests.staffId,
      status: tcLeaveRequests.status,
    })
    .from(tcLeaveRequests)
    .where(scoped(tcLeaveRequests, tenantId, eq(tcLeaveRequests.leaveId, leaveId)))
    .limit(1);
  if (!row) throw new OfficeError("NOT_FOUND");
  if (row.status !== "Pending") throw new OfficeError("NOT_READY");
  if (action === "withdraw") {
    if (row.staffId !== context.staffId) throw new OfficeError("NOT_ASSIGNED");
    await db
      .update(tcLeaveRequests)
      .set({ status: "Withdrawn" })
      .where(scoped(tcLeaveRequests, tenantId, eq(tcLeaveRequests.leaveId, row.id)));
    return { id: row.id };
  }
  if (row.staffId === context.staffId) throw new OfficeError("SELF");
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const people = await staffInDepartment(
    tenantId,
    context.academicYear,
    idsInDepartment(await subjectCatalog(tenantId), department),
  );
  if (!people.some((person) => person.id === row.staffId)) throw new OfficeError("NOT_FOUND");
  await db
    .update(tcLeaveRequests)
    .set({ status: action === "approve" ? "Approved" : "Rejected", decidedBy: context.staffId })
    .where(scoped(tcLeaveRequests, tenantId, eq(tcLeaveRequests.leaveId, row.id)));
  return { id: row.id };
}

export async function libraryBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  const seen = new Map<number, string>();
  for (const row of taught) if (!seen.has(row.subjectId)) seen.set(row.subjectId, row.subjectName);
  const borrowed = await db
    .select({
      id: libraryBorrowing.borrowId,
      title: libraryBooks.bookName,
      author: libraryBooks.author,
      borrowDate: libraryBorrowing.borrowDate,
    })
    .from(libraryBorrowing)
    .innerJoin(libraryBooks, and(eq(libraryBooks.bookId, libraryBorrowing.bookId), eq(libraryBooks.tenantId, tenantId)))
    .where(scoped(libraryBorrowing, tenantId, and(eq(libraryBorrowing.userId, userId), eq(libraryBorrowing.status, "Borrowed"))));
  const recommendations = await db
    .select({
      id: tcBookRecommendations.recommendationId,
      subjectId: tcBookRecommendations.subjectId,
      subject: subjects.subjectName,
      title: tcBookRecommendations.title,
      author: tcBookRecommendations.author,
      reason: tcBookRecommendations.reason,
    })
    .from(tcBookRecommendations)
    .innerJoin(subjects, and(eq(subjects.subjectId, tcBookRecommendations.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(tcBookRecommendations, tenantId, eq(tcBookRecommendations.recordedBy, context.staffId)))
    .orderBy(asc(tcBookRecommendations.recommendationId));
  return {
    borrowed: borrowed.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      author: row.author ?? "",
      borrowDate: row.borrowDate,
    })),
    subjects: [...seen.entries()].map(([id, name]) => ({ id, name })),
    recommendations,
  };
}

export async function recommendBook(tenantId: number, userId: number, input: RecommendationInput) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  if (!taught.some((row) => row.subjectId === input.subjectId)) throw new OfficeError("NOT_ASSIGNED");
  const id = await insertOrDup(async () => {
    return insertId(
      await db.insert(tcBookRecommendations).values(
        withTenant(
          {
            subjectId: input.subjectId,
            title: input.title,
            author: input.author,
            reason: input.reason,
            recordedBy: context.staffId,
          },
          tenantId,
        ),
      ),
    );
  }, "ALREADY_RECOMMENDED");
  return { id };
}

export async function questionBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  const seen = new Map<number, string>();
  for (const row of taught) if (!seen.has(row.subjectId)) seen.set(row.subjectId, row.subjectName);
  const questions = await db
    .select({
      id: tcQuestions.questionId,
      subjectId: tcQuestions.subjectId,
      subject: subjects.subjectName,
      topic: tcQuestions.topic,
      stem: tcQuestions.stem,
      correct: tcQuestions.correctOption,
      points: tcQuestions.points,
    })
    .from(tcQuestions)
    .innerJoin(subjects, and(eq(subjects.subjectId, tcQuestions.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(tcQuestions, tenantId, eq(tcQuestions.staffId, context.staffId)))
    .orderBy(asc(tcQuestions.questionId));
  const papers = await db
    .select({
      id: tcPapers.paperId,
      subjectId: tcPapers.subjectId,
      subject: subjects.subjectName,
      title: tcPapers.title,
      count: tcPapers.questionCount,
      status: tcPapers.status,
    })
    .from(tcPapers)
    .innerJoin(subjects, and(eq(subjects.subjectId, tcPapers.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(tcPapers, tenantId, eq(tcPapers.staffId, context.staffId)))
    .orderBy(asc(tcPapers.paperId));
  return {
    subjects: [...seen.entries()].map(([id, name]) => ({ id, name })),
    questions: questions.map((row) => ({ ...row, points: Number(row.points) })),
    papers,
  };
}

export async function addQuestion(tenantId: number, userId: number, input: QuestionInput) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  if (!taught.some((row) => row.subjectId === input.subjectId)) throw new OfficeError("NOT_ASSIGNED");
  const id = insertId(
    await db.insert(tcQuestions).values(
      withTenant(
        {
          subjectId: input.subjectId,
          staffId: context.staffId,
          topic: input.topic,
          stem: input.stem,
          optionA: input.optionA,
          optionB: input.optionB,
          optionC: input.optionC,
          optionD: input.optionD,
          correctOption: input.correct,
          points: money(input.points),
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function generatePaper(tenantId: number, userId: number, input: PaperInput) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  if (!taught.some((row) => row.subjectId === input.subjectId)) throw new OfficeError("NOT_ASSIGNED");
  const bank = await db
    .select({ id: tcQuestions.questionId })
    .from(tcQuestions)
    .where(
      scoped(tcQuestions, tenantId, and(eq(tcQuestions.staffId, context.staffId), eq(tcQuestions.subjectId, input.subjectId))),
    );
  const locked = await db
    .select({ questionId: tcPaperItems.questionId })
    .from(tcPaperItems)
    .innerJoin(tcPapers, and(eq(tcPapers.paperId, tcPaperItems.paperId), eq(tcPapers.tenantId, tenantId)))
    .where(
      scoped(
        tcPaperItems,
        tenantId,
        and(eq(tcPapers.staffId, context.staffId), eq(tcPapers.subjectId, input.subjectId), eq(tcPapers.status, "Open")),
      ),
    );
  const chosen = pickQuestions(
    bank.map((row) => row.id),
    new Set(locked.map((row) => row.questionId)),
    input.count,
  );
  if (!chosen) throw new OfficeError("NOT_ENOUGH");
  const id = await db.transaction(async (tx) => {
    const paperId = insertId(
      await tx.insert(tcPapers).values(
        withTenant(
          {
            subjectId: input.subjectId,
            staffId: context.staffId,
            title: input.title,
            questionCount: chosen.length,
            status: "Open" as const,
          },
          tenantId,
        ),
      ),
    );
    await tx.insert(tcPaperItems).values(
      chosen.map((questionId, index) => withTenant({ paperId, questionId, position: index + 1 }, tenantId)),
    );
    return paperId;
  });
  return { id };
}

export async function closePaper(tenantId: number, userId: number, paperId: number) {
  const context = await contextOf(tenantId, userId);
  const [row] = await db
    .select({ id: tcPapers.paperId, status: tcPapers.status })
    .from(tcPapers)
    .where(scoped(tcPapers, tenantId, and(eq(tcPapers.paperId, paperId), eq(tcPapers.staffId, context.staffId))))
    .limit(1);
  if (!row) throw new OfficeError("NOT_FOUND");
  if (row.status !== "Open") throw new OfficeError("NOT_READY");
  await db.update(tcPapers).set({ status: "Closed" }).where(scoped(tcPapers, tenantId, eq(tcPapers.paperId, row.id)));
  return { id: row.id };
}

export async function participationBoard(tenantId: number, userId: number, subjectId: number | undefined, date: string | undefined) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  const seen = new Map<number, string>();
  for (const row of taught) if (!seen.has(row.subjectId)) seen.set(row.subjectId, row.subjectName);
  const markedOn = date ?? today();
  if (!subjectId) {
    return { date: markedOn, subjects: [...seen.entries()].map(([id, name]) => ({ id, name })), students: [] };
  }
  if (!seen.has(subjectId)) throw new OfficeError("NOT_ASSIGNED");
  const classesForSubject = taught.filter((row) => row.subjectId === subjectId);
  const people = [];
  for (const row of classesForSubject) {
    const filters = [
      eq(students.academicYear, context.academicYear),
      eq(students.gradeLevel, row.gradeLevel),
      ...(row.section ? [eq(students.section, row.section)] : []),
    ];
    const found = await db
      .select({ id: students.studentId, name: students.fullName })
      .from(students)
      .where(scoped(students, tenantId, and(...filters)))
      .orderBy(asc(students.fullName));
    people.push(...found);
  }
  const unique = new Map<number, string>();
  for (const person of people) unique.set(person.id, person.name);
  const ids = [...unique.keys()];
  const marked = new Set<number>();
  if (ids.length > 0) {
    const rows = await db
      .select({ studentId: tcParticipation.studentId })
      .from(tcParticipation)
      .where(
        scoped(
          tcParticipation,
          tenantId,
          and(
            eq(tcParticipation.subjectId, subjectId),
            eq(tcParticipation.markedOn, markedOn),
            inArray(tcParticipation.studentId, ids),
          ),
        ),
      );
    for (const row of rows) marked.add(row.studentId);
  }
  return {
    date: markedOn,
    subjects: [...seen.entries()].map(([id, name]) => ({ id, name })),
    students: [...unique.entries()].map(([id, name]) => ({ id, name, marked: marked.has(id) })),
  };
}

export async function markParticipation(tenantId: number, userId: number, input: ParticipationInput) {
  const context = await contextOf(tenantId, userId);
  const taught = await taughtRows(tenantId, context.staffId, context.academicYear);
  const student = await studentRow(tenantId, input.studentId);
  if (
    !student ||
    student.year !== context.academicYear ||
    !teaches(taught, input.subjectId, student.gradeLevel, student.section?.trim() ?? "")
  ) {
    throw new OfficeError("NOT_FOUND");
  }
  const id = await insertOrDup(async () => {
    return insertId(
      await db.insert(tcParticipation).values(
        withTenant(
          {
            studentId: input.studentId,
            subjectId: input.subjectId,
            staffId: context.staffId,
            markedOn: input.markedOn,
          },
          tenantId,
        ),
      ),
    );
  }, "ALREADY_MARKED");
  return { id };
}

export async function student360List(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const rooms = await homeroomRooms(tenantId, context.staffId);
  if (rooms.length === 0) throw new OfficeError("NOT_HOMEROOM");
  const people = [];
  for (const room of rooms) {
    const filters = [
      eq(students.academicYear, context.academicYear),
      eq(students.gradeLevel, room.gradeLevel),
      eq(students.section, room.section),
    ];
    const found = await db
      .select({ id: students.studentId, name: students.fullName, gradeLevel: students.gradeLevel, section: students.section })
      .from(students)
      .where(scoped(students, tenantId, and(...filters)))
      .orderBy(asc(students.fullName));
    people.push(...found.map((row) => ({ ...row, section: row.section ?? room.section })));
  }
  return { academicYear: context.academicYear, students: people };
}

export async function student360(tenantId: number, userId: number, studentId: number) {
  const context = await contextOf(tenantId, userId);
  const rooms = await homeroomRooms(tenantId, context.staffId);
  if (rooms.length === 0) throw new OfficeError("NOT_HOMEROOM");
  const student = await studentRow(tenantId, studentId);
  const section = student?.section?.trim() ?? "";
  const inRoom =
    student != null &&
    student.year === context.academicYear &&
    rooms.some((room) => room.gradeLevel === student.gradeLevel && room.section === section);
  if (!student || !inRoom) throw new OfficeError("NOT_FOUND");

  const marks = await db
    .select({ status: attendance.status })
    .from(attendance)
    .where(scoped(attendance, tenantId, eq(attendance.studentId, student.id)));
  const gradeRows = await db
    .select({
      subject: subjects.subjectName,
      score: grades.score,
      maxScore: grades.maxScore,
      status: grades.submissionStatus,
    })
    .from(grades)
    .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(grades, tenantId, and(eq(grades.studentId, student.id), eq(grades.academicYear, context.academicYear))));
  const openIncidents = await db
    .select({ id: tcIncidents.incidentId })
    .from(tcIncidents)
    .where(
      scoped(
        tcIncidents,
        tenantId,
        and(eq(tcIncidents.studentId, student.id), inArray(tcIncidents.status, ["Open", "Acknowledged"])),
      ),
    );
  const participation = await db
    .select({ id: tcParticipation.participationId })
    .from(tcParticipation)
    .where(scoped(tcParticipation, tenantId, eq(tcParticipation.studentId, student.id)));
  const referrals = await db
    .select({ id: vpReferrals.referralId })
    .from(vpReferrals)
    .where(scoped(vpReferrals, tenantId, eq(vpReferrals.studentId, student.id)));
  let borrowedBooks = 0;
  if (student.userId != null) {
    const loans = await db
      .select({ id: libraryBorrowing.borrowId })
      .from(libraryBorrowing)
      .where(
        scoped(libraryBorrowing, tenantId, and(eq(libraryBorrowing.userId, student.userId), eq(libraryBorrowing.status, "Borrowed"))),
      );
    borrowedBooks = loans.length;
  }
  const scores = gradeRows.map((row) => Number(row.score));
  const average = scores.length === 0 ? null : Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
  return {
    student: { id: student.id, name: student.name, gradeLevel: student.gradeLevel, section },
    attendance: {
      present: marks.filter((row) => row.status === "P").length,
      absent: marks.filter((row) => row.status === "A").length,
      tardy: marks.filter((row) => row.status === "T").length,
    },
    average,
    openIncidents: openIncidents.length,
    borrowedBooks,
    participation: participation.length,
    referrals: referrals.length,
    grades: gradeRows.map((row) => ({
      subject: row.subject,
      score: Number(row.score),
      maxScore: Number(row.maxScore ?? 100),
      status: row.status,
    })),
  };
}

export async function curriculumBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const catalog = await subjectCatalog(tenantId);
  const ids = idsInDepartment(catalog, department);
  const names = new Map(catalog.map((row) => [row.id, row.name]));
  const plans =
    ids.length === 0
      ? []
      : await db
          .select({
            id: annualLessonPlan.planDetailId,
            subjectId: annualLessonPlan.subjectId,
            week: annualLessonPlan.weekNumber,
            topic: annualLessonPlan.topicTitle,
            status: annualLessonPlan.status,
          })
          .from(annualLessonPlan)
          .where(
            scoped(
              annualLessonPlan,
              tenantId,
              and(eq(annualLessonPlan.academicYear, context.academicYear), inArray(annualLessonPlan.subjectId, ids)),
            ),
          )
          .orderBy(asc(annualLessonPlan.weekNumber));
  const standards =
    ids.length === 0
      ? []
      : await db
          .select({
            id: tcExamStandards.standardId,
            subjectId: tcExamStandards.subjectId,
            assessmentName: tcExamStandards.assessmentName,
            maxScore: tcExamStandards.maxScore,
          })
          .from(tcExamStandards)
          .where(scoped(tcExamStandards, tenantId, inArray(tcExamStandards.subjectId, ids)));
  return {
    department,
    subjects: catalog.filter((row) => ids.includes(row.id)),
    plans: plans.map((row) => ({ ...row, subject: names.get(row.subjectId) ?? "" })),
    standards: standards.map((row) => ({ ...row, subject: names.get(row.subjectId) ?? "" })),
  };
}

export async function approvePlan(tenantId: number, userId: number, planId: number) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const [plan] = await db
    .select({
      id: annualLessonPlan.planDetailId,
      subjectId: annualLessonPlan.subjectId,
      status: annualLessonPlan.status,
      year: annualLessonPlan.academicYear,
    })
    .from(annualLessonPlan)
    .where(scoped(annualLessonPlan, tenantId, eq(annualLessonPlan.planDetailId, planId)))
    .limit(1);
  if (!plan || plan.year !== context.academicYear) throw new OfficeError("NOT_FOUND");
  const ids = idsInDepartment(await subjectCatalog(tenantId), department);
  if (!ids.includes(plan.subjectId)) throw new OfficeError("NOT_FOUND");
  if (plan.status !== "Draft") throw new OfficeError("NOT_READY");
  await db
    .update(annualLessonPlan)
    .set({ status: "Approved" })
    .where(scoped(annualLessonPlan, tenantId, eq(annualLessonPlan.planDetailId, plan.id)));
  return { id: plan.id };
}

export async function saveStandard(tenantId: number, userId: number, input: StandardInput) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const ids = idsInDepartment(await subjectCatalog(tenantId), department);
  if (!ids.includes(input.subjectId)) throw new OfficeError("NOT_FOUND");
  const [existing] = await db
    .select({ id: tcExamStandards.standardId })
    .from(tcExamStandards)
    .where(
      scoped(
        tcExamStandards,
        tenantId,
        and(eq(tcExamStandards.subjectId, input.subjectId), eq(tcExamStandards.assessmentName, input.assessmentName)),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(tcExamStandards)
      .set({ maxScore: input.maxScore, recordedBy: context.staffId })
      .where(scoped(tcExamStandards, tenantId, eq(tcExamStandards.standardId, existing.id)));
    return { id: existing.id };
  }
  const id = insertId(
    await db.insert(tcExamStandards).values(
      withTenant(
        {
          subjectId: input.subjectId,
          assessmentName: input.assessmentName,
          maxScore: input.maxScore,
          recordedBy: context.staffId,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function gradeWorkflow(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const ids = idsInDepartment(await subjectCatalog(tenantId), department);
  if (ids.length === 0) return { department, rows: [] };
  const rows = await db
    .select({
      id: grades.gradeEntryId,
      student: students.fullName,
      subject: subjects.subjectName,
      score: grades.score,
      maxScore: grades.maxScore,
      assessment: grades.assessmentName,
      status: grades.submissionStatus,
    })
    .from(grades)
    .innerJoin(students, and(eq(students.studentId, grades.studentId), eq(students.tenantId, tenantId)))
    .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(
        grades,
        tenantId,
        and(
          eq(grades.academicYear, context.academicYear),
          inArray(grades.subjectId, ids),
          inArray(grades.submissionStatus, ["Submitted", "Approved"]),
        ),
      ),
    )
    .orderBy(asc(grades.gradeEntryId));
  const entryIds = rows.map((row) => row.id);
  const reviews =
    entryIds.length === 0
      ? []
      : await db
          .select({ gradeEntryId: tcGradeReviews.gradeEntryId, status: tcGradeReviews.status })
          .from(tcGradeReviews)
          .where(scoped(tcGradeReviews, tenantId, inArray(tcGradeReviews.gradeEntryId, entryIds)));
  const sent = new Map(reviews.map((row) => [row.gradeEntryId, row.status]));
  return {
    department,
    rows: rows.map((row) => ({
      id: row.id,
      student: row.student,
      subject: row.subject,
      score: Number(row.score),
      maxScore: Number(row.maxScore ?? 100),
      assessment: row.assessment ?? "",
      status: row.status,
      review: sent.get(row.id) ?? null,
    })),
  };
}

async function departmentGrade(tenantId: number, staffId: number, year: string, gradeId: number) {
  const department = await requireHead(tenantId, staffId, year);
  const [row] = await db
    .select({
      id: grades.gradeEntryId,
      subjectId: grades.subjectId,
      status: grades.submissionStatus,
      year: grades.academicYear,
    })
    .from(grades)
    .where(scoped(grades, tenantId, eq(grades.gradeEntryId, gradeId)))
    .limit(1);
  if (!row || row.year !== year) throw new OfficeError("NOT_FOUND");
  const ids = idsInDepartment(await subjectCatalog(tenantId), department);
  if (!ids.includes(row.subjectId)) throw new OfficeError("NOT_FOUND");
  return row;
}

export async function approveGrade(tenantId: number, userId: number, gradeId: number) {
  const context = await contextOf(tenantId, userId);
  const row = await departmentGrade(tenantId, context.staffId, context.academicYear, gradeId);
  if (row.status !== "Submitted") throw new OfficeError("NOT_READY");
  await db.transaction(async (tx) => {
    await tx
      .update(grades)
      .set({ submissionStatus: "Approved", adminApproved: 1 })
      .where(scoped(grades, tenantId, eq(grades.gradeEntryId, row.id)));
    await tx.insert(tcGradeReviews).values(
      withTenant({ gradeEntryId: row.id, status: "Approved" as const, recordedBy: context.staffId }, tenantId),
    );
  });
  return { id: row.id };
}

export async function sendGrade(tenantId: number, userId: number, gradeId: number) {
  const context = await contextOf(tenantId, userId);
  const row = await departmentGrade(tenantId, context.staffId, context.academicYear, gradeId);
  const [review] = await db
    .select({ id: tcGradeReviews.reviewId, status: tcGradeReviews.status })
    .from(tcGradeReviews)
    .where(scoped(tcGradeReviews, tenantId, eq(tcGradeReviews.gradeEntryId, row.id)))
    .limit(1);
  if (!review || review.status !== "Approved" || row.status !== "Approved") throw new OfficeError("NOT_READY");
  await db
    .update(tcGradeReviews)
    .set({ status: "Sent" })
    .where(scoped(tcGradeReviews, tenantId, eq(tcGradeReviews.reviewId, review.id)));
  return { id: row.id };
}

export async function requisitionBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const rows = await db
    .select({
      id: tcRequisitions.requisitionId,
      itemName: tcRequisitions.itemName,
      quantity: tcRequisitions.quantity,
      purpose: tcRequisitions.purpose,
      status: tcRequisitions.status,
    })
    .from(tcRequisitions)
    .where(scoped(tcRequisitions, tenantId, eq(tcRequisitions.staffId, context.staffId)))
    .orderBy(asc(tcRequisitions.requisitionId));
  return { department, rows };
}

export async function addRequisition(tenantId: number, userId: number, input: RequisitionInput) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const id = insertId(
    await db.insert(tcRequisitions).values(
      withTenant(
        {
          staffId: context.staffId,
          department,
          itemName: input.itemName,
          quantity: input.quantity,
          purpose: input.purpose,
          status: "Submitted" as const,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function sendRequisition(tenantId: number, userId: number, requisitionId: number) {
  const context = await contextOf(tenantId, userId);
  await requireHead(tenantId, context.staffId, context.academicYear);
  const [row] = await db
    .select({ id: tcRequisitions.requisitionId, status: tcRequisitions.status, staffId: tcRequisitions.staffId })
    .from(tcRequisitions)
    .where(scoped(tcRequisitions, tenantId, eq(tcRequisitions.requisitionId, requisitionId)))
    .limit(1);
  if (!row || row.staffId !== context.staffId) throw new OfficeError("NOT_FOUND");
  if (row.status !== "Submitted") throw new OfficeError("NOT_READY");
  await db
    .update(tcRequisitions)
    .set({ status: "Sent" })
    .where(scoped(tcRequisitions, tenantId, eq(tcRequisitions.requisitionId, row.id)));
  return { id: row.id };
}

export async function coverageBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const catalog = await subjectCatalog(tenantId);
  const ids = idsInDepartment(catalog, department);
  const names = new Map(catalog.map((row) => [row.id, row.name]));
  const plans =
    ids.length === 0
      ? []
      : await db
          .select({
            id: annualLessonPlan.planDetailId,
            subjectId: annualLessonPlan.subjectId,
            week: annualLessonPlan.weekNumber,
            topic: annualLessonPlan.topicTitle,
            status: annualLessonPlan.status,
          })
          .from(annualLessonPlan)
          .where(
            scoped(
              annualLessonPlan,
              tenantId,
              and(eq(annualLessonPlan.academicYear, context.academicYear), inArray(annualLessonPlan.subjectId, ids)),
            ),
          );
  const planIds = plans.map((row) => row.id);
  const covered =
    planIds.length === 0
      ? []
      : await db
          .select({ planDetailId: tcTopicCoverage.planDetailId })
          .from(tcTopicCoverage)
          .where(scoped(tcTopicCoverage, tenantId, inArray(tcTopicCoverage.planDetailId, planIds)));
  const coveredIds = new Set(covered.map((row) => row.planDetailId));
  const bySubject = new Map<number, { total: number; covered: number }>();
  for (const id of ids) bySubject.set(id, { total: 0, covered: 0 });
  for (const plan of plans) {
    const bucket = bySubject.get(plan.subjectId) ?? { total: 0, covered: 0 };
    bucket.total += 1;
    if (coveredIds.has(plan.id)) bucket.covered += 1;
    bySubject.set(plan.subjectId, bucket);
  }
  return {
    department,
    subjects: [...bySubject.entries()].map(([id, bucket]) => ({
      id,
      name: names.get(id) ?? "",
      total: bucket.total,
      covered: bucket.covered,
      percent: coveragePercent(bucket.total, bucket.covered),
    })),
    topics: plans.map((row) => ({
      id: row.id,
      subject: names.get(row.subjectId) ?? "",
      week: row.week,
      topic: row.topic,
      status: row.status,
      covered: coveredIds.has(row.id),
    })),
  };
}

export async function markCovered(tenantId: number, userId: number, input: CoverageInput) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const [plan] = await db
    .select({
      id: annualLessonPlan.planDetailId,
      subjectId: annualLessonPlan.subjectId,
      status: annualLessonPlan.status,
      year: annualLessonPlan.academicYear,
    })
    .from(annualLessonPlan)
    .where(scoped(annualLessonPlan, tenantId, eq(annualLessonPlan.planDetailId, input.planDetailId)))
    .limit(1);
  if (!plan || plan.year !== context.academicYear) throw new OfficeError("NOT_FOUND");
  const ids = idsInDepartment(await subjectCatalog(tenantId), department);
  if (!ids.includes(plan.subjectId)) throw new OfficeError("NOT_FOUND");
  if (plan.status !== "Approved") throw new OfficeError("NOT_READY");
  const id = await insertOrDup(async () => {
    return insertId(
      await db.insert(tcTopicCoverage).values(
        withTenant({ planDetailId: plan.id, coveredOn: input.coveredOn, recordedBy: context.staffId }, tenantId),
      ),
    );
  }, "ALREADY_MARKED");
  return { id };
}

export async function evaluationBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const people = await staffInDepartment(
    tenantId,
    context.academicYear,
    idsInDepartment(await subjectCatalog(tenantId), department),
  );
  const rows = await db
    .select({
      id: tcPerformance.performanceId,
      staffId: tcPerformance.staffId,
      term: tcPerformance.term,
      total: tcPerformance.totalScore,
      max: tcPerformance.maxScore,
      note: tcPerformance.note,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(tcPerformance)
    .innerJoin(staff, and(eq(staff.staffId, tcPerformance.staffId), eq(staff.tenantId, tenantId)))
    .where(
      scoped(tcPerformance, tenantId, and(eq(tcPerformance.recordedBy, context.staffId), eq(tcPerformance.academicYear, context.academicYear))),
    )
    .orderBy(asc(tcPerformance.performanceId));
  return {
    department,
    criteria: CRITERIA.map((item) => ({ key: item.key, max: item.max })),
    teachers: people.filter((row) => row.id !== context.staffId),
    rows: rows.map((row) => ({
      id: row.id,
      teacher: personName(row.firstName, row.lastName),
      term: row.term,
      total: Number(row.total),
      max: Number(row.max),
      note: row.note,
    })),
  };
}

export async function saveEvaluation(tenantId: number, userId: number, input: EvaluationInput) {
  const context = await contextOf(tenantId, userId);
  if (input.staffId === context.staffId) throw new OfficeError("SELF");
  const department = await requireHead(tenantId, context.staffId, context.academicYear);
  const people = await staffInDepartment(
    tenantId,
    context.academicYear,
    idsInDepartment(await subjectCatalog(tenantId), department),
  );
  if (!people.some((person) => person.id === input.staffId)) throw new OfficeError("NOT_FOUND");
  const totals = evaluationTotal(input.scores);
  if (!totals) throw new OfficeError("SCORE_OVER");
  const id = await insertOrDup(async () => {
    return db.transaction(async (tx) => {
      const performanceId = insertId(
        await tx.insert(tcPerformance).values(
          withTenant(
            {
              staffId: input.staffId,
              academicYear: context.academicYear,
              term: input.term,
              totalScore: money(totals.total),
              maxScore: money(totals.max),
              note: input.note,
              recordedBy: context.staffId,
            },
            tenantId,
          ),
        ),
      );
      await tx.insert(tcPerformanceScores).values(
        CRITERIA.map((item) =>
          withTenant(
            {
              performanceId,
              criterion: item.key,
              maxScore: money(item.max),
              scoreGiven: money(input.scores[item.key]),
            },
            tenantId,
          ),
        ),
      );
      return performanceId;
    });
  }, "ALREADY_EVALUATED");
  return { id };
}
