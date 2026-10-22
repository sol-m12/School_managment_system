import { and, asc, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  clubActivityReports,
  clubElectionCandidates,
  clubElections,
  clubMeetings,
  clubVotes,
  committeeMembers,
  committeesClubs,
  staff,
  students,
} from "../../db/schema/index.js";
import { ER_DUP_ENTRY, mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { loadTeacherContext } from "../teacher/teacher.service.js";
import type {
  AnnounceBody,
  CharterBody,
  ClubBody,
  ClubUpdate,
  ElectionBody,
  MeetingBody,
  MemberDecide,
  ReportBody,
  VoteBody,
} from "./clubs.schema.js";

export type ClubErrorCode =
  | "NOT_FOUND"
  | "NOT_ASSIGNED"
  | "DUPLICATE_NAME"
  | "COUNCIL_EXISTS"
  | "STAFF_NOT_FOUND"
  | "STUDENT_NOT_FOUND"
  | "CHARTER_BLOCKED"
  | "ALREADY_MEMBER"
  | "NOT_PENDING"
  | "NOT_PATRON"
  | "NOT_COUNCIL"
  | "ELECTION_CLOSED"
  | "ALREADY_VOTED"
  | "BAD_CANDIDATE"
  | "NO_VOTES"
  | "VALIDATION";

export class ClubError extends Error {
  readonly code: ClubErrorCode;

  constructor(code: ClubErrorCode) {
    super(code);
    this.code = code;
  }
}

function insertId(result: unknown): number {
  const header = result as { insertId?: number } | Array<{ insertId?: number }>;
  if (Array.isArray(header)) return Number(header[0]?.insertId ?? 0);
  return Number(header.insertId ?? 0);
}

function personName(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last].filter(Boolean).join(" ").trim();
}

async function requireStaff(tenantId: number, staffId: number) {
  const [row] = await db
    .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName, role: staff.role })
    .from(staff)
    .where(scoped(staff, tenantId, and(eq(staff.staffId, staffId), eq(staff.role, "Teacher"))))
    .limit(1);
  if (!row) throw new ClubError("STAFF_NOT_FOUND");
  return row;
}

async function requireStudent(tenantId: number, studentId: number) {
  const [row] = await db
    .select({ id: students.studentId, fullName: students.fullName })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!row) throw new ClubError("STUDENT_NOT_FOUND");
  return row;
}

async function learnerStudentId(tenantId: number, userId: number): Promise<number> {
  const [row] = await db
    .select({ id: students.studentId })
    .from(students)
    .where(scoped(students, tenantId, eq(students.userId, userId)))
    .limit(1);
  if (!row) throw new ClubError("NOT_ASSIGNED");
  return row.id;
}

async function clubRow(tenantId: number, id: number) {
  const [row] = await db
    .select()
    .from(committeesClubs)
    .where(scoped(committeesClubs, tenantId, eq(committeesClubs.structureId, id)))
    .limit(1);
  if (!row) throw new ClubError("NOT_FOUND");
  return row;
}

async function assertNoOtherCouncil(tenantId: number, year: string, exceptId?: number) {
  const [existing] = await db
    .select({ id: committeesClubs.structureId })
    .from(committeesClubs)
    .where(
      scoped(
        committeesClubs,
        tenantId,
        and(
          eq(committeesClubs.isStudentCouncil, 1),
          eq(committeesClubs.year, year),
          eq(committeesClubs.type, "Club"),
          exceptId === undefined ? undefined : ne(committeesClubs.structureId, exceptId),
        ),
      ),
    )
    .limit(1);
  if (existing) throw new ClubError("COUNCIL_EXISTS");
}

async function syncLeadershipMembers(
  tenantId: number,
  structureId: number,
  patronStaffId: number,
  presidentStudentId: number,
) {
  // Clear prior Patron/President rows and any existing row for this staff/student
  // so unique (structure_id, student_id) / staff conflicts do not 500.
  await db
    .delete(committeeMembers)
    .where(
      scoped(
        committeeMembers,
        tenantId,
        and(
          eq(committeeMembers.structureId, structureId),
          or(
            sql`${committeeMembers.roleInStructure} IN ('Patron', 'President')`,
            eq(committeeMembers.staffId, patronStaffId),
            eq(committeeMembers.studentId, presidentStudentId),
          ),
        ),
      ),
    );

  await db.insert(committeeMembers).values(
    withTenant({
      structureId,
      staffId: patronStaffId,
      studentId: null,
      parentPgId: null,
      roleInStructure: "Patron",
      status: "Active" as const,
    }, tenantId),
  );
  await db.insert(committeeMembers).values(
    withTenant({
      structureId,
      staffId: null,
      studentId: presidentStudentId,
      parentPgId: null,
      roleInStructure: "President",
      status: "Active" as const,
    }, tenantId),
  );
}

/** HTML datetime-local sends "YYYY-MM-DDTHH:mm"; MySQL prefers "YYYY-MM-DD HH:mm:ss". */
function normalizeMeetsOn(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
    return withSeconds.replace("T", " ");
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

async function enrichClub(tenantId: number, row: typeof committeesClubs.$inferSelect) {
  let patronName = "";
  let presidentName = "";
  if (row.patronStaffId) {
    const [p] = await db
      .select({ firstName: staff.firstName, lastName: staff.lastName })
      .from(staff)
      .where(scoped(staff, tenantId, eq(staff.staffId, row.patronStaffId)))
      .limit(1);
    patronName = personName(p?.firstName, p?.lastName);
  }
  if (row.presidentStudentId) {
    const [s] = await db
      .select({ fullName: students.fullName })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, row.presidentStudentId)))
      .limit(1);
    presidentName = s?.fullName ?? "";
  }
  return {
    id: row.structureId,
    name: row.name,
    description: row.description ?? "",
    year: row.year ?? "",
    isActive: row.isActive === 1,
    charterStatus: row.charterStatus,
    isStudentCouncil: row.isStudentCouncil === 1,
    patronStaffId: row.patronStaffId,
    presidentStudentId: row.presidentStudentId,
    patronName,
    presidentName,
  };
}

export async function optionsBoard(tenantId: number) {
  const teachers = await db
    .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.role, "Teacher")))
    .orderBy(asc(staff.firstName), asc(staff.lastName));
  const studentRows = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
    })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(asc(students.fullName))
    .limit(500);
  return {
    teachers: teachers.map((t) => ({
      id: t.id,
      name: personName(t.firstName, t.lastName),
    })),
    students: studentRows.map((s) => ({
      id: s.id,
      name: s.fullName,
      label: `${s.fullName} · Grade ${s.gradeLevel}${s.section ?? ""}`,
    })),
  };
}

export async function listClubs(tenantId: number) {
  const rows = await db
    .select()
    .from(committeesClubs)
    .where(scoped(committeesClubs, tenantId, eq(committeesClubs.type, "Club")))
    .orderBy(asc(committeesClubs.name));
  const enriched = [];
  for (const row of rows) enriched.push(await enrichClub(tenantId, row));
  return { rows: enriched };
}

export async function getClub(tenantId: number, id: number) {
  return enrichClub(tenantId, await clubRow(tenantId, id));
}

export async function createClub(tenantId: number, userId: number, input: ClubBody) {
  await requireStaff(tenantId, input.patronStaffId);
  await requireStudent(tenantId, input.presidentStudentId);
  if (input.isStudentCouncil) await assertNoOtherCouncil(tenantId, input.year);

  let id = 0;
  try {
    id = insertId(
      await db.insert(committeesClubs).values(
        withTenant({
          name: input.name,
          type: "Club" as const,
          description: input.description || null,
          year: input.year,
          isActive: input.isActive ? 1 : 0,
          createdBy: userId,
          patronStaffId: input.patronStaffId,
          presidentStudentId: input.presidentStudentId,
          charterStatus: "Draft" as const,
          isStudentCouncil: input.isStudentCouncil ? 1 : 0,
        }, tenantId),      ),
    );
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ClubError("DUPLICATE_NAME");
    throw error;
  }
  if (!id) throw new ClubError("VALIDATION");
  await syncLeadershipMembers(tenantId, id, input.patronStaffId, input.presidentStudentId);
  return getClub(tenantId, id);
}

export async function updateClub(tenantId: number, id: number, input: ClubUpdate) {
  const existing = await clubRow(tenantId, id);
  if (existing.type !== "Club") throw new ClubError("NOT_FOUND");

  const patronStaffId = input.patronStaffId ?? existing.patronStaffId;
  const presidentStudentId = input.presidentStudentId ?? existing.presidentStudentId;
  if (!patronStaffId || !presidentStudentId) throw new ClubError("VALIDATION");

  await requireStaff(tenantId, patronStaffId);
  await requireStudent(tenantId, presidentStudentId);

  const year = input.year ?? existing.year ?? "";
  const isCouncil = input.isStudentCouncil ?? existing.isStudentCouncil === 1;
  if (isCouncil) await assertNoOtherCouncil(tenantId, year, id);

  try {
    await db
      .update(committeesClubs)
      .set({
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description || null : existing.description,
        year: input.year ?? existing.year,
        isActive: input.isActive === undefined ? existing.isActive : input.isActive ? 1 : 0,
        patronStaffId,
        presidentStudentId,
        isStudentCouncil: isCouncil ? 1 : 0,
      })
      .where(scoped(committeesClubs, tenantId, eq(committeesClubs.structureId, id)));
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ClubError("DUPLICATE_NAME");
    throw error;
  }

  await syncLeadershipMembers(tenantId, id, patronStaffId, presidentStudentId);
  return getClub(tenantId, id);
}

export async function submitCharter(tenantId: number, id: number) {
  const existing = await clubRow(tenantId, id);
  if (existing.charterStatus !== "Draft" && existing.charterStatus !== "Suspended") {
    throw new ClubError("CHARTER_BLOCKED");
  }
  await db
    .update(committeesClubs)
    .set({ charterStatus: "Pending" })
    .where(scoped(committeesClubs, tenantId, eq(committeesClubs.structureId, id)));
  return getClub(tenantId, id);
}

export async function setCharter(tenantId: number, id: number, input: CharterBody) {
  await clubRow(tenantId, id);
  const status =
    input.action === "Approve"
      ? ("Approved" as const)
      : input.action === "Suspend"
        ? ("Suspended" as const)
        : input.action === "Pending"
          ? ("Pending" as const)
          : ("Draft" as const);
  await db
    .update(committeesClubs)
    .set({ charterStatus: status })
    .where(scoped(committeesClubs, tenantId, eq(committeesClubs.structureId, id)));
  return getClub(tenantId, id);
}

export async function catalog(tenantId: number, q: string) {
  const rows = await db
    .select()
    .from(committeesClubs)
    .where(
      scoped(
        committeesClubs,
        tenantId,
        and(
          eq(committeesClubs.type, "Club"),
          eq(committeesClubs.charterStatus, "Approved"),
          eq(committeesClubs.isActive, 1),
          q ? like(committeesClubs.name, `%${q}%`) : undefined,
        ),
      ),
    )
    .orderBy(asc(committeesClubs.name));
  const enriched = [];
  for (const row of rows) enriched.push(await enrichClub(tenantId, row));
  return { rows: enriched };
}

export async function joinClub(tenantId: number, userId: number, clubId: number) {
  const studentId = await learnerStudentId(tenantId, userId);
  const club = await clubRow(tenantId, clubId);
  if (club.charterStatus !== "Approved" || club.isActive !== 1) throw new ClubError("CHARTER_BLOCKED");

  const [existing] = await db
    .select({ id: committeeMembers.memberId, status: committeeMembers.status })
    .from(committeeMembers)
    .where(
      scoped(
        committeeMembers,
        tenantId,
        and(eq(committeeMembers.structureId, clubId), eq(committeeMembers.studentId, studentId)),
      ),
    )
    .limit(1);

  if (existing && (existing.status === "Pending" || existing.status === "Active")) {
    throw new ClubError("ALREADY_MEMBER");
  }

  if (existing) {
    await db
      .update(committeeMembers)
      .set({ status: "Pending", roleInStructure: "Member" })
      .where(scoped(committeeMembers, tenantId, eq(committeeMembers.memberId, existing.id)));
    return { ok: true as const, memberId: existing.id, status: "Pending" as const };
  }

  try {
    const memberId = insertId(
      await db.insert(committeeMembers).values(
        withTenant({
          structureId: clubId,
          staffId: null,
          studentId,
          parentPgId: null,
          roleInStructure: "Member",
          status: "Pending" as const,
        }, tenantId),      ),
    );
    return { ok: true as const, memberId, status: "Pending" as const };
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ClubError("ALREADY_MEMBER");
    throw error;
  }
}

export async function withdrawMembership(tenantId: number, userId: number, clubId: number) {
  const studentId = await learnerStudentId(tenantId, userId);
  const [existing] = await db
    .select({ id: committeeMembers.memberId, status: committeeMembers.status })
    .from(committeeMembers)
    .where(
      scoped(
        committeeMembers,
        tenantId,
        and(eq(committeeMembers.structureId, clubId), eq(committeeMembers.studentId, studentId)),
      ),
    )
    .limit(1);
  if (!existing) throw new ClubError("NOT_FOUND");
  if (existing.status !== "Pending") throw new ClubError("NOT_PENDING");
  await db
    .update(committeeMembers)
    .set({ status: "Withdrawn" })
    .where(scoped(committeeMembers, tenantId, eq(committeeMembers.memberId, existing.id)));
  return { ok: true as const };
}

export async function myClubs(tenantId: number, userId: number) {
  const studentId = await learnerStudentId(tenantId, userId);
  const memberships = await db
    .select({
      memberId: committeeMembers.memberId,
      structureId: committeeMembers.structureId,
      role: committeeMembers.roleInStructure,
      status: committeeMembers.status,
      name: committeesClubs.name,
      year: committeesClubs.year,
      charterStatus: committeesClubs.charterStatus,
    })
    .from(committeeMembers)
    .innerJoin(
      committeesClubs,
      and(
        eq(committeesClubs.structureId, committeeMembers.structureId),
        eq(committeesClubs.tenantId, tenantId),
      ),
    )
    .where(scoped(committeeMembers, tenantId, eq(committeeMembers.studentId, studentId)))
    .orderBy(asc(committeesClubs.name));

  const activeIds = memberships.filter((m) => m.status === "Active").map((m) => m.structureId);
  const meetings =
    activeIds.length === 0
      ? []
      : await db
          .select({
            id: clubMeetings.meetingId,
            structureId: clubMeetings.structureId,
            title: clubMeetings.title,
            meetsOn: clubMeetings.meetsOn,
            location: clubMeetings.location,
          })
          .from(clubMeetings)
          .where(
            scoped(
              clubMeetings,
              tenantId,
              sql`${clubMeetings.structureId} IN (${sql.join(
                activeIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          )
          .orderBy(asc(clubMeetings.meetsOn))
          .limit(20);

  return {
    memberships: memberships.map((m) => ({
      memberId: m.memberId,
      clubId: m.structureId,
      name: m.name,
      year: m.year ?? "",
      role: m.role ?? "Member",
      status: m.status,
      charterStatus: m.charterStatus,
    })),
    meetings: meetings.map((m) => ({
      id: m.id,
      clubId: m.structureId,
      title: m.title,
      meetsOn: m.meetsOn,
      location: m.location,
    })),
  };
}

async function requirePatron(tenantId: number, userId: number, clubId: number) {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) throw new ClubError("NOT_ASSIGNED");
  const club = await clubRow(tenantId, clubId);
  if (club.patronStaffId !== context.staffId) throw new ClubError("NOT_PATRON");
  return { context, club };
}

export async function patronBoard(tenantId: number, userId: number) {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) throw new ClubError("NOT_ASSIGNED");
  const clubs = await db
    .select()
    .from(committeesClubs)
    .where(
      scoped(
        committeesClubs,
        tenantId,
        and(eq(committeesClubs.patronStaffId, context.staffId), eq(committeesClubs.type, "Club")),
      ),
    )
    .orderBy(asc(committeesClubs.name));

  const rows = [];
  for (const club of clubs) {
    const members = await db
      .select({
        memberId: committeeMembers.memberId,
        studentId: committeeMembers.studentId,
        role: committeeMembers.roleInStructure,
        status: committeeMembers.status,
        fullName: students.fullName,
      })
      .from(committeeMembers)
      .leftJoin(
        students,
        and(eq(students.studentId, committeeMembers.studentId), eq(students.tenantId, tenantId)),
      )
      .where(scoped(committeeMembers, tenantId, eq(committeeMembers.structureId, club.structureId)))
      .orderBy(asc(committeeMembers.status), asc(students.fullName));

    const meetings = await db
      .select({
        id: clubMeetings.meetingId,
        title: clubMeetings.title,
        meetsOn: clubMeetings.meetsOn,
        location: clubMeetings.location,
      })
      .from(clubMeetings)
      .where(scoped(clubMeetings, tenantId, eq(clubMeetings.structureId, club.structureId)))
      .orderBy(desc(clubMeetings.meetsOn))
      .limit(10);

    const reports = await db
      .select({
        id: clubActivityReports.reportId,
        title: clubActivityReports.title,
        reportDate: clubActivityReports.reportDate,
      })
      .from(clubActivityReports)
      .where(scoped(clubActivityReports, tenantId, eq(clubActivityReports.structureId, club.structureId)))
      .orderBy(desc(clubActivityReports.reportDate))
      .limit(10);

    rows.push({
      ...(await enrichClub(tenantId, club)),
      members: members.map((m) => ({
        memberId: m.memberId,
        studentId: m.studentId,
        name: m.fullName ?? "",
        role: m.role ?? "Member",
        status: m.status,
      })),
      meetings,
      reports,
    });
  }
  return { rows };
}

export async function decideMember(
  tenantId: number,
  userId: number,
  clubId: number,
  memberId: number,
  input: MemberDecide,
) {
  await requirePatron(tenantId, userId, clubId);
  const [member] = await db
    .select()
    .from(committeeMembers)
    .where(
      scoped(
        committeeMembers,
        tenantId,
        and(eq(committeeMembers.memberId, memberId), eq(committeeMembers.structureId, clubId)),
      ),
    )
    .limit(1);
  if (!member) throw new ClubError("NOT_FOUND");
  if (member.status !== "Pending") throw new ClubError("NOT_PENDING");
  await db
    .update(committeeMembers)
    .set({ status: input.action === "Approve" ? "Active" : "Rejected" })
    .where(scoped(committeeMembers, tenantId, eq(committeeMembers.memberId, memberId)));
  return { ok: true as const };
}

export async function addMeeting(tenantId: number, userId: number, clubId: number, input: MeetingBody) {
  const { context } = await requirePatron(tenantId, userId, clubId);
  const id = insertId(
    await db.insert(clubMeetings).values(
      withTenant({
        structureId: clubId,
        title: input.title,
        meetsOn: normalizeMeetsOn(input.meetsOn),
        location: input.location,
        notes: input.notes,
        createdByStaffId: context.staffId,
      }, tenantId),
    ),
  );
  return { id };
}

export async function addReport(tenantId: number, userId: number, clubId: number, input: ReportBody) {
  const { context } = await requirePatron(tenantId, userId, clubId);
  const id = insertId(
    await db.insert(clubActivityReports).values(
      withTenant({
        structureId: clubId,
        title: input.title,
        body: input.body,
        reportDate: input.reportDate,
        createdByStaffId: context.staffId,
      }, tenantId),    ),
  );
  return { id };
}

export async function overseeBoard(tenantId: number) {
  const clubs = await listClubs(tenantId);
  const elections = await db
    .select({
      id: clubElections.electionId,
      structureId: clubElections.structureId,
      title: clubElections.title,
      status: clubElections.status,
      opensOn: clubElections.opensOn,
      closesOn: clubElections.closesOn,
      winnerId: clubElections.announcedWinnerStudentId,
      clubName: committeesClubs.name,
    })
    .from(clubElections)
    .innerJoin(
      committeesClubs,
      and(eq(committeesClubs.structureId, clubElections.structureId), eq(committeesClubs.tenantId, tenantId)),
    )
    .where(scoped(clubElections, tenantId))
    .orderBy(desc(clubElections.electionId));

  const studentRows = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
    })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(asc(students.fullName))
    .limit(500);

  return {
    clubs: clubs.rows,
    elections: elections.map((e) => ({
      id: e.id,
      clubId: e.structureId,
      clubName: e.clubName,
      title: e.title,
      status: e.status,
      opensOn: e.opensOn,
      closesOn: e.closesOn,
      winnerStudentId: e.winnerId,
    })),
    students: studentRows.map((s) => ({
      id: s.id,
      name: s.fullName,
      label: `${s.fullName} · Grade ${s.gradeLevel}${s.section ?? ""}`,
    })),
  };
}

export async function openElection(tenantId: number, userId: number, input: ElectionBody) {
  const [council] = await db
    .select()
    .from(committeesClubs)
    .where(
      scoped(
        committeesClubs,
        tenantId,
        and(
          eq(committeesClubs.type, "Club"),
          eq(committeesClubs.isStudentCouncil, 1),
          eq(committeesClubs.charterStatus, "Approved"),
          eq(committeesClubs.isActive, 1),
        ),
      ),
    )
    .limit(1);
  if (!council) throw new ClubError("NOT_COUNCIL");

  for (const studentId of input.candidateStudentIds) {
    await requireStudent(tenantId, studentId);
  }

  const electionId = insertId(
    await db.insert(clubElections).values(
      withTenant({
        structureId: council.structureId,
        title: input.title,
        status: "Open" as const,
        opensOn: input.opensOn,
        closesOn: input.closesOn,
        announcedWinnerStudentId: null,
        createdBy: userId,
      }, tenantId),    ),
  );

  for (const studentId of input.candidateStudentIds) {
    await db.insert(clubElectionCandidates).values(
      withTenant({
        electionId,
        studentId,
      }, tenantId),    );
  }

  return { id: electionId };
}

export async function listElectionsForStudent(tenantId: number, userId: number) {
  const studentId = await learnerStudentId(tenantId, userId);
  const elections = await db
    .select({
      id: clubElections.electionId,
      title: clubElections.title,
      status: clubElections.status,
      opensOn: clubElections.opensOn,
      closesOn: clubElections.closesOn,
      winnerId: clubElections.announcedWinnerStudentId,
      clubName: committeesClubs.name,
    })
    .from(clubElections)
    .innerJoin(
      committeesClubs,
      and(eq(committeesClubs.structureId, clubElections.structureId), eq(committeesClubs.tenantId, tenantId)),
    )
    .where(scoped(clubElections, tenantId))
    .orderBy(desc(clubElections.electionId));

  const rows = [];
  for (const election of elections) {
    const candidates = await db
      .select({
        studentId: clubElectionCandidates.studentId,
        fullName: students.fullName,
      })
      .from(clubElectionCandidates)
      .innerJoin(
        students,
        and(eq(students.studentId, clubElectionCandidates.studentId), eq(students.tenantId, tenantId)),
      )
      .where(scoped(clubElectionCandidates, tenantId, eq(clubElectionCandidates.electionId, election.id)));

    const [myVote] = await db
      .select({ candidateStudentId: clubVotes.candidateStudentId })
      .from(clubVotes)
      .where(
        scoped(
          clubVotes,
          tenantId,
          and(eq(clubVotes.electionId, election.id), eq(clubVotes.voterStudentId, studentId)),
        ),
      )
      .limit(1);

    rows.push({
      id: election.id,
      title: election.title,
      status: election.status,
      opensOn: election.opensOn,
      closesOn: election.closesOn,
      clubName: election.clubName,
      winnerStudentId: election.winnerId,
      hasVoted: Boolean(myVote),
      myCandidateStudentId: myVote?.candidateStudentId ?? null,
      candidates: candidates.map((c) => ({ studentId: c.studentId, name: c.fullName })),
    });
  }
  return { rows };
}

export async function castVote(tenantId: number, userId: number, electionId: number, input: VoteBody) {
  const studentId = await learnerStudentId(tenantId, userId);
  const [election] = await db
    .select()
    .from(clubElections)
    .where(scoped(clubElections, tenantId, eq(clubElections.electionId, electionId)))
    .limit(1);
  if (!election) throw new ClubError("NOT_FOUND");
  if (election.status !== "Open") throw new ClubError("ELECTION_CLOSED");

  const [candidate] = await db
    .select({ id: clubElectionCandidates.candidateId })
    .from(clubElectionCandidates)
    .where(
      scoped(
        clubElectionCandidates,
        tenantId,
        and(
          eq(clubElectionCandidates.electionId, electionId),
          eq(clubElectionCandidates.studentId, input.candidateStudentId),
        ),
      ),
    )
    .limit(1);
  if (!candidate) throw new ClubError("BAD_CANDIDATE");

  try {
    await db.insert(clubVotes).values(
      withTenant({
        electionId,
        voterStudentId: studentId,
        candidateStudentId: input.candidateStudentId,
      }, tenantId),    );
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ClubError("ALREADY_VOTED");
    throw error;
  }
  return { ok: true as const };
}

export async function announceElection(tenantId: number, electionId: number, input: AnnounceBody) {
  const [election] = await db
    .select()
    .from(clubElections)
    .where(scoped(clubElections, tenantId, eq(clubElections.electionId, electionId)))
    .limit(1);
  if (!election) throw new ClubError("NOT_FOUND");
  if (election.status === "Announced") throw new ClubError("ELECTION_CLOSED");

  const tallies = await db
    .select({
      candidateStudentId: clubVotes.candidateStudentId,
      votes: sql<number>`count(*)`.mapWith(Number),
    })
    .from(clubVotes)
    .where(scoped(clubVotes, tenantId, eq(clubVotes.electionId, electionId)))
    .groupBy(clubVotes.candidateStudentId)
    .orderBy(desc(sql`count(*)`));

  if (tallies.length === 0) throw new ClubError("NO_VOTES");
  const winnerId = tallies[0]!.candidateStudentId;

  await db
    .update(clubElections)
    .set({ status: "Announced", announcedWinnerStudentId: winnerId })
    .where(scoped(clubElections, tenantId, eq(clubElections.electionId, electionId)));

  if (input.setAsPresident) {
    await db
      .update(committeesClubs)
      .set({ presidentStudentId: winnerId })
      .where(scoped(committeesClubs, tenantId, eq(committeesClubs.structureId, election.structureId)));

    const club = await clubRow(tenantId, election.structureId);
    if (club.patronStaffId) {
      await syncLeadershipMembers(tenantId, election.structureId, club.patronStaffId, winnerId);
    }
  }

  return {
    ok: true as const,
    winnerStudentId: winnerId,
    tallies: tallies.map((t) => ({ studentId: t.candidateStudentId, votes: t.votes })),
  };
}

/** Used by tenant isolation tests. */
export async function deleteClub(tenantId: number, id: number) {
  const existing = await clubRow(tenantId, id);
  await db
    .delete(committeeMembers)
    .where(scoped(committeeMembers, tenantId, eq(committeeMembers.structureId, id)));
  await db
    .delete(clubMeetings)
    .where(scoped(clubMeetings, tenantId, eq(clubMeetings.structureId, id)));
  await db
    .delete(clubActivityReports)
    .where(scoped(clubActivityReports, tenantId, eq(clubActivityReports.structureId, id)));
  await db
    .delete(committeesClubs)
    .where(scoped(committeesClubs, tenantId, eq(committeesClubs.structureId, existing.structureId)));
  return { ok: true as const };
}
