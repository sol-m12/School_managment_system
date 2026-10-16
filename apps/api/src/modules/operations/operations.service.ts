import { and, asc, count, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import os from "node:os";
import { db } from "../../db/index.js";
import {
  auditLog,
  backupRuns,
  classes,
  departmentHeads,
  grades,
  loginAttempts,
  outboundNotices,
  schoolSettings,
  staff,
  students,
  supportTickets,
  users,
} from "../../db/schema/index.js";
import {
  ARCHIVE_KEY,
  GATE_KEY,
  SEMESTER_KEY,
  YEAR_KEY,
  isEthiopianYear,
  upsertSetting,
  yearSnapshot,
} from "../../lib/academicYear.js";
import { ER_DUP_ENTRY, mysqlErrno } from "../../lib/mysqlError.js";
import { hashPassword } from "../../lib/password.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { DEPARTMENTS, type BackupCheckInput, type DepartmentHeadInput, type GradeProtocolInput, type HomeroomDutyInput, type NoticeInput, type ProvisionInput, type TicketInput, type TicketStatusInput } from "./operations.schema.js";

export type OperationsErrorCode =
  | "NOT_FOUND"
  | "USERNAME_TAKEN"
  | "ALREADY_HAS_ACCOUNT"
  | "YEAR_LOCKED"
  | "YEAR_NOT_LOCKED"
  | "YEAR_FORMAT"
  | "YEAR_ARCHIVED"
  | "GRADE_NOT_FOUND"
  | "TEACHER_ASSIGNED"
  | "STAFF_NOT_TEACHER"
  | "IMPORT_EMPTY"
  | "EXCEL_SAVE_AS_CSV";

export class OperationsError extends Error {
  constructor(readonly code: OperationsErrorCode) {
    super(code);
    this.name = "OperationsError";
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

async function writeAudit(tenantId: number, userId: number, actionType: string, description: string): Promise<void> {
  await db.insert(auditLog).values(
    withTenant(
      {
        userId,
        actionType,
        description,
        timestamp: addisNow(),
      },
      tenantId,
    ),
  );
}

export async function listMissingAccounts(tenantId: number) {
  const studentRows = await db
    .select({
      id: students.studentId,
      name: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
    })
    .from(students)
    .where(scoped(students, tenantId, isNull(students.userId)))
    .orderBy(asc(students.fullName))
    .limit(200);

  const staffRows = await db
    .select({
      id: staff.staffId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
    })
    .from(staff)
    .where(scoped(staff, tenantId, isNull(staff.userId)))
    .orderBy(asc(staff.firstName))
    .limit(200);

  return {
    students: studentRows.map((row) => ({
      id: row.id,
      name: row.name,
      gradeLevel: row.gradeLevel,
      section: row.section,
    })),
    staff: staffRows.map((row) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      role: row.role,
    })),
  };
}

async function createLogin(tenantId: number, username: string, role: Role) {
  try {
    const inserted = await db.insert(users).values(
      withTenant(
        {
          username,
          passwordHash: await hashPassword(username),
          role,
          passwordChanged: 0,
          isActive: 1,
          tokenVersion: 0,
        },
        tenantId,
      ),
    );
    return Number(inserted[0].insertId);
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new OperationsError("USERNAME_TAKEN");
    throw error;
  }
}

export async function provisionAccount(tenantId: number, actorId: number, input: ProvisionInput) {
  if (input.kind === "student") {
    const [row] = await db
      .select({ id: students.studentId, userId: students.userId, name: students.fullName })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, input.id)))
      .limit(1);
    if (!row) throw new OperationsError("NOT_FOUND");
    if (row.userId != null) throw new OperationsError("ALREADY_HAS_ACCOUNT");
    const username = String(row.id);
    const userId = await createLogin(tenantId, username, "Student");
    await db
      .update(students)
      .set({ userId })
      .where(scoped(students, tenantId, eq(students.studentId, row.id)));
    await writeAudit(tenantId, actorId, "identity.provision", `Student ${row.id} login ${username}`);
    return { username, kind: input.kind, id: row.id, name: row.name };
  }

  const [row] = await db
    .select({ id: staff.staffId, userId: staff.userId, firstName: staff.firstName, lastName: staff.lastName, role: staff.role })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, input.id)))
    .limit(1);
  if (!row) throw new OperationsError("NOT_FOUND");
  if (row.userId != null) throw new OperationsError("ALREADY_HAS_ACCOUNT");
  if (row.role === "Lab_Assistant") throw new OperationsError("STAFF_NOT_TEACHER");
  const username = `E${row.id}`;
  const userId = await createLogin(tenantId, username, row.role as Role);
  await db.update(staff).set({ userId }).where(scoped(staff, tenantId, eq(staff.staffId, row.id)));
  await writeAudit(tenantId, actorId, "identity.provision", `Staff ${row.id} login ${username}`);
  return { username, kind: input.kind, id: row.id, name: `${row.firstName} ${row.lastName}`.trim() };
}

export async function resetPasswordToId(tenantId: number, actorId: number, userId: number) {
  const [user] = await db
    .select({ id: users.userId, username: users.username, tokenVersion: users.tokenVersion })
    .from(users)
    .where(scoped(users, tenantId, eq(users.userId, userId)))
    .limit(1);
  if (!user) throw new OperationsError("NOT_FOUND");
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(user.username),
      passwordChanged: 0,
      tokenVersion: user.tokenVersion + 1,
    })
    .where(scoped(users, tenantId, eq(users.userId, user.id)));
  await writeAudit(tenantId, actorId, "password.reset_id", `Reset login ${user.username} to the ID number`);
  return { username: user.username };
}

export async function lockAcademicYear(tenantId: number, actorId: number) {
  const snap = await yearSnapshot(tenantId);
  if (!snap.academicYear || !isEthiopianYear(snap.academicYear)) throw new OperationsError("YEAR_FORMAT");
  if (snap.archived.includes(snap.academicYear)) throw new OperationsError("YEAR_ARCHIVED");
  if (snap.gate === "locked") throw new OperationsError("YEAR_LOCKED");
  await upsertSetting(tenantId, GATE_KEY, "locked");
  await writeAudit(tenantId, actorId, "year.lock", `Locked Ethiopian year ${snap.academicYear}`);
  return yearSnapshot(tenantId);
}

export async function archiveAcademicYear(tenantId: number, actorId: number) {
  const snap = await yearSnapshot(tenantId);
  if (!snap.academicYear || !isEthiopianYear(snap.academicYear)) throw new OperationsError("YEAR_FORMAT");
  if (snap.gate !== "locked") throw new OperationsError("YEAR_NOT_LOCKED");
  if (!snap.archived.includes(snap.academicYear)) {
    await upsertSetting(tenantId, ARCHIVE_KEY, [...snap.archived, snap.academicYear].join(","));
  }
  await writeAudit(tenantId, actorId, "year.archive", `Archived Ethiopian year ${snap.academicYear}`);
  return yearSnapshot(tenantId);
}

export async function rolloverAcademicYear(tenantId: number, actorId: number) {
  const snap = await yearSnapshot(tenantId);
  if (!snap.academicYear || !isEthiopianYear(snap.academicYear)) throw new OperationsError("YEAR_FORMAT");
  if (snap.gate !== "locked") throw new OperationsError("YEAR_NOT_LOCKED");
  const archived = snap.archived.includes(snap.academicYear) ? snap.archived : [...snap.archived, snap.academicYear];
  const next = String(Number(snap.academicYear) + 1);
  await upsertSetting(tenantId, ARCHIVE_KEY, archived.join(","));
  await upsertSetting(tenantId, YEAR_KEY, next);
  await upsertSetting(tenantId, SEMESTER_KEY, "1");
  await upsertSetting(tenantId, GATE_KEY, "open");
  await writeAudit(tenantId, actorId, "year.rollover", `Opened Ethiopian year ${next}; archived ${snap.academicYear}`);
  return yearSnapshot(tenantId);
}

export async function applyGradeProtocol(tenantId: number, actorId: number, input: GradeProtocolInput) {
  const snap = await yearSnapshot(tenantId);
  if (snap.archived.includes(input.academicYear)) throw new OperationsError("YEAR_ARCHIVED");
  const studentFilter = input.studentId ? eq(grades.studentId, input.studentId) : undefined;
  const fromStatus = input.action === "lock" ? ("Submitted" as const) : undefined;
  const match = scoped(
    grades,
    tenantId,
    and(
      eq(grades.subjectId, input.subjectId),
      eq(grades.academicYear, input.academicYear),
      eq(grades.semester, input.semester),
      fromStatus ? eq(grades.submissionStatus, fromStatus) : or(eq(grades.submissionStatus, "Submitted"), eq(grades.submissionStatus, "Approved")),
      studentFilter,
    ),
  );
  const [existing] = await db.select({ total: count() }).from(grades).where(match);
  if (Number(existing?.total ?? 0) === 0) throw new OperationsError("GRADE_NOT_FOUND");
  if (input.action === "lock") {
    await db.update(grades).set({ submissionStatus: "Approved", adminApproved: 1, isSubmitted: 1 }).where(match);
  } else {
    await db.update(grades).set({ submissionStatus: "Draft", adminApproved: 0, isSubmitted: 0 }).where(match);
  }
  await writeAudit(
    tenantId,
    actorId,
    input.action === "lock" ? "grades.lock" : "grades.unlock",
    `${input.action} subject ${input.subjectId} year ${input.academicYear} semester ${input.semester}: ${input.reason}`,
  );
  return { updated: Number(existing?.total ?? 0) };
}

export async function listTickets(tenantId: number) {
  const rows = await db
    .select({
      id: supportTickets.ticketId,
      title: supportTickets.title,
      details: supportTickets.details,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      openedBy: supportTickets.openedBy,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .where(scoped(supportTickets, tenantId))
    .orderBy(desc(supportTickets.ticketId))
    .limit(200);
  return rows;
}

export async function createTicket(tenantId: number, actorId: number, input: TicketInput) {
  const inserted = await db.insert(supportTickets).values(
    withTenant(
      {
        openedBy: actorId,
        title: input.title,
        details: input.details,
        category: input.category,
        priority: input.priority,
        status: "Open",
      },
      tenantId,
    ),
  );
  const id = Number(inserted[0].insertId);
  await writeAudit(tenantId, actorId, "ticket.open", input.title);
  const [row] = await listTickets(tenantId).then((rows) => rows.filter((item) => item.id === id));
  if (!row) throw new OperationsError("NOT_FOUND");
  return row;
}

export async function updateTicketStatus(tenantId: number, actorId: number, ticketId: number, input: TicketStatusInput) {
  const [existing] = await db
    .select({ id: supportTickets.ticketId })
    .from(supportTickets)
    .where(scoped(supportTickets, tenantId, eq(supportTickets.ticketId, ticketId)))
    .limit(1);
  if (!existing) throw new OperationsError("NOT_FOUND");
  await db
    .update(supportTickets)
    .set({ status: input.status })
    .where(scoped(supportTickets, tenantId, eq(supportTickets.ticketId, ticketId)));
  await writeAudit(tenantId, actorId, "ticket.status", `Ticket ${ticketId} ${input.status}`);
  const [row] = await listTickets(tenantId).then((rows) => rows.filter((item) => item.id === ticketId));
  if (!row) throw new OperationsError("NOT_FOUND");
  return row;
}

export async function listAudit(tenantId: number, action: string | undefined) {
  const actionFilter = action ? eq(auditLog.actionType, action) : undefined;
  const rows = await db
    .select({
      id: auditLog.logId,
      userId: auditLog.userId,
      username: users.username,
      actionType: auditLog.actionType,
      description: auditLog.description,
      timestamp: auditLog.timestamp,
    })
    .from(auditLog)
    .leftJoin(users, and(eq(users.userId, auditLog.userId), eq(users.tenantId, tenantId)))
    .where(scoped(auditLog, tenantId, actionFilter))
    .orderBy(desc(auditLog.logId))
    .limit(200);
  return rows;
}

export async function monitoring(tenantId: number) {
  const [school] = await db
    .select({
      email: schoolSettings.schoolEmail,
      phone: schoolSettings.schoolPhone,
    })
    .from(schoolSettings)
    .where(scoped(schoolSettings, tenantId))
    .limit(1);
  const notices = await db
    .select({
      id: outboundNotices.noticeId,
      channel: outboundNotices.channel,
      recipient: outboundNotices.recipient,
      referenceNo: outboundNotices.referenceNo,
      subject: outboundNotices.subject,
      sentOn: outboundNotices.sentOn,
    })
    .from(outboundNotices)
    .where(scoped(outboundNotices, tenantId))
    .orderBy(desc(outboundNotices.noticeId))
    .limit(100);
  const runs = await db
    .select({
      id: backupRuns.runId,
      action: backupRuns.action,
      status: backupRuns.status,
      note: backupRuns.note,
      createdAt: backupRuns.createdAt,
    })
    .from(backupRuns)
    .where(scoped(backupRuns, tenantId))
    .orderBy(desc(backupRuns.runId))
    .limit(50);
  return {
    channels: {
      emailReady: Boolean(school?.email?.trim()),
      phoneReady: Boolean(school?.phone?.trim()),
    },
    notices,
    runs,
  };
}

export async function recordNotice(tenantId: number, actorId: number, input: NoticeInput) {
  const inserted = await db.insert(outboundNotices).values(
    withTenant(
      {
        channel: input.channel,
        recipient: input.recipient,
        referenceNo: input.referenceNo,
        subject: input.subject,
        sentOn: input.sentOn,
        recordedBy: actorId,
      },
      tenantId,
    ),
  );
  await writeAudit(tenantId, actorId, "notice.record", `${input.channel} ${input.referenceNo} ${input.recipient}`);
  return { id: Number(inserted[0].insertId) };
}

export async function recordBackupCheck(tenantId: number, actorId: number, input: BackupCheckInput) {
  const inserted = await db.insert(backupRuns).values(
    withTenant(
      {
        action: input.action,
        status: "checked",
        note: input.note?.trim() ? input.note.trim() : null,
        recordedBy: actorId,
      },
      tenantId,
    ),
  );
  await writeAudit(tenantId, actorId, "backup.check", `${input.action} checked`);
  return { id: Number(inserted[0].insertId) };
}

export async function importAccounts(tenantId: number, actorId: number, csv: string) {
  if (csv.charCodeAt(0) === 0xfeff) {
    csv = csv.slice(1);
  }
  if (csv.startsWith("PK")) throw new OperationsError("EXCEL_SAVE_AS_CSV");
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const dataLines = lines.filter((line, index) => !(index === 0 && /^kind\s*,/i.test(line)));
  if (dataLines.length === 0) throw new OperationsError("IMPORT_EMPTY");
  const created: { line: number; username: string; kind: "student" | "staff"; id: number }[] = [];
  const failed: { line: number; code: string }[] = [];
  const limited = dataLines.slice(0, 200);
  for (let index = 0; index < limited.length; index += 1) {
    const lineNo = index + 1;
    const [kindRaw, idRaw] = limited[index]!.split(",").map((part) => part.trim());
    const kind = kindRaw === "student" || kindRaw === "staff" ? kindRaw : null;
    const id = Number(idRaw);
    if (!kind || !Number.isInteger(id) || id <= 0) {
      failed.push({ line: lineNo, code: "VALIDATION_ERROR" });
      continue;
    }
    try {
      const account = await provisionAccount(tenantId, actorId, { kind, id });
      created.push({ line: lineNo, username: account.username, kind, id });
    } catch (error) {
      if (error instanceof OperationsError) failed.push({ line: lineNo, code: error.code });
      else throw error;
    }
  }
  return { created, failed, skipped: Math.max(0, dataLines.length - 200) };
}

export async function healthSnapshot(tenantId: number) {
  const [active] = await db
    .select({ total: count() })
    .from(users)
    .where(scoped(users, tenantId, and(eq(users.isActive, 1), sql`${users.lastSeen} >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`)));
  const [everyone] = await db.select({ total: count() }).from(users).where(scoped(users, tenantId));
  const [failed] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(scoped(loginAttempts, tenantId, and(eq(loginAttempts.succeeded, 0), sql`${loginAttempts.createdAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`)));
  const [load1, load5, load15] = os.loadavg();
  return {
    activeUsers: Number(active?.total ?? 0),
    totalUsers: Number(everyone?.total ?? 0),
    failedLogins24h: Number(failed?.total ?? 0),
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    uptimeSeconds: Math.round(process.uptime()),
    load: [Number(load1?.toFixed(2) ?? 0), Number(load5?.toFixed(2) ?? 0), Number(load15?.toFixed(2) ?? 0)],
  };
}

export async function listDuties(tenantId: number) {
  const snap = await yearSnapshot(tenantId);
  const year = snap.academicYear ?? "";
  const classRows = await db
    .select({
      id: classes.classId,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      stream: classes.stream,
      staffId: classes.classTeacherId,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(classes)
    .leftJoin(staff, and(eq(staff.staffId, classes.classTeacherId), eq(staff.tenantId, tenantId)))
    .where(scoped(classes, tenantId))
    .orderBy(asc(classes.gradeLevel), asc(classes.section));
  const heads = await db
    .select({
      id: departmentHeads.headId,
      department: departmentHeads.department,
      staffId: departmentHeads.staffId,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(departmentHeads)
    .innerJoin(staff, and(eq(staff.staffId, departmentHeads.staffId), eq(staff.tenantId, tenantId)))
    .where(scoped(departmentHeads, tenantId, eq(departmentHeads.academicYear, year)))
    .orderBy(asc(departmentHeads.department));
  const teachers = await db
    .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.role, "Teacher")))
    .orderBy(asc(staff.firstName));
  return {
    academicYear: year,
    departments: [...DEPARTMENTS],
    classes: classRows.map((row) => ({
      id: row.id,
      gradeLevel: row.gradeLevel,
      section: row.section,
      stream: row.stream,
      staffId: row.staffId,
      teacherName: row.firstName ? `${row.firstName} ${row.lastName ?? ""}`.trim() : null,
    })),
    heads: heads.map((row) => ({
      id: row.id,
      department: row.department,
      staffId: row.staffId,
      teacherName: `${row.firstName} ${row.lastName}`.trim(),
    })),
    teachers: teachers.map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}`.trim() })),
  };
}

export async function assignHomeroom(tenantId: number, actorId: number, input: HomeroomDutyInput) {
  const [room] = await db
    .select({ id: classes.classId, owner: classes.classTeacherId, gradeLevel: classes.gradeLevel, section: classes.section })
    .from(classes)
    .where(scoped(classes, tenantId, eq(classes.classId, input.classId)))
    .limit(1);
  if (!room) throw new OperationsError("NOT_FOUND");
  const [person] = await db
    .select({ id: staff.staffId, role: staff.role })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, input.staffId)))
    .limit(1);
  if (!person) throw new OperationsError("NOT_FOUND");
  if (person.role !== "Teacher") throw new OperationsError("STAFF_NOT_TEACHER");
  const other = await db
    .select({ id: classes.classId })
    .from(classes)
      .where(scoped(classes, tenantId, and(eq(classes.classTeacherId, person.id), ne(classes.classId, room.id))))
    .limit(1);
  if (other.length > 0) throw new OperationsError("TEACHER_ASSIGNED");
  if (room.owner != null && room.owner !== person.id) {
    const still = await db
      .select({ id: classes.classId })
      .from(classes)
      .where(scoped(classes, tenantId, and(eq(classes.classTeacherId, room.owner), ne(classes.classId, room.id))))
      .limit(1);
    if (still.length === 0) {
      await db.update(staff).set({ isHomeroomAssigned: 0 }).where(scoped(staff, tenantId, eq(staff.staffId, room.owner)));
    }
  }
  await db.update(classes).set({ classTeacherId: person.id }).where(scoped(classes, tenantId, eq(classes.classId, room.id)));
  await db.update(staff).set({ isHomeroomAssigned: 1 }).where(scoped(staff, tenantId, eq(staff.staffId, person.id)));
  await writeAudit(tenantId, actorId, "duty.homeroom", `Homeroom grade ${room.gradeLevel}${room.section} staff ${person.id}`);
  return { classId: room.id, staffId: person.id };
}

export async function assignDepartmentHead(tenantId: number, actorId: number, input: DepartmentHeadInput) {
  const snap = await yearSnapshot(tenantId);
  if (!snap.academicYear) throw new OperationsError("YEAR_FORMAT");
  const [person] = await db
    .select({ id: staff.staffId, role: staff.role })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, input.staffId)))
    .limit(1);
  if (!person) throw new OperationsError("NOT_FOUND");
  if (person.role !== "Teacher") throw new OperationsError("STAFF_NOT_TEACHER");
  const [existing] = await db
    .select({ id: departmentHeads.headId })
    .from(departmentHeads)
    .where(
      scoped(
        departmentHeads,
        tenantId,
        and(eq(departmentHeads.department, input.department), eq(departmentHeads.academicYear, snap.academicYear)),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(departmentHeads)
      .set({ staffId: person.id })
      .where(scoped(departmentHeads, tenantId, eq(departmentHeads.headId, existing.id)));
  } else {
    await db.insert(departmentHeads).values(
      withTenant(
        { staffId: person.id, department: input.department, academicYear: snap.academicYear },
        tenantId,
      ),
    );
  }
  await writeAudit(tenantId, actorId, "duty.department", `${input.department} head staff ${person.id} year ${snap.academicYear}`);
  return { department: input.department, staffId: person.id, academicYear: snap.academicYear };
}
