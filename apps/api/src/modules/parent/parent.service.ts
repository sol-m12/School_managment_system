import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  announcements,
  lbLiteracy,
  parentAppointmentRequests,
  parentIdentities,
  parentMessages,
  parentStudentLinks,
  schoolSettings,
  students,
  tenants,
  users,
} from "../../db/schema/index.js";
import { hashPassword } from "../../lib/password.js";
import { mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import * as desk from "../student/desk.service.js";
import * as student from "../student/student.service.js";
import type {
  AppointmentInput,
  CreateParentInput,
  LinkParentInput,
  MessageInput,
} from "./parent.schema.js";

const ER_DUP_ENTRY = 1062;

export type ParentErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "USERNAME_TAKEN"
  | "ALREADY_LINKED"
  | "NO_STUDENT_ACCOUNT"
  | "CODE_INVALID"
  | "NOT_PARENT"
  | "STUDENT_TENANT";

export class ParentError extends Error {
  readonly code: ParentErrorCode;

  constructor(code: ParentErrorCode) {
    super(code);
    this.code = code;
  }
}

type ParentAccount = {
  userId: number;
  parentId: number;
  username: string;
  displayName: string;
  parentCode: string;
  homeTenantId: number;
};

type LinkedChild = {
  linkId: number;
  studentId: number;
  tenantId: number;
  studentUserId: number | null;
  fullName: string;
  photo: string | null;
  gradeLevel: number;
  section: string;
  schoolName: string;
  tenantSlug: string;
};

function insertId(result: unknown): number {
  return Number((result as [{ insertId: number }])[0].insertId);
}

function today(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function newParentCode(): string {
  return `KEYT-P-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function schoolLabel(tenantId: number): Promise<{ name: string; slug: string }> {
  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) return { name: "School", slug: "" };
  const [settings] = await db
    .select({ schoolName: schoolSettings.schoolName })
    .from(schoolSettings)
    .where(scoped(schoolSettings, tenantId))
    .limit(1);
  const name = settings?.schoolName?.trim() || tenant.name?.trim() || "School";
  return { name, slug: tenant.slug };
}

async function loadParentAccount(userId: number): Promise<ParentAccount> {
  const [row] = await db
    .select({
      userId: users.userId,
      parentId: users.parentId,
      username: users.username,
      role: users.role,
      tenantId: users.tenantId,
      displayName: parentIdentities.displayName,
      parentCode: parentIdentities.parentCode,
    })
    .from(users)
    .leftJoin(parentIdentities, eq(parentIdentities.parentId, users.parentId))
    .where(eq(users.userId, userId))
    .limit(1);
  if (!row || row.role !== "Parent" || row.parentId == null || !row.parentCode || !row.displayName) {
    throw new ParentError("NOT_PARENT");
  }
  return {
    userId: row.userId,
    parentId: row.parentId,
    username: row.username,
    displayName: row.displayName,
    parentCode: row.parentCode,
    homeTenantId: row.tenantId,
  };
}

async function assertLinkedChild(parentUserId: number, studentId: number): Promise<LinkedChild> {
  const account = await loadParentAccount(parentUserId);
  const [link] = await db
    .select({
      linkId: parentStudentLinks.linkId,
      studentId: parentStudentLinks.studentId,
      tenantId: parentStudentLinks.tenantId,
      fullName: students.fullName,
      photo: students.photo,
      gradeLevel: students.gradeLevel,
      section: students.section,
      studentUserId: students.userId,
    })
    .from(parentStudentLinks)
    .innerJoin(
      students,
      and(eq(students.studentId, parentStudentLinks.studentId), eq(students.tenantId, parentStudentLinks.tenantId)),
    )
    .where(
      and(eq(parentStudentLinks.parentId, account.parentId), eq(parentStudentLinks.studentId, studentId)),
    )
    .limit(1);
  if (!link) throw new ParentError("FORBIDDEN");
  const school = await schoolLabel(link.tenantId);
  return {
    linkId: link.linkId,
    studentId: link.studentId,
    tenantId: link.tenantId,
    studentUserId: link.studentUserId,
    fullName: link.fullName,
    photo: link.photo,
    gradeLevel: link.gradeLevel,
    section: link.section ?? "",
    schoolName: school.name,
    tenantSlug: school.slug,
  };
}

async function requireStudentUser(child: LinkedChild): Promise<number> {
  if (child.studentUserId == null) throw new ParentError("NO_STUDENT_ACCOUNT");
  return child.studentUserId;
}

export async function createParentAccount(
  tenantId: number,
  actorId: number,
  input: CreateParentInput,
): Promise<{ userId: number; parentId: number; parentCode: string; username: string }> {
  void actorId;
  const [taken] = await db
    .select({ id: users.userId })
    .from(users)
    .where(scoped(users, tenantId, eq(users.username, input.username)))
    .limit(1);
  if (taken) throw new ParentError("USERNAME_TAKEN");

  let parentCode = newParentCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [exists] = await db
      .select({ id: parentIdentities.parentId })
      .from(parentIdentities)
      .where(eq(parentIdentities.parentCode, parentCode))
      .limit(1);
    if (!exists) break;
    parentCode = newParentCode();
  }

  const parentId = insertId(
    await db.insert(parentIdentities).values({
      parentCode,
      displayName: input.displayName,
    }),
  );

  try {
    const userId = insertId(
      await db.insert(users).values(
        withTenant(
          {
            username: input.username,
            passwordHash: await hashPassword(input.password),
            role: "Parent",
            passwordChanged: 0,
            isActive: 1,
            tokenVersion: 0,
            parentId,
          },
          tenantId,
        ),
      ),
    );
    return { userId, parentId, parentCode, username: input.username };
  } catch (error) {
    await db.delete(parentIdentities).where(eq(parentIdentities.parentId, parentId));
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ParentError("USERNAME_TAKEN");
    throw error;
  }
}

export async function listManagedParents(tenantId: number) {
  const homeParents = await db
    .select({
      userId: users.userId,
      username: users.username,
      parentId: users.parentId,
      displayName: parentIdentities.displayName,
      parentCode: parentIdentities.parentCode,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(parentIdentities, eq(parentIdentities.parentId, users.parentId))
    .where(scoped(users, tenantId, eq(users.role, "Parent")))
    .orderBy(desc(users.userId));

  const links = await db
    .select({
      linkId: parentStudentLinks.linkId,
      parentId: parentStudentLinks.parentId,
      studentId: parentStudentLinks.studentId,
      fullName: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
      parentCode: parentIdentities.parentCode,
      displayName: parentIdentities.displayName,
    })
    .from(parentStudentLinks)
    .innerJoin(parentIdentities, eq(parentIdentities.parentId, parentStudentLinks.parentId))
    .innerJoin(
      students,
      and(eq(students.studentId, parentStudentLinks.studentId), eq(students.tenantId, parentStudentLinks.tenantId)),
    )
    .where(eq(parentStudentLinks.tenantId, tenantId))
    .orderBy(desc(parentStudentLinks.linkId));

  return {
    parents: homeParents.map((row) => ({
      userId: row.userId,
      username: row.username,
      parentId: row.parentId,
      displayName: row.displayName,
      parentCode: row.parentCode,
      isActive: row.isActive === 1,
    })),
    links: links.map((row) => ({
      linkId: row.linkId,
      parentId: row.parentId,
      parentCode: row.parentCode,
      displayName: row.displayName,
      studentId: row.studentId,
      studentName: row.fullName,
      gradeLevel: row.gradeLevel,
      section: row.section ?? "",
    })),
  };
}

export async function lookupParentByCode(code: string) {
  const [row] = await db
    .select({
      parentId: parentIdentities.parentId,
      parentCode: parentIdentities.parentCode,
      displayName: parentIdentities.displayName,
    })
    .from(parentIdentities)
    .where(eq(parentIdentities.parentCode, code.trim().toUpperCase()))
    .limit(1);
  if (!row) throw new ParentError("CODE_INVALID");
  return {
    parentId: row.parentId,
    parentCode: row.parentCode,
    displayName: row.displayName,
  };
}

export async function linkParentToStudent(tenantId: number, actorId: number, input: LinkParentInput) {
  const identity = await lookupParentByCode(input.parentCode);
  const [student] = await db
    .select({
      studentId: students.studentId,
      fullName: students.fullName,
      tenantId: students.tenantId,
    })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, input.studentId)))
    .limit(1);
  if (!student) throw new ParentError("NOT_FOUND");
  if (student.tenantId !== tenantId) throw new ParentError("STUDENT_TENANT");

  try {
    const linkId = insertId(
      await db.insert(parentStudentLinks).values({
        parentId: identity.parentId,
        studentId: student.studentId,
        tenantId,
        linkedBy: actorId,
      }),
    );
    return {
      linkId,
      parentId: identity.parentId,
      parentCode: identity.parentCode,
      displayName: identity.displayName,
      studentId: student.studentId,
      studentName: student.fullName,
    };
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ParentError("ALREADY_LINKED");
    throw error;
  }
}

export async function unlinkParentStudent(tenantId: number, linkId: number) {
  const [row] = await db
    .select({ id: parentStudentLinks.linkId })
    .from(parentStudentLinks)
    .where(and(eq(parentStudentLinks.linkId, linkId), eq(parentStudentLinks.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new ParentError("NOT_FOUND");
  await db
    .delete(parentStudentLinks)
    .where(and(eq(parentStudentLinks.linkId, linkId), eq(parentStudentLinks.tenantId, tenantId)));
  return { id: linkId };
}

export async function listStudentsForLinking(tenantId: number) {
  const rows = await db
    .select({
      id: students.studentId,
      name: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
    })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(asc(students.fullName))
    .limit(500);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      gradeLevel: row.gradeLevel,
      section: row.section ?? "",
    })),
  };
}

export async function listChildren(parentUserId: number) {
  const account = await loadParentAccount(parentUserId);
  const rows = await db
    .select({
      linkId: parentStudentLinks.linkId,
      studentId: parentStudentLinks.studentId,
      tenantId: parentStudentLinks.tenantId,
      fullName: students.fullName,
      photo: students.photo,
      gradeLevel: students.gradeLevel,
      section: students.section,
      studentUserId: students.userId,
    })
    .from(parentStudentLinks)
    .innerJoin(
      students,
      and(eq(students.studentId, parentStudentLinks.studentId), eq(students.tenantId, parentStudentLinks.tenantId)),
    )
    .where(eq(parentStudentLinks.parentId, account.parentId))
    .orderBy(asc(students.fullName));

  const children = await Promise.all(
    rows.map(async (row) => {
      const school = await schoolLabel(row.tenantId);
      return {
        linkId: row.linkId,
        studentId: row.studentId,
        tenantId: row.tenantId,
        fullName: row.fullName,
        photo: row.photo,
        gradeLevel: row.gradeLevel,
        section: row.section ?? "",
        schoolName: school.name,
        tenantSlug: school.slug,
        hasAccount: row.studentUserId != null,
      };
    }),
  );

  return {
    parent: {
      displayName: account.displayName,
      parentCode: account.parentCode,
    },
    children,
  };
}

export async function childAttendance(parentUserId: number, studentId: number) {
  const child = await assertLinkedChild(parentUserId, studentId);
  const studentUserId = await requireStudentUser(child);
  return desk.attendanceStatus(child.tenantId, studentUserId);
}

export async function childDiscipline(parentUserId: number, studentId: number) {
  const child = await assertLinkedChild(parentUserId, studentId);
  const studentUserId = await requireStudentUser(child);
  return desk.disciplineStatus(child.tenantId, studentUserId);
}

export async function childAssignments(parentUserId: number, studentId: number) {
  const child = await assertLinkedChild(parentUserId, studentId);
  const studentUserId = await requireStudentUser(child);
  const data = await desk.assignments(child.tenantId, studentUserId);
  const day = today();
  return {
    ...data,
    tasks: data.tasks.map((task) => {
      const done = Boolean(task.submitted);
      const deadlineDay = String(task.deadline ?? "").slice(0, 10);
      const overdue = !done && Boolean(deadlineDay) && deadlineDay < day;
      const pending = !done && !overdue;
      return {
        ...task,
        indicator: done ? "done" : overdue ? "missing" : "pending",
      };
    }),
    notes: data.notes,
    meta: { indicators: { done: "done", missing: "missing", pending: "pending" } },
  };
}

export async function childResults(parentUserId: number, studentId: number) {
  const child = await assertLinkedChild(parentUserId, studentId);
  const studentUserId = await requireStudentUser(child);
  return student.studentResults(child.tenantId, studentUserId);
}

export async function childLibrary(parentUserId: number, studentId: number) {
  const child = await assertLinkedChild(parentUserId, studentId);
  const studentUserId = await requireStudentUser(child);
  const [deskData, literacyRows] = await Promise.all([
    desk.libraryDesk(child.tenantId, studentUserId),
    db
      .select({
        id: lbLiteracy.reportId,
        year: lbLiteracy.academicYear,
        visits: lbLiteracy.visits,
        returned: lbLiteracy.returnedCount,
        openLoans: lbLiteracy.openLoans,
        note: lbLiteracy.note,
      })
      .from(lbLiteracy)
      .where(scoped(lbLiteracy, child.tenantId, eq(lbLiteracy.studentId, child.studentId)))
      .orderBy(desc(lbLiteracy.reportId)),
  ]);
  return {
    ...deskData,
    literacy: literacyRows.map((row) => ({
      id: row.id,
      year: row.year,
      visits: row.visits,
      returned: row.returned,
      openLoans: row.openLoans,
      note: row.note,
    })),
  };
}

export async function notifications(parentUserId: number) {
  const account = await loadParentAccount(parentUserId);
  const links = await db
    .select({ tenantId: parentStudentLinks.tenantId })
    .from(parentStudentLinks)
    .where(eq(parentStudentLinks.parentId, account.parentId));
  const tenantIds = [...new Set(links.map((row) => row.tenantId))];
  if (tenantIds.length === 0) return { rows: [] };

  const day = today();
  const rows = await db
    .select({
      id: announcements.announcementId,
      title: announcements.title,
      content: announcements.content,
      urgent: announcements.isUrgent,
      startDate: announcements.startDate,
      endDate: announcements.endDate,
      tenantId: announcements.tenantId,
      targetRole: announcements.targetRole,
    })
    .from(announcements)
    .where(
      and(
        inArray(announcements.tenantId, tenantIds),
        inArray(announcements.targetRole, ["All", "Parents"]),
      ),
    )
    .orderBy(desc(announcements.announcementId))
    .limit(100);

  const labeled = await Promise.all(
    rows
      .filter((row) => row.startDate <= day && (row.endDate == null || row.endDate >= day))
      .map(async (row) => {
        const school = await schoolLabel(row.tenantId);
        return {
          id: row.id,
          title: row.title,
          content: row.content,
          urgent: row.urgent === 1,
          startDate: row.startDate,
          tenantId: row.tenantId,
          schoolName: school.name,
          targetRole: row.targetRole,
        };
      }),
  );
  return { rows: labeled };
}

export async function listAppointments(parentUserId: number) {
  const account = await loadParentAccount(parentUserId);
  const rows = await db
    .select({
      id: parentAppointmentRequests.requestId,
      studentId: parentAppointmentRequests.studentId,
      tenantId: parentAppointmentRequests.tenantId,
      withRole: parentAppointmentRequests.withRole,
      purpose: parentAppointmentRequests.purpose,
      preferredDate: parentAppointmentRequests.preferredDate,
      preferredTime: parentAppointmentRequests.preferredTime,
      status: parentAppointmentRequests.status,
      createdAt: parentAppointmentRequests.createdAt,
    })
    .from(parentAppointmentRequests)
    .where(eq(parentAppointmentRequests.parentId, account.parentId))
    .orderBy(desc(parentAppointmentRequests.requestId))
    .limit(100);

  const out = await Promise.all(
    rows.map(async (row) => {
      const school = await schoolLabel(row.tenantId);
      const [learner] = await db
        .select({ fullName: students.fullName })
        .from(students)
        .where(scoped(students, row.tenantId, eq(students.studentId, row.studentId)))
        .limit(1);
      return {
        ...row,
        studentName: learner?.fullName ?? "",
        schoolName: school.name,
      };
    }),
  );
  return { rows: out };
}

export async function requestAppointment(parentUserId: number, input: AppointmentInput) {
  const child = await assertLinkedChild(parentUserId, input.studentId);
  const account = await loadParentAccount(parentUserId);
  const id = insertId(
    await db.insert(parentAppointmentRequests).values({
      tenantId: child.tenantId,
      parentUserId,
      parentId: account.parentId,
      studentId: child.studentId,
      withRole: input.withRole,
      purpose: input.purpose,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime ?? null,
      status: "Pending",
    }),
  );
  return { id, status: "Pending" as const };
}

export async function listMessages(parentUserId: number, studentId: number) {
  const child = await assertLinkedChild(parentUserId, studentId);
  const account = await loadParentAccount(parentUserId);
  const rows = await db
    .select({
      id: parentMessages.messageId,
      withRole: parentMessages.withRole,
      subjectName: parentMessages.subjectName,
      body: parentMessages.body,
      direction: parentMessages.direction,
      createdAt: parentMessages.createdAt,
    })
    .from(parentMessages)
    .where(
      and(
        eq(parentMessages.parentId, account.parentId),
        eq(parentMessages.studentId, child.studentId),
        eq(parentMessages.tenantId, child.tenantId),
      ),
    )
    .orderBy(desc(parentMessages.messageId))
    .limit(200);
  return { rows, schoolName: child.schoolName, studentName: child.fullName };
}

export async function sendMessage(parentUserId: number, input: MessageInput) {
  const child = await assertLinkedChild(parentUserId, input.studentId);
  const account = await loadParentAccount(parentUserId);
  if (input.withRole === "Subject" && !input.subjectName?.trim()) {
    throw new ParentError("NOT_FOUND");
  }
  const id = insertId(
    await db.insert(parentMessages).values({
      tenantId: child.tenantId,
      parentUserId,
      parentId: account.parentId,
      studentId: child.studentId,
      withRole: input.withRole,
      subjectName: input.withRole === "Subject" ? input.subjectName?.trim() ?? null : null,
      body: input.body,
      direction: "out",
    }),
  );
  return { id };
}
