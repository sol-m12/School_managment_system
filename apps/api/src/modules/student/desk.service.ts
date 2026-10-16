import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../../db/index.js";
import {
  announcements,
  attendance,
  classes,
  classSchedule,
  fileShares,
  grades,
  groupMembers,
  groupTasks,
  libraryAttendance,
  libraryBooks,
  libraryBorrowing,
  staff,
  staffFiles,
  stCommendations,
  stDocumentRequests,
  stTaskWork,
  students,
  subjects,
  supportTickets,
  tcIncidents,
  users,
  vocationalRequests,
  vpPenalties,
  vpPlacements,
  vpPrograms,
  vpReferrals,
} from "../../db/schema/index.js";
import { mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { placeStudent } from "../vice/vice.service.js";
import { ViceError } from "../vice/vice.service.js";
import {
  chooseBlock,
  documentBlock,
  homeworkBlock,
  libraryPoints,
  libraryRank,
  studyPlan,
  vocationalBand,
  type CurriculumBlock,
} from "./deskRules.js";

export type DeskErrorCode =
  | "NOT_FOUND"
  | CurriculumBlock
  | "ALREADY_OPEN"
  | "DEADLINE"
  | "ALREADY_SUBMITTED"
  | "PROGRAM_CLOSED"
  | "PROGRAM_FULL"
  | "ALREADY_PLACED";

export class DeskError extends Error {
  readonly code: DeskErrorCode;

  constructor(code: DeskErrorCode) {
    super(code);
    this.code = code;
  }
}

type Learner = {
  studentId: number;
  userId: number;
  fullName: string;
  gender: "M" | "F";
  age: number;
  gradeLevel: number;
  section: string;
  stream: string;
  vocationalId: number | null;
  academicYear: string;
  photo: string | null;
};

function today(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nowStamp(): string {
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
  return Number((result as [{ insertId: number }])[0].insertId);
}

async function learner(tenantId: number, userId: number): Promise<Learner> {
  const [row] = await db
    .select({
      studentId: students.studentId,
      fullName: students.fullName,
      gender: students.gender,
      age: students.age,
      gradeLevel: students.gradeLevel,
      section: students.section,
      stream: students.stream,
      vocationalId: students.vocationalId,
      academicYear: students.academicYear,
      photo: students.photo,
    })
    .from(students)
    .where(scoped(students, tenantId, eq(students.userId, userId)))
    .limit(1);
  if (!row) throw new DeskError("NOT_FOUND");
  return {
    studentId: row.studentId,
    userId,
    fullName: row.fullName,
    gender: row.gender,
    age: row.age,
    gradeLevel: row.gradeLevel,
    section: row.section ?? "",
    stream: row.stream ?? "",
    vocationalId: row.vocationalId,
    academicYear: row.academicYear,
    photo: row.photo,
  };
}

async function classIdFor(tenantId: number, me: Learner): Promise<number | null> {
  const stream = me.stream === "Natural" || me.stream === "Social" ? me.stream : null;
  const streamFilter = stream ? or(eq(classes.stream, stream), isNull(classes.stream)) : undefined;
  const [row] = await db
    .select({ id: classes.classId })
    .from(classes)
    .where(
      scoped(classes, tenantId, and(eq(classes.gradeLevel, me.gradeLevel), eq(classes.section, me.section), streamFilter)),
    )
    .orderBy(asc(classes.classId))
    .limit(1);
  return row?.id ?? null;
}

function fromVice(error: unknown): never {
  if (error instanceof ViceError) throw new DeskError(error.code as DeskErrorCode);
  throw error;
}

export async function attendanceStatus(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const rows = await db
    .select({
      id: attendance.attId,
      date: attendance.date,
      status: attendance.status,
      approval: attendance.approvalStatus,
      subject: subjects.subjectName,
    })
    .from(attendance)
    .leftJoin(subjects, and(eq(subjects.subjectId, attendance.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(attendance, tenantId, eq(attendance.studentId, me.studentId)))
    .orderBy(desc(attendance.date), desc(attendance.attId));
  const approved = rows.filter((row) => row.approval === "Approved");
  const count = (status: "P" | "A" | "T") => approved.filter((row) => row.status === status).length;
  return {
    present: count("P"),
    absent: count("A"),
    tardy: count("T"),
    rows: rows.slice(0, 40).map((row) => ({
      id: row.id,
      date: row.date,
      status: row.status,
      approval: row.approval,
      subject: row.subject ?? "",
    })),
  };
}

export async function disciplineStatus(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const [penalties, incidents, notes] = await Promise.all([
    db
      .select({
        id: vpPenalties.penaltyId,
        kind: vpPenalties.kind,
        days: vpPenalties.days,
        startsOn: vpPenalties.startsOn,
        note: vpPenalties.note,
      })
      .from(vpPenalties)
      .innerJoin(vpReferrals, and(eq(vpReferrals.referralId, vpPenalties.referralId), eq(vpReferrals.tenantId, tenantId)))
      .where(scoped(vpPenalties, tenantId, eq(vpReferrals.studentId, me.studentId)))
      .orderBy(desc(vpPenalties.penaltyId)),
    db
      .select({
        id: tcIncidents.incidentId,
        category: tcIncidents.category,
        summary: tcIncidents.summary,
        status: tcIncidents.status,
      })
      .from(tcIncidents)
      .where(scoped(tcIncidents, tenantId, eq(tcIncidents.studentId, me.studentId)))
      .orderBy(desc(tcIncidents.incidentId)),
    db
      .select({ id: stCommendations.commendationId, note: stCommendations.note, createdAt: stCommendations.createdAt })
      .from(stCommendations)
      .where(scoped(stCommendations, tenantId, eq(stCommendations.studentId, me.studentId)))
      .orderBy(desc(stCommendations.commendationId)),
  ]);
  return {
    warnings: [
      ...penalties.filter((row) => row.kind === "warning").map((row) => ({ id: row.id, text: row.note || row.kind, startsOn: row.startsOn })),
      ...incidents.map((row) => ({ id: row.id, text: row.summary, startsOn: row.status })),
    ],
    penalties: penalties
      .filter((row) => row.kind !== "warning")
      .map((row) => ({ id: row.id, kind: row.kind, days: row.days, startsOn: row.startsOn, note: row.note })),
    commendations: notes.map((row) => ({ id: row.id, note: row.note, createdAt: row.createdAt })),
  };
}

export async function timetable(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const classId = await classIdFor(tenantId, me);
  if (!classId) return { gradeLevel: me.gradeLevel, section: me.section, rows: [] };
  const rows = await db
    .select({
      id: classSchedule.timetableId,
      day: classSchedule.dayOfWeek,
      period: classSchedule.periodNumber,
      start: classSchedule.startTime,
      end: classSchedule.endTime,
      type: classSchedule.type,
      subject: subjects.subjectName,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(classSchedule)
    .leftJoin(subjects, and(eq(subjects.subjectId, classSchedule.subjectId), eq(subjects.tenantId, tenantId)))
    .leftJoin(staff, and(eq(staff.staffId, classSchedule.teacherStaffId), eq(staff.tenantId, tenantId)))
    .where(scoped(classSchedule, tenantId, and(eq(classSchedule.classId, classId), eq(classSchedule.academicYear, me.academicYear))))
    .orderBy(asc(classSchedule.dayOfWeek), asc(classSchedule.periodNumber));
  return {
    gradeLevel: me.gradeLevel,
    section: me.section,
    rows: rows.map((row) => ({
      id: row.id,
      day: row.day,
      period: row.period,
      start: String(row.start).slice(0, 5),
      end: String(row.end).slice(0, 5),
      type: row.type,
      subject: row.subject ?? "",
      teacher: [row.firstName, row.lastName].filter(Boolean).join(" "),
    })),
  };
}

export async function notifications(tenantId: number, userId: number) {
  await learner(tenantId, userId);
  const day = today();
  const rows = await db
    .select({
      id: announcements.announcementId,
      title: announcements.title,
      content: announcements.content,
      urgent: announcements.isUrgent,
      startDate: announcements.startDate,
      endDate: announcements.endDate,
    })
    .from(announcements)
    .where(scoped(announcements, tenantId, inArray(announcements.targetRole, ["All", "Students"])))
    .orderBy(desc(announcements.announcementId));
  return {
    rows: rows
      .filter((row) => row.startDate <= day && (row.endDate == null || row.endDate >= day))
      .map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        urgent: row.urgent === 1,
        startDate: row.startDate,
      })),
  };
}

export async function assignments(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const classId = await classIdFor(tenantId, me);
  const notes = classId
    ? await db
        .select({
          id: staffFiles.fileId,
          title: staffFiles.fileTitle,
          hasFile: staffFiles.fileName,
          fileType: staffFiles.fileType,
        })
        .from(fileShares)
        .innerJoin(staffFiles, eq(fileShares.fileId, staffFiles.fileId))
        .where(and(scoped(fileShares, tenantId, eq(fileShares.classId, classId)), scoped(staffFiles, tenantId)))
        .orderBy(desc(fileShares.shareId))
    : [];
  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(scoped(groupMembers, tenantId, eq(groupMembers.studentId, me.studentId)));
  const groupIds = memberships.map((row) => row.groupId);
  const tasks =
    groupIds.length === 0
      ? []
      : await db
          .select({
            id: groupTasks.taskId,
            title: groupTasks.taskTitle,
            deadline: groupTasks.deadline,
            subject: subjects.subjectName,
          })
          .from(groupTasks)
          .leftJoin(subjects, and(eq(subjects.subjectId, groupTasks.subjectId), eq(subjects.tenantId, tenantId)))
          .where(scoped(groupTasks, tenantId, inArray(groupTasks.groupId, groupIds)))
          .orderBy(desc(groupTasks.taskId));
  const taskIds = tasks.map((row) => row.id);
  const sent =
    taskIds.length === 0
      ? []
      : await db
          .select({ taskId: stTaskWork.taskId })
          .from(stTaskWork)
          .where(scoped(stTaskWork, tenantId, and(eq(stTaskWork.studentId, me.studentId), inArray(stTaskWork.taskId, taskIds))));
  const sentIds = new Set(sent.map((row) => row.taskId));
  return {
    notes: notes.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      hasFile: row.fileType !== "EDITOR" && Boolean(row.hasFile),
    })),
    tasks: tasks.map((row) => ({
      id: row.id,
      title: row.title,
      subject: row.subject ?? "",
      deadline: row.deadline,
      submitted: sentIds.has(row.id),
    })),
  };
}

export async function submitWork(tenantId: number, userId: number, taskId: number, body: string) {
  const me = await learner(tenantId, userId);
  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(scoped(groupMembers, tenantId, eq(groupMembers.studentId, me.studentId)));
  const groupIds = memberships.map((row) => row.groupId);
  if (groupIds.length === 0) throw new DeskError("NOT_FOUND");
  const [task] = await db
    .select({ id: groupTasks.taskId, deadline: groupTasks.deadline })
    .from(groupTasks)
    .where(scoped(groupTasks, tenantId, and(eq(groupTasks.taskId, taskId), inArray(groupTasks.groupId, groupIds))))
    .limit(1);
  if (!task) throw new DeskError("NOT_FOUND");
  const [existing] = await db
    .select({ id: stTaskWork.workId })
    .from(stTaskWork)
    .where(scoped(stTaskWork, tenantId, and(eq(stTaskWork.taskId, taskId), eq(stTaskWork.studentId, me.studentId))))
    .limit(1);
  const block = homeworkBlock(task.deadline, nowStamp(), Boolean(existing));
  if (block) throw new DeskError(block);
  try {
    const result = await db.insert(stTaskWork).values(withTenant({ taskId, studentId: me.studentId, body }, tenantId));
    return { id: insertId(result) };
  } catch (error) {
    if (mysqlErrno(error) === 1062) throw new DeskError("ALREADY_SUBMITTED");
    throw error;
  }
}

async function skillName(tenantId: number, subjectId: number | null): Promise<string | null> {
  if (subjectId == null) return null;
  const [row] = await db
    .select({ name: subjects.subjectName })
    .from(subjects)
    .where(scoped(subjects, tenantId, eq(subjects.subjectId, subjectId)))
    .limit(1);
  return row?.name ?? null;
}

export async function vocationalView(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const band = vocationalBand(me.gradeLevel);
  const offered = await db
    .select({ id: subjects.subjectId, name: subjects.subjectName })
    .from(subjects)
    .where(scoped(subjects, tenantId, and(eq(subjects.gradeLevel, me.gradeLevel), eq(subjects.isVocational, 1))))
    .orderBy(asc(subjects.subjectName));
  const programs = await db
    .select()
    .from(vpPrograms)
    .where(scoped(vpPrograms, tenantId, eq(vpPrograms.gradeLevel, me.gradeLevel)))
    .orderBy(desc(vpPrograms.programId));
  const programIds = programs.map((row) => row.programId);
  const seats =
    programIds.length === 0
      ? []
      : await db
          .select({ programId: vpPlacements.programId, studentId: vpPlacements.studentId, status: vpPlacements.status })
          .from(vpPlacements)
          .where(scoped(vpPlacements, tenantId, inArray(vpPlacements.programId, programIds)));
  return {
    band,
    gradeLevel: me.gradeLevel,
    canChoose: band === "choose" && me.vocationalId == null,
    currentSkill: await skillName(tenantId, me.vocationalId),
    subjects: offered,
    programs: programs.map((row) => ({
      id: row.programId,
      name: row.name,
      trade: row.trade,
      status: row.status,
      capacity: row.capacity,
      filled: seats.filter((seat) => seat.programId === row.programId && (seat.status === "Applied" || seat.status === "Placed")).length,
      mine: seats.some((seat) => seat.programId === row.programId && seat.studentId === me.studentId && (seat.status === "Applied" || seat.status === "Placed")),
    })),
  };
}

export async function chooseSkill(tenantId: number, userId: number, subjectId: number) {
  const me = await learner(tenantId, userId);
  const [subject] = await db
    .select({ id: subjects.subjectId })
    .from(subjects)
    .where(
      scoped(
        subjects,
        tenantId,
        and(eq(subjects.subjectId, subjectId), eq(subjects.gradeLevel, me.gradeLevel), eq(subjects.isVocational, 1)),
      ),
    )
    .limit(1);
  const block = chooseBlock(vocationalBand(me.gradeLevel), me.vocationalId != null, Boolean(subject));
  if (block) throw new DeskError(block);
  await db.insert(vocationalRequests).values(
    withTenant({ studentId: me.studentId, subjectId, status: "Assigned" as const }, tenantId),
  );
  await db
    .update(students)
    .set({ vocationalId: subjectId })
    .where(scoped(students, tenantId, eq(students.studentId, me.studentId)));
  return { subjectId };
}

export async function applyProgram(tenantId: number, userId: number, programId: number, note: string) {
  const me = await learner(tenantId, userId);
  try {
    return await placeStudent(tenantId, userId, { programId, studentId: me.studentId, note });
  } catch (error) {
    fromVice(error);
  }
}

export async function libraryDesk(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const [loans, visits] = await Promise.all([
    db
      .select({
        id: libraryBorrowing.borrowId,
        title: libraryBooks.bookName,
        status: libraryBorrowing.status,
        borrowDate: libraryBorrowing.borrowDate,
        returnDate: libraryBorrowing.returnDate,
      })
      .from(libraryBorrowing)
      .leftJoin(libraryBooks, and(eq(libraryBooks.bookId, libraryBorrowing.bookId), eq(libraryBooks.tenantId, tenantId)))
      .where(scoped(libraryBorrowing, tenantId, eq(libraryBorrowing.userId, userId)))
      .orderBy(desc(libraryBorrowing.borrowId)),
    db
      .select({
        id: libraryAttendance.attendanceId,
        date: libraryAttendance.date,
        shift: libraryAttendance.shift,
        bookTitle: libraryAttendance.bookTitle,
      })
      .from(libraryAttendance)
      .where(scoped(libraryAttendance, tenantId, eq(libraryAttendance.studentId, me.studentId)))
      .orderBy(desc(libraryAttendance.attendanceId)),
  ]);
  const day = today();
  const returned = loans.filter((row) => row.status === "Returned").length;
  const late = loans.filter((row) => row.status === "Borrowed" && row.returnDate != null && row.returnDate < day).length;
  const points = libraryPoints(visits.length, returned, late);
  return {
    points,
    rank: libraryRank(points),
    borrowed: loans.filter((row) => row.status === "Borrowed").length,
    visits: visits.length,
    loans: loans.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      status: row.status ?? "Borrowed",
      borrowDate: row.borrowDate,
      returnDate: row.returnDate,
      late: row.status === "Borrowed" && row.returnDate != null && row.returnDate < day,
    })),
    usage: visits.map((row) => ({ id: row.id, date: row.date, shift: row.shift, bookTitle: row.bookTitle ?? "" })),
  };
}

export async function documentRequests(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const rows = await db
    .select({
      id: stDocumentRequests.requestId,
      kind: stDocumentRequests.kind,
      purpose: stDocumentRequests.purpose,
      status: stDocumentRequests.status,
      createdAt: stDocumentRequests.createdAt,
    })
    .from(stDocumentRequests)
    .where(scoped(stDocumentRequests, tenantId, eq(stDocumentRequests.studentId, me.studentId)))
    .orderBy(desc(stDocumentRequests.requestId));
  return { gradeLevel: me.gradeLevel, canRequest: me.gradeLevel === 12, rows };
}

export async function requestDocument(tenantId: number, userId: number, kind: "transcript" | "document", purpose: string) {
  const me = await learner(tenantId, userId);
  const open = await db
    .select({ id: stDocumentRequests.requestId })
    .from(stDocumentRequests)
    .where(
      scoped(
        stDocumentRequests,
        tenantId,
        and(eq(stDocumentRequests.studentId, me.studentId), inArray(stDocumentRequests.status, ["Submitted", "Reviewing", "Ready"])),
      ),
    )
    .limit(1);
  const block = documentBlock(me.gradeLevel, open.length > 0);
  if (block) throw new DeskError(block);
  const result = await db.insert(stDocumentRequests).values(
    withTenant({ studentId: me.studentId, kind, purpose, status: "Submitted" as const }, tenantId),
  );
  return { id: insertId(result) };
}

export async function helpdesk(tenantId: number, userId: number) {
  await learner(tenantId, userId);
  const rows = await db
    .select({
      id: supportTickets.ticketId,
      title: supportTickets.title,
      details: supportTickets.details,
      category: supportTickets.category,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .where(scoped(supportTickets, tenantId, eq(supportTickets.openedBy, userId)))
    .orderBy(desc(supportTickets.ticketId));
  return { rows };
}

export async function openQuery(
  tenantId: number,
  userId: number,
  input: { title: string; details: string; category: "account" | "network" | "hardware" | "marks" | "other" },
) {
  await learner(tenantId, userId);
  const result = await db.insert(supportTickets).values(
    withTenant(
      {
        openedBy: userId,
        title: input.title,
        details: input.details,
        category: input.category,
        priority: "normal" as const,
        status: "Open" as const,
      },
      tenantId,
    ),
  );
  return { id: insertId(result) };
}

export async function closeQuery(tenantId: number, userId: number, ticketId: number) {
  await learner(tenantId, userId);
  const [row] = await db
    .select({ id: supportTickets.ticketId, status: supportTickets.status })
    .from(supportTickets)
    .where(scoped(supportTickets, tenantId, and(eq(supportTickets.ticketId, ticketId), eq(supportTickets.openedBy, userId))))
    .limit(1);
  if (!row) throw new DeskError("NOT_FOUND");
  if (row.status === "Resolved" || row.status === "Closed") throw new DeskError("NOT_FOUND");
  await db
    .update(supportTickets)
    .set({ status: "Closed" })
    .where(scoped(supportTickets, tenantId, eq(supportTickets.ticketId, ticketId)));
  return { id: ticketId };
}

export async function studyDesk(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const [markRows, absenceRows] = await Promise.all([
    db
      .select({ subjectId: grades.subjectId, name: subjects.subjectName, score: grades.score })
      .from(grades)
      .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
      .where(scoped(grades, tenantId, and(eq(grades.studentId, me.studentId), eq(grades.academicYear, me.academicYear)))),
    db
      .select({ subjectId: attendance.subjectId })
      .from(attendance)
      .where(
        scoped(
          attendance,
          tenantId,
          and(eq(attendance.studentId, me.studentId), eq(attendance.status, "A"), eq(attendance.approvalStatus, "Approved")),
        ),
      ),
  ]);
  const bySubject = new Map<number, { name: string; total: number; count: number; absences: number }>();
  for (const row of markRows) {
    const current = bySubject.get(row.subjectId) ?? { name: row.name, total: 0, count: 0, absences: 0 };
    current.total += Number(row.score);
    current.count += 1;
    bySubject.set(row.subjectId, current);
  }
  for (const row of absenceRows) {
    if (row.subjectId == null) continue;
    const current = bySubject.get(row.subjectId) ?? { name: "", total: 0, count: 0, absences: 0 };
    current.absences += 1;
    bySubject.set(row.subjectId, current);
  }
  const missingNames = [...bySubject.entries()].filter(([, row]) => row.name === "").map(([id]) => id);
  if (missingNames.length > 0) {
    const named = await db
      .select({ id: subjects.subjectId, name: subjects.subjectName })
      .from(subjects)
      .where(scoped(subjects, tenantId, inArray(subjects.subjectId, missingNames)));
    for (const row of named) {
      const current = bySubject.get(row.id);
      if (current) current.name = row.name;
    }
  }
  const items = studyPlan(
    [...bySubject.values()].map((row) => ({
      name: row.name,
      average: row.count === 0 ? null : Math.round(row.total / row.count),
      absences: row.absences,
    })),
  );
  return { items };
}

export async function digitalId(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const [account] = await db
    .select({ username: users.username })
    .from(users)
    .where(scoped(users, tenantId, eq(users.userId, userId)))
    .limit(1);
  const code = `KEYT-${tenantId}-${me.studentId}`;
  const qrSvg = await QRCode.toString(code, { type: "svg", margin: 1, width: 180 });
  return {
    code,
    qrSvg,
    fullName: me.fullName,
    username: account?.username ?? "",
    gender: me.gender,
    age: me.age,
    gradeLevel: me.gradeLevel,
    section: me.section,
    academicYear: me.academicYear,
    photo: me.photo && !me.photo.includes("/") && !me.photo.includes("\\") ? me.photo : null,
  };
}

export async function recordCommendation(tenantId: number, userId: number, studentId: number, note: string) {
  const [pupil] = await db
    .select({ id: students.studentId })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!pupil) throw new DeskError("NOT_FOUND");
  const result = await db.insert(stCommendations).values(withTenant({ studentId, note, recordedBy: userId }, tenantId));
  return { id: insertId(result) };
}
