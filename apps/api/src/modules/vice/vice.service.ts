import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  auditLog,
  classes,
  classSchedule,
  staff,
  students,
  subjects,
  vpExamSessions,
  vpHearings,
  vpInvigilators,
  vpPenalties,
  vpPlacements,
  vpPrograms,
  vpReferrals,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { placementBlock, programGradeBlock, tradeMatches, vocationalBand } from "../student/deskRules.js";
import { clocksOverlap, planInvigilation } from "./invigilation.js";
import type {
  HearingInput,
  HearingOutcomeInput,
  PenaltyInput,
  PlacementInput,
  ProgramInput,
  ReferralInput,
  SessionInput,
} from "./vice.schema.js";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function weekdayOf(isoDate: string): (typeof WEEKDAYS)[number] {
  return WEEKDAYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()] ?? "Monday";
}

export type ViceErrorCode =
  | "NOT_FOUND"
  | "PROGRAM_CLOSED"
  | "PROGRAM_FULL"
  | "ALREADY_PLACED"
  | "HEARING_REQUIRED"
  | "NOT_READY"
  | "OVERLAP"
  | "SESSION_FULL"
  | "ALREADY_ASSIGNED"
  | "GRADE_CLOSED"
  | "EXPLORE_ONLY"
  | "CONTINUE_ONLY"
  | "ALREADY_CHOSEN"
  | "NOT_IN_CURRICULUM"
  | "WRONG_GRADE";

export class ViceError extends Error {
  readonly code: ViceErrorCode;

  constructor(code: ViceErrorCode) {
    super(code);
    this.code = code;
  }
}

const ACTIVE_PLACEMENT = ["Applied", "Placed"] as const;

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

function clock(value: string): string {
  return value.length === 5 ? `${value}:00` : value.slice(0, 8);
}

async function writeAudit(tenantId: number, userId: number, actionType: string, description: string): Promise<void> {
  await db.insert(auditLog).values(withTenant({ userId, actionType, description, timestamp: addisNow() }, tenantId));
}

async function studentExists(tenantId: number, studentId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: students.studentId })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  return Boolean(row);
}

export async function vocationalView(tenantId: number) {
  const [programs, placements, roster] = await Promise.all([
    db.select().from(vpPrograms).where(scoped(vpPrograms, tenantId)).orderBy(desc(vpPrograms.programId)),
    db.select().from(vpPlacements).where(scoped(vpPlacements, tenantId)).orderBy(desc(vpPlacements.placementId)),
    db
      .select({
        id: students.studentId,
        name: students.fullName,
        gradeLevel: students.gradeLevel,
        section: students.section,
      })
      .from(students)
      .where(scoped(students, tenantId))
      .orderBy(students.fullName),
  ]);

  const names = new Map(roster.map((row) => [row.id, row.name]));
  const titles = new Map(programs.map((row) => [row.programId, row.name]));

  return {
    students: roster,
    programs: programs.map((row) => ({
      id: row.programId,
      name: row.name,
      trade: row.trade,
      gradeLevel: row.gradeLevel,
      capacity: row.capacity,
      status: row.status,
      description: row.description,
      filled: placements.filter(
        (seat) => seat.programId === row.programId && (seat.status === "Applied" || seat.status === "Placed"),
      ).length,
    })),
    placements: placements.map((row) => ({
      id: row.placementId,
      programId: row.programId,
      programName: titles.get(row.programId) ?? "",
      studentId: row.studentId,
      studentName: names.get(row.studentId) ?? "",
      status: row.status,
      note: row.note,
    })),
  };
}

async function curriculumNames(tenantId: number, grade: number): Promise<string[]> {
  const rows = await db
    .select({ name: subjects.subjectName })
    .from(subjects)
    .where(scoped(subjects, tenantId, and(eq(subjects.gradeLevel, grade), eq(subjects.isVocational, 1))));
  return rows.map((row) => row.name);
}

export async function createProgram(tenantId: number, userId: number, input: ProgramInput) {
  const gradeBlock = programGradeBlock(input.gradeLevel);
  if (gradeBlock) throw new ViceError(gradeBlock);
  const names = await curriculumNames(tenantId, input.gradeLevel ?? 0);
  if (!names.some((name) => tradeMatches(input.trade, name))) throw new ViceError("NOT_IN_CURRICULUM");
  const result = await db.insert(vpPrograms).values(
    withTenant(
      {
        name: input.name,
        trade: input.trade,
        gradeLevel: input.gradeLevel,
        capacity: input.capacity,
        description: input.description,
        status: "Open",
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  const id = insertId(result);
  await writeAudit(tenantId, userId, "vp_program", `Opened vocational program ${id}`);
  return { id };
}

export async function setProgramStatus(tenantId: number, userId: number, programId: number, status: "Open" | "Closed") {
  const [row] = await db
    .select({ id: vpPrograms.programId })
    .from(vpPrograms)
    .where(scoped(vpPrograms, tenantId, eq(vpPrograms.programId, programId)))
    .limit(1);
  if (!row) throw new ViceError("NOT_FOUND");
  await db
    .update(vpPrograms)
    .set({ status })
    .where(scoped(vpPrograms, tenantId, eq(vpPrograms.programId, programId)));
  await writeAudit(tenantId, userId, "vp_program", `Set program ${programId} to ${status}`);
}

export async function placeStudent(tenantId: number, userId: number, input: PlacementInput) {
  const [program] = await db
    .select()
    .from(vpPrograms)
    .where(scoped(vpPrograms, tenantId, eq(vpPrograms.programId, input.programId)))
    .limit(1);
  if (!program) throw new ViceError("NOT_FOUND");
  const [pupil] = await db
    .select({ id: students.studentId, grade: students.gradeLevel, skillId: students.vocationalId })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, input.studentId)))
    .limit(1);
  if (!pupil) throw new ViceError("NOT_FOUND");
  const names = await curriculumNames(tenantId, pupil.grade);
  let currentSkill: string | null = null;
  if (pupil.skillId != null) {
    const [skill] = await db
      .select({ name: subjects.subjectName })
      .from(subjects)
      .where(scoped(subjects, tenantId, eq(subjects.subjectId, pupil.skillId)))
      .limit(1);
    currentSkill = skill?.name ?? null;
  }
  const block = placementBlock({
    studentGrade: pupil.grade,
    programGrade: program.gradeLevel,
    trade: program.trade,
    curriculumNames: names,
    currentSkill,
  });
  if (block) throw new ViceError(block);
  if (program.status !== "Open") throw new ViceError("PROGRAM_CLOSED");

  const seats = await db
    .select({ studentId: vpPlacements.studentId, status: vpPlacements.status })
    .from(vpPlacements)
    .where(scoped(vpPlacements, tenantId, eq(vpPlacements.programId, input.programId)));

  const active = seats.filter((seat) => seat.status === "Applied" || seat.status === "Placed");
  if (active.some((seat) => seat.studentId === input.studentId)) throw new ViceError("ALREADY_PLACED");
  if (active.length >= program.capacity) throw new ViceError("PROGRAM_FULL");

  const result = await db.insert(vpPlacements).values(
    withTenant(
      {
        programId: input.programId,
        studentId: input.studentId,
        status: "Applied",
        note: input.note,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  const id = insertId(result);
  if (vocationalBand(pupil.grade) === "choose" && pupil.skillId == null) {
    const skill = (await db
      .select({ id: subjects.subjectId, name: subjects.subjectName })
      .from(subjects)
      .where(scoped(subjects, tenantId, and(eq(subjects.gradeLevel, pupil.grade), eq(subjects.isVocational, 1)))))
      .find((row) => tradeMatches(program.trade, row.name));
    if (skill) {
      await db
        .update(students)
        .set({ vocationalId: skill.id })
        .where(scoped(students, tenantId, eq(students.studentId, pupil.id)));
    }
  }
  await writeAudit(tenantId, userId, "vp_placement", `Placed student ${input.studentId} on program ${input.programId}`);
  return { id };
}

export async function setPlacementStatus(
  tenantId: number,
  userId: number,
  placementId: number,
  status: "Applied" | "Placed" | "Completed" | "Withdrawn",
) {
  const [row] = await db
    .select({ id: vpPlacements.placementId, programId: vpPlacements.programId, current: vpPlacements.status })
    .from(vpPlacements)
    .where(scoped(vpPlacements, tenantId, eq(vpPlacements.placementId, placementId)))
    .limit(1);
  if (!row) throw new ViceError("NOT_FOUND");
  if ((status === "Applied" || status === "Placed") && row.current !== "Applied" && row.current !== "Placed") {
    const [program] = await db
      .select({ capacity: vpPrograms.capacity, status: vpPrograms.status })
      .from(vpPrograms)
      .where(scoped(vpPrograms, tenantId, eq(vpPrograms.programId, row.programId)))
      .limit(1);
    if (!program || program.status !== "Open") throw new ViceError("PROGRAM_CLOSED");
    const seats = await db
      .select({ id: vpPlacements.placementId })
      .from(vpPlacements)
      .where(
        scoped(
          vpPlacements,
          tenantId,
          and(eq(vpPlacements.programId, row.programId), inArray(vpPlacements.status, [...ACTIVE_PLACEMENT])),
        ),
      );
    if (seats.length >= program.capacity) throw new ViceError("PROGRAM_FULL");
  }
  await db
    .update(vpPlacements)
    .set({ status })
    .where(scoped(vpPlacements, tenantId, eq(vpPlacements.placementId, placementId)));
  await writeAudit(tenantId, userId, "vp_placement", `Placement ${placementId} is ${status}`);
}

export async function behaviorView(tenantId: number) {
  const [referrals, hearings, penalties, roster] = await Promise.all([
    db.select().from(vpReferrals).where(scoped(vpReferrals, tenantId)).orderBy(desc(vpReferrals.referralId)),
    db.select().from(vpHearings).where(scoped(vpHearings, tenantId)).orderBy(desc(vpHearings.hearingId)),
    db.select().from(vpPenalties).where(scoped(vpPenalties, tenantId)).orderBy(desc(vpPenalties.penaltyId)),
    db
      .select({
        id: students.studentId,
        name: students.fullName,
        gradeLevel: students.gradeLevel,
        section: students.section,
      })
      .from(students)
      .where(scoped(students, tenantId))
      .orderBy(students.fullName),
  ]);
  const names = new Map(roster.map((row) => [row.id, row]));
  return {
    students: roster,
    openCount: referrals.filter((row) => row.status !== "Closed").length,
    referrals: referrals.map((row) => {
      const student = names.get(row.studentId);
      return {
        id: row.referralId,
        studentId: row.studentId,
        studentName: student?.name ?? "",
        gradeLevel: student?.gradeLevel ?? null,
        section: student?.section ?? null,
        category: row.category,
        severity: row.severity,
        summary: row.summary,
        status: row.status,
        hearings: hearings
          .filter((hearing) => hearing.referralId === row.referralId)
          .map((hearing) => ({
            id: hearing.hearingId,
            heldOn: hearing.heldOn,
            committee: hearing.committee,
            outcome: hearing.outcome,
            minutes: hearing.minutes,
          })),
        penalties: penalties
          .filter((penalty) => penalty.referralId === row.referralId)
          .map((penalty) => ({
            id: penalty.penaltyId,
            kind: penalty.kind,
            days: penalty.days,
            startsOn: penalty.startsOn,
            note: penalty.note,
          })),
      };
    }),
  };
}

export async function createReferral(tenantId: number, userId: number, input: ReferralInput) {
  if (!(await studentExists(tenantId, input.studentId))) throw new ViceError("NOT_FOUND");
  const result = await db.insert(vpReferrals).values(
    withTenant(
      {
        studentId: input.studentId,
        category: input.category,
        severity: input.severity,
        summary: input.summary,
        status: "Escalated",
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  const id = insertId(result);
  await writeAudit(tenantId, userId, "vp_referral", `Escalated referral ${id}`);
  return { id };
}

async function referralOf(tenantId: number, referralId: number) {
  const [row] = await db
    .select()
    .from(vpReferrals)
    .where(scoped(vpReferrals, tenantId, eq(vpReferrals.referralId, referralId)))
    .limit(1);
  return row ?? null;
}

export async function scheduleHearing(tenantId: number, userId: number, referralId: number, input: HearingInput) {
  const referral = await referralOf(tenantId, referralId);
  if (!referral) throw new ViceError("NOT_FOUND");
  if (referral.status === "Closed" || referral.status === "Decided") throw new ViceError("NOT_READY");
  const result = await db.insert(vpHearings).values(
    withTenant(
      {
        referralId,
        heldOn: input.heldOn,
        committee: input.committee,
        outcome: "Pending",
        minutes: input.minutes,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  await db
    .update(vpReferrals)
    .set({ status: "Hearing" })
    .where(scoped(vpReferrals, tenantId, eq(vpReferrals.referralId, referralId)));
  const id = insertId(result);
  await writeAudit(tenantId, userId, "vp_hearing", `Scheduled hearing ${id}`);
  return { id };
}

export async function setHearingOutcome(tenantId: number, userId: number, hearingId: number, input: HearingOutcomeInput) {
  const [row] = await db
    .select({ id: vpHearings.hearingId })
    .from(vpHearings)
    .where(scoped(vpHearings, tenantId, eq(vpHearings.hearingId, hearingId)))
    .limit(1);
  if (!row) throw new ViceError("NOT_FOUND");
  await db
    .update(vpHearings)
    .set({ outcome: input.outcome, minutes: input.minutes })
    .where(scoped(vpHearings, tenantId, eq(vpHearings.hearingId, hearingId)));
  await writeAudit(tenantId, userId, "vp_hearing", `Hearing ${hearingId} is ${input.outcome}`);
}

export async function recordPenalty(tenantId: number, userId: number, referralId: number, input: PenaltyInput) {
  const referral = await referralOf(tenantId, referralId);
  if (!referral) throw new ViceError("NOT_FOUND");
  if (referral.status === "Closed") throw new ViceError("NOT_READY");
  const hearings = await db
    .select({ outcome: vpHearings.outcome })
    .from(vpHearings)
    .where(scoped(vpHearings, tenantId, eq(vpHearings.referralId, referralId)))
    .orderBy(desc(vpHearings.hearingId));
  if (hearings.length === 0) throw new ViceError("HEARING_REQUIRED");
  if (hearings[0]?.outcome === "Dismissed") throw new ViceError("NOT_READY");

  const result = await db.insert(vpPenalties).values(
    withTenant(
      {
        referralId,
        kind: input.kind,
        days: input.days,
        startsOn: input.startsOn,
        note: input.note,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  await db
    .update(vpReferrals)
    .set({ status: "Decided" })
    .where(scoped(vpReferrals, tenantId, eq(vpReferrals.referralId, referralId)));
  const id = insertId(result);
  await writeAudit(tenantId, userId, "vp_penalty", `Recorded penalty ${id}`);
  return { id };
}

export async function closeReferral(tenantId: number, userId: number, referralId: number) {
  const referral = await referralOf(tenantId, referralId);
  if (!referral) throw new ViceError("NOT_FOUND");
  if (referral.status === "Closed") throw new ViceError("NOT_READY");
  await db
    .update(vpReferrals)
    .set({ status: "Closed" })
    .where(scoped(vpReferrals, tenantId, eq(vpReferrals.referralId, referralId)));
  await writeAudit(tenantId, userId, "vp_referral", `Closed referral ${referralId}`);
}

async function teacherPool(tenantId: number) {
  return db
    .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .where(scoped(staff, tenantId, and(eq(staff.role, "Teacher"), eq(staff.isApproved, 1))))
    .orderBy(staff.firstName);
}

export async function invigilationView(tenantId: number) {
  const [sessions, duties, teachers] = await Promise.all([
    db.select().from(vpExamSessions).where(scoped(vpExamSessions, tenantId)).orderBy(vpExamSessions.examDate, vpExamSessions.startTime),
    db.select().from(vpInvigilators).where(scoped(vpInvigilators, tenantId)),
    teacherPool(tenantId),
  ]);
  const names = new Map(teachers.map((row) => [row.id, `${row.firstName} ${row.lastName}`]));
  return {
    teachers: teachers.map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}` })),
    sessions: sessions.map((row) => ({
      id: row.sessionId,
      title: row.title,
      room: row.room,
      examDate: row.examDate,
      startTime: clock(String(row.startTime)),
      endTime: clock(String(row.endTime)),
      gradeLevel: row.gradeLevel,
      section: row.section,
      needed: row.needed,
      duties: duties
        .filter((duty) => duty.sessionId === row.sessionId)
        .map((duty) => ({
          id: duty.assignmentId,
          staffId: duty.staffId,
          name: names.get(duty.staffId) ?? "",
          duty: duty.duty,
          source: duty.source,
        })),
    })),
  };
}

export async function createSession(tenantId: number, userId: number, input: SessionInput) {
  const result = await db.insert(vpExamSessions).values(
    withTenant(
      {
        title: input.title,
        room: input.room,
        examDate: input.examDate,
        startTime: clock(input.startTime),
        endTime: clock(input.endTime),
        gradeLevel: input.gradeLevel,
        section: input.section,
        needed: input.needed,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  const id = insertId(result);
  await writeAudit(tenantId, userId, "vp_session", `Opened exam session ${id}`);
  const plan = await assignInvigilators(tenantId, userId);
  return { id, ...plan };
}

type TimetableSlot = {
  day: string;
  start: string;
  end: string;
  grade: number;
  section: string;
  subject: string | null;
  period: number;
  staffId: number | null;
};

async function timetable(tenantId: number): Promise<TimetableSlot[]> {
  const [latest] = await db
    .select({ year: classSchedule.academicYear })
    .from(classSchedule)
    .where(scoped(classSchedule, tenantId))
    .orderBy(desc(classSchedule.academicYear))
    .limit(1);
  if (!latest) return [];
  const rows = await db
    .select({
      day: classSchedule.dayOfWeek,
      start: classSchedule.startTime,
      end: classSchedule.endTime,
      grade: classes.gradeLevel,
      section: classes.section,
      subject: subjects.subjectName,
      period: classSchedule.periodNumber,
      staffId: classSchedule.teacherStaffId,
    })
    .from(classSchedule)
    .innerJoin(classes, and(eq(classes.classId, classSchedule.classId), eq(classes.tenantId, tenantId)))
    .leftJoin(subjects, and(eq(subjects.subjectId, classSchedule.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(classSchedule, tenantId, eq(classSchedule.academicYear, latest.year)));
  return rows.map((row) => ({
    day: row.day,
    start: clock(String(row.start)),
    end: clock(String(row.end)),
    grade: row.grade,
    section: row.section,
    subject: row.subject,
    period: row.period,
    staffId: row.staffId,
  }));
}

function sittingTitle(slot: TimetableSlot): string {
  return slot.subject?.trim() || `Period ${slot.period}`;
}

export async function prepareExamDay(tenantId: number, userId: number, examDate: string) {
  const day = weekdayOf(examDate);
  const slots = (await timetable(tenantId)).filter((slot) => slot.day === day && slot.start < slot.end);
  const existing = await db
    .select({
      title: vpExamSessions.title,
      gradeLevel: vpExamSessions.gradeLevel,
      section: vpExamSessions.section,
      startTime: vpExamSessions.startTime,
    })
    .from(vpExamSessions)
    .where(scoped(vpExamSessions, tenantId, eq(vpExamSessions.examDate, examDate)));
  const seen = new Set(existing.map((row) => `${row.gradeLevel}|${row.section}|${clock(String(row.startTime))}|${row.title}`));
  let created = 0;
  for (const slot of slots) {
    const title = sittingTitle(slot);
    const key = `${slot.grade}|${slot.section}|${slot.start}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await db.insert(vpExamSessions).values(
      withTenant(
        {
          title,
          room: `${slot.grade}${slot.section}`,
          examDate,
          startTime: slot.start,
          endTime: slot.end,
          gradeLevel: slot.grade,
          section: slot.section,
          needed: 2,
          recordedBy: userId,
        },
        tenantId,
      ),
    );
    created += 1;
  }
  if (created > 0) await writeAudit(tenantId, userId, "vp_session", `Opened ${created} exam sittings for ${examDate}`);
  const plan = await assignInvigilators(tenantId, userId);
  const sittings = await db
    .select({ id: vpExamSessions.sessionId })
    .from(vpExamSessions)
    .where(scoped(vpExamSessions, tenantId, eq(vpExamSessions.examDate, examDate)));
  return { weekday: day, created, sittings: sittings.length, ...plan };
}

export async function assignInvigilators(tenantId: number, userId: number) {
  const [sessions, duties, teachers, lessons] = await Promise.all([
    db.select().from(vpExamSessions).where(scoped(vpExamSessions, tenantId)),
    db.select().from(vpInvigilators).where(scoped(vpInvigilators, tenantId)),
    teacherPool(tenantId),
    timetable(tenantId),
  ]);
  const blocked = sessions.flatMap((session) => {
    const day = weekdayOf(session.examDate);
    const start = clock(String(session.startTime));
    const match = lessons.find(
      (lesson) =>
        lesson.day === day &&
        lesson.start === start &&
        lesson.grade === session.gradeLevel &&
        lesson.section === session.section &&
        sittingTitle(lesson) === session.title &&
        lesson.staffId != null,
    );
    return match?.staffId ? [{ sessionId: session.sessionId, staffId: match.staffId }] : [];
  });
  const plan = planInvigilation(
    sessions.map((row) => ({
      id: row.sessionId,
      date: row.examDate,
      start: clock(String(row.startTime)),
      end: clock(String(row.endTime)),
      needed: row.needed,
    })),
    teachers.map((row) => row.id),
    duties.map((row) => ({ sessionId: row.sessionId, staffId: row.staffId, duty: row.duty })),
    blocked,
  );
  for (const row of plan.planned) {
    await db.insert(vpInvigilators).values(
      withTenant(
        {
          sessionId: row.sessionId,
          staffId: row.staffId,
          duty: row.duty,
          source: "auto",
          recordedBy: userId,
        },
        tenantId,
      ),
    );
  }
  if (plan.planned.length > 0) {
    await writeAudit(tenantId, userId, "vp_invigilation", `Auto-assigned ${plan.planned.length} invigilators`);
  }
  return { assigned: plan.planned.length, gaps: plan.gaps };
}

export async function assignManual(tenantId: number, userId: number, sessionId: number, staffId: number) {
  const [session] = await db
    .select()
    .from(vpExamSessions)
    .where(scoped(vpExamSessions, tenantId, eq(vpExamSessions.sessionId, sessionId)))
    .limit(1);
  if (!session) throw new ViceError("NOT_FOUND");
  const teachers = await teacherPool(tenantId);
  if (!teachers.some((row) => row.id === staffId)) throw new ViceError("NOT_FOUND");

  const duties = await db.select().from(vpInvigilators).where(scoped(vpInvigilators, tenantId));
  const here = duties.filter((row) => row.sessionId === sessionId);
  if (here.length >= session.needed) throw new ViceError("SESSION_FULL");
  if (here.some((row) => row.staffId === staffId)) throw new ViceError("ALREADY_ASSIGNED");

  const mine = duties.filter((row) => row.staffId === staffId);
  if (mine.length > 0) {
    const others = await db
      .select()
      .from(vpExamSessions)
      .where(
        scoped(
          vpExamSessions,
          tenantId,
          inArray(
            vpExamSessions.sessionId,
            mine.map((row) => row.sessionId),
          ),
        ),
      );
    const current = {
      date: session.examDate,
      start: clock(String(session.startTime)),
      end: clock(String(session.endTime)),
    };
    const clash = others.some((row) =>
      clocksOverlap(current, {
        date: row.examDate,
        start: clock(String(row.startTime)),
        end: clock(String(row.endTime)),
      }),
    );
    if (clash) throw new ViceError("OVERLAP");
  }

  const result = await db.insert(vpInvigilators).values(
    withTenant(
      {
        sessionId,
        staffId,
        duty: here.some((row) => row.duty === "lead") ? "assistant" : "lead",
        source: "manual",
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  const id = insertId(result);
  await writeAudit(tenantId, userId, "vp_invigilation", `Assigned staff ${staffId} to session ${sessionId}`);
  return { id };
}

export async function removeDuty(tenantId: number, userId: number, assignmentId: number) {
  const [row] = await db
    .select({ id: vpInvigilators.assignmentId })
    .from(vpInvigilators)
    .where(scoped(vpInvigilators, tenantId, eq(vpInvigilators.assignmentId, assignmentId)))
    .limit(1);
  if (!row) throw new ViceError("NOT_FOUND");
  await db.delete(vpInvigilators).where(scoped(vpInvigilators, tenantId, eq(vpInvigilators.assignmentId, assignmentId)));
  await writeAudit(tenantId, userId, "vp_invigilation", `Removed assignment ${assignmentId}`);
}
