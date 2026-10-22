import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../../db/index.js";
import {
  announcements,
  schoolSettings,
  secAppointments,
  secCleanupRuns,
  secDocuments,
  secNotices,
  secOcrScans,
  secRenewals,
  secTickets,
  students,
  systemSettings,
  users,
} from "../../db/schema/index.js";
import { AudienceNotFoundError, isPersonAudience, listAudienceOptions, resolveAudiencePick } from "../../lib/audienceOptions.js";
import { hashPassword } from "../../lib/password.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { AcademicsError, createStudent } from "../academics/students.service.js";
import type {
  AppointmentInput,
  DocumentInput,
  NoticeInput,
  OcrInput,
  RegisterInput,
  RenewInput,
  TicketInput,
} from "./secretary.schema.js";
import {
  blankSection,
  cleanName,
  parseFormText,
  parseReady,
  readStudentCode,
  renewBlock,
  studentCode,
  type ParsedForm,
} from "./secretaryRules.js";

export type SecretaryErrorCode =
  | "NOT_FOUND"
  | "NOT_PENDING"
  | "NOT_READY"
  | "SAME_YEAR"
  | "YEAR_BACK"
  | "CODE_TENANT"
  | "USERNAME_TAKEN"
  | "PARSE_INCOMPLETE";

export class SecretaryError extends Error {
  constructor(readonly code: SecretaryErrorCode) {
    super(code);
    this.name = "SecretaryError";
  }
}

const YEAR_KEY = "current_academic_year";

function schoolDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

async function academicYearOf(tenantId: number): Promise<string> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, YEAR_KEY)))
    .limit(1);
  return row?.value ?? String(new Date().getFullYear());
}

async function setStudentLogin(tenantId: number, studentId: number, userId: number): Promise<{ username: string; password: string }> {
  const username = String(studentId);
  const password = username;
  try {
    await db
      .update(users)
      .set({ username, passwordHash: await hashPassword(password), passwordChanged: 0 })
      .where(scoped(users, tenantId, eq(users.userId, userId)));
  } catch {
    throw new SecretaryError("USERNAME_TAKEN");
  }
  return { username, password };
}

export async function desk(tenantId: number) {
  const [pendingNotices] = await db
    .select({ total: sql<number>`count(*)` })
    .from(secNotices)
    .where(scoped(secNotices, tenantId, eq(secNotices.status, "Pending")));
  const [openTickets] = await db
    .select({ total: sql<number>`count(*)` })
    .from(secTickets)
    .where(
      scoped(
        secTickets,
        tenantId,
        sql`${secTickets.status} IN ('Open', 'Routed')`,
      ),
    );
  const [scheduled] = await db
    .select({ total: sql<number>`count(*)` })
    .from(secAppointments)
    .where(scoped(secAppointments, tenantId, eq(secAppointments.status, "Scheduled")));
  const [drafts] = await db
    .select({ total: sql<number>`count(*)` })
    .from(students)
    .where(scoped(students, tenantId, eq(students.submissionStatus, "Draft")));
  return {
    pendingNotices: Number(pendingNotices?.total ?? 0),
    openTickets: Number(openTickets?.total ?? 0),
    appointments: Number(scheduled?.total ?? 0),
    draftStudents: Number(drafts?.total ?? 0),
  };
}

export async function listStudents(tenantId: number, query: { search: string; grade: string; section: string }) {
  const filters = [];
  if (query.grade) {
    const grade = Number(query.grade);
    if (Number.isInteger(grade)) filters.push(eq(students.gradeLevel, grade));
  }
  if (query.section) filters.push(eq(students.section, query.section));
  if (query.search) {
    const asId = Number(query.search);
    const nameMatch = like(students.fullName, `%${query.search.replace(/[\\%_]/g, "")}%`);
    filters.push(
      Number.isInteger(asId) && asId > 0 && String(asId) === query.search
        ? or(nameMatch, eq(students.studentId, asId))!
        : nameMatch,
    );
  }
  const extra = filters.length > 0 ? and(...filters) : undefined;
  const rows = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gender: students.gender,
      age: students.age,
      gradeLevel: students.gradeLevel,
      section: students.section,
      academicYear: students.academicYear,
      registrationType: students.registrationType,
      username: users.username,
      submissionStatus: students.submissionStatus,
    })
    .from(students)
    .leftJoin(users, and(eq(users.userId, students.userId), eq(users.tenantId, tenantId)))
    .where(scoped(students, tenantId, extra))
    .orderBy(asc(students.fullName))
    .limit(300);
  return { rows, year: await academicYearOf(tenantId) };
}

export async function registerStudent(tenantId: number, actorId: number, input: RegisterInput) {
  try {
    const created = await createStudent(tenantId, actorId, input);
    const [row] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, created.id)))
      .limit(1);
    if (!row?.userId) throw new SecretaryError("NOT_FOUND");
    const login = await setStudentLogin(tenantId, created.id, row.userId);
    return { ...created, username: login.username, password: login.password, code: studentCode(tenantId, created.id) };
  } catch (error) {
    if (error instanceof AcademicsError && error.code === "USERNAME_TAKEN") throw new SecretaryError("USERNAME_TAKEN");
    if (error instanceof SecretaryError) throw error;
    throw error;
  }
}

export async function cleanupStudents(tenantId: number, actorId: number) {
  const rows = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      section: students.section,
      kebele: students.kebele,
      gote: students.gote,
      houseNumber: students.houseNumber,
      previousSchool: students.previousSchool,
    })
    .from(students)
    .where(scoped(students, tenantId));
  let fixed = 0;
  for (const row of rows) {
    const fullName = cleanName(row.fullName);
    const section = blankSection(row.section);
    const kebele = blankSection(row.kebele);
    const gote = blankSection(row.gote);
    const houseNumber = blankSection(row.houseNumber);
    const previousSchool = blankSection(row.previousSchool);
    const changed =
      fullName !== row.fullName ||
      section !== row.section ||
      kebele !== row.kebele ||
      gote !== row.gote ||
      houseNumber !== row.houseNumber ||
      previousSchool !== row.previousSchool;
    if (!changed) continue;
    await db
      .update(students)
      .set({ fullName, section, kebele, gote, houseNumber, previousSchool })
      .where(scoped(students, tenantId, eq(students.studentId, row.id)));
    fixed += 1;
  }
  const inserted = await db.insert(secCleanupRuns).values(
    withTenant({ fixedCount: fixed, note: "Trim names and blank fields", recordedBy: actorId }, tenantId),
  );
  return { id: Number(inserted[0].insertId), fixedCount: fixed };
}

export async function listCleanup(tenantId: number) {
  const rows = await db
    .select({
      id: secCleanupRuns.runId,
      fixedCount: secCleanupRuns.fixedCount,
      note: secCleanupRuns.note,
      createdAt: secCleanupRuns.createdAt,
    })
    .from(secCleanupRuns)
    .where(scoped(secCleanupRuns, tenantId))
    .orderBy(desc(secCleanupRuns.runId))
    .limit(50);
  return { rows };
}

async function renewOne(tenantId: number, actorId: number, studentId: number, toYear: string) {
  const [row] = await db
    .select({ id: students.studentId, academicYear: students.academicYear })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!row) throw new SecretaryError("NOT_FOUND");
  const block = renewBlock(row.academicYear ?? "", toYear);
  if (block) throw new SecretaryError(block);
  await db
    .update(students)
    .set({ academicYear: toYear, registrationType: "ነባር" })
    .where(scoped(students, tenantId, eq(students.studentId, studentId)));
  await db.insert(secRenewals).values(
    withTenant(
      {
        studentId,
        fromYear: row.academicYear ?? "",
        toYear,
        recordedBy: actorId,
      },
      tenantId,
    ),
  );
  return { id: studentId, fromYear: row.academicYear ?? "", toYear };
}

export async function renewStudents(tenantId: number, actorId: number, input: RenewInput) {
  const toYear = input.toYear?.trim() || (await academicYearOf(tenantId));
  const ids = new Set<number>(input.studentIds ?? []);
  if (input.code) {
    const parsed = readStudentCode(input.code);
    if (!parsed) throw new SecretaryError("NOT_FOUND");
    if (parsed.tenantId > 0 && parsed.tenantId !== tenantId) throw new SecretaryError("CODE_TENANT");
    ids.add(parsed.studentId);
  }
  if (input.gradeLevel || input.section) {
    const filters = [];
    if (input.gradeLevel) filters.push(eq(students.gradeLevel, input.gradeLevel));
    if (input.section) filters.push(eq(students.section, input.section));
    const matches = await db
      .select({ id: students.studentId })
      .from(students)
      .where(scoped(students, tenantId, and(...filters)));
    for (const row of matches) ids.add(row.id);
  }
  if (ids.size === 0) throw new SecretaryError("NOT_FOUND");
  const renewed = [];
  for (const id of ids) {
    renewed.push(await renewOne(tenantId, actorId, id, toYear));
  }
  return { year: toYear, rows: renewed };
}

export async function listRenewals(tenantId: number) {
  const rows = await db
    .select({
      id: secRenewals.renewalId,
      studentId: secRenewals.studentId,
      student: students.fullName,
      fromYear: secRenewals.fromYear,
      toYear: secRenewals.toYear,
      createdAt: secRenewals.createdAt,
    })
    .from(secRenewals)
    .leftJoin(students, and(eq(students.studentId, secRenewals.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(secRenewals, tenantId))
    .orderBy(desc(secRenewals.renewalId))
    .limit(200);
  return { rows };
}

export async function listNotices(tenantId: number, pendingOnly = false) {
  const rows = await db
    .select({
      id: secNotices.noticeId,
      title: secNotices.title,
      content: secNotices.content,
      targetRole: secNotices.targetRole,
      status: secNotices.status,
      createdAt: secNotices.createdAt,
    })
    .from(secNotices)
    .where(scoped(secNotices, tenantId, pendingOnly ? eq(secNotices.status, "Pending") : undefined))
    .orderBy(desc(secNotices.noticeId))
    .limit(200);
  return { rows };
}

export async function audienceOptions(tenantId: number) {
  return listAudienceOptions(tenantId);
}

async function resolveAudience(tenantId: number, input: { audienceKey: NoticeInput["audienceKey"]; personId?: number }) {
  try {
    return await resolveAudiencePick(tenantId, { audienceKey: input.audienceKey, personId: input.personId });
  } catch (error) {
    if (error instanceof AudienceNotFoundError) throw new SecretaryError("NOT_FOUND");
    throw error;
  }
}

export async function createNotice(tenantId: number, actorId: number, input: NoticeInput) {
  const resolved = await resolveAudience(tenantId, input);
  const content = isPersonAudience(input.audienceKey) ? `[${resolved.audienceLabel}]\n${input.content}` : input.content;
  const inserted = await db.insert(secNotices).values(
    withTenant(
      {
        title: input.title,
        content,
        targetRole: resolved.targetRole,
        status: "Pending",
        recordedBy: actorId,
      },
      tenantId,
    ),
  );
  return { id: Number(inserted[0].insertId) };
}

export async function decideNotice(tenantId: number, actorId: number, noticeId: number, decision: "approve" | "reject") {
  const [row] = await db
    .select({
      id: secNotices.noticeId,
      title: secNotices.title,
      content: secNotices.content,
      targetRole: secNotices.targetRole,
      status: secNotices.status,
    })
    .from(secNotices)
    .where(scoped(secNotices, tenantId, eq(secNotices.noticeId, noticeId)))
    .limit(1);
  if (!row) throw new SecretaryError("NOT_FOUND");
  if (row.status !== "Pending") throw new SecretaryError("NOT_PENDING");
  if (decision === "reject") {
    await db
      .update(secNotices)
      .set({ status: "Rejected", authorizedBy: actorId })
      .where(scoped(secNotices, tenantId, eq(secNotices.noticeId, noticeId)));
    return { id: noticeId, status: "Rejected" as const };
  }
  const today = schoolDate();
  await db.insert(announcements).values(
    withTenant(
      {
        title: row.title,
        content: row.content,
        targetRole: row.targetRole,
        startDate: today,
        endDate: null,
        isUrgent: 0,
        postedBy: actorId,
      },
      tenantId,
    ),
  );
  await db
    .update(secNotices)
    .set({ status: "Approved", authorizedBy: actorId })
    .where(scoped(secNotices, tenantId, eq(secNotices.noticeId, noticeId)));
  return { id: noticeId, status: "Approved" as const };
}

export async function listDocuments(tenantId: number, pendingOnly = false) {
  const rows = await db
    .select({
      id: secDocuments.documentId,
      title: secDocuments.title,
      audience: secDocuments.audience,
      fileNote: secDocuments.fileNote,
      status: secDocuments.status,
      createdAt: secDocuments.createdAt,
    })
    .from(secDocuments)
    .where(scoped(secDocuments, tenantId, pendingOnly ? eq(secDocuments.status, "Pending") : undefined))
    .orderBy(desc(secDocuments.documentId))
    .limit(200);
  return { rows };
}

export async function pendingApprovals(tenantId: number) {
  const [notices, documents] = await Promise.all([listNotices(tenantId, true), listDocuments(tenantId, true)]);
  return { notices: notices.rows, documents: documents.rows };
}

export async function createDocument(tenantId: number, actorId: number, input: DocumentInput) {
  const resolved = await resolveAudience(tenantId, input);
  const inserted = await db.insert(secDocuments).values(
    withTenant(
      {
        title: input.title,
        audience: resolved.audienceLabel.slice(0, 120),
        fileNote: input.fileNote,
        status: "Pending",
        recordedBy: actorId,
      },
      tenantId,
    ),
  );
  return { id: Number(inserted[0].insertId) };
}

export async function decideDocument(tenantId: number, actorId: number, documentId: number, decision: "approve" | "reject") {
  const [row] = await db
    .select({ id: secDocuments.documentId, status: secDocuments.status })
    .from(secDocuments)
    .where(scoped(secDocuments, tenantId, eq(secDocuments.documentId, documentId)))
    .limit(1);
  if (!row) throw new SecretaryError("NOT_FOUND");
  if (row.status !== "Pending") throw new SecretaryError("NOT_PENDING");
  const status = decision === "approve" ? ("Issued" as const) : ("Rejected" as const);
  await db
    .update(secDocuments)
    .set({ status, authorizedBy: actorId })
    .where(scoped(secDocuments, tenantId, eq(secDocuments.documentId, documentId)));
  return { id: documentId, status };
}

export async function listAppointments(tenantId: number) {
  const rows = await db
    .select({
      id: secAppointments.appointmentId,
      visitorName: secAppointments.visitorName,
      purpose: secAppointments.purpose,
      withRole: secAppointments.withRole,
      startsOn: secAppointments.startsOn,
      startsAt: secAppointments.startsAt,
      status: secAppointments.status,
    })
    .from(secAppointments)
    .where(scoped(secAppointments, tenantId))
    .orderBy(asc(secAppointments.startsOn), asc(secAppointments.startsAt))
    .limit(200);
  return { rows };
}

export async function createAppointment(tenantId: number, actorId: number, input: AppointmentInput) {
  const inserted = await db.insert(secAppointments).values(
    withTenant(
      {
        visitorName: input.visitorName,
        purpose: input.purpose,
        withRole: input.withRole,
        startsOn: input.startsOn,
        startsAt: input.startsAt,
        status: "Scheduled",
        recordedBy: actorId,
      },
      tenantId,
    ),
  );
  return { id: Number(inserted[0].insertId) };
}

export async function updateAppointment(
  tenantId: number,
  appointmentId: number,
  status: "Scheduled" | "Done" | "Cancelled",
) {
  const [row] = await db
    .select({ id: secAppointments.appointmentId })
    .from(secAppointments)
    .where(scoped(secAppointments, tenantId, eq(secAppointments.appointmentId, appointmentId)))
    .limit(1);
  if (!row) throw new SecretaryError("NOT_FOUND");
  await db
    .update(secAppointments)
    .set({ status })
    .where(scoped(secAppointments, tenantId, eq(secAppointments.appointmentId, appointmentId)));
  return { id: appointmentId, status };
}

export async function listTickets(tenantId: number) {
  const rows = await db
    .select({
      id: secTickets.ticketId,
      subject: secTickets.subject,
      details: secTickets.details,
      routeTo: secTickets.routeTo,
      status: secTickets.status,
      createdAt: secTickets.createdAt,
    })
    .from(secTickets)
    .where(scoped(secTickets, tenantId))
    .orderBy(desc(secTickets.ticketId))
    .limit(200);
  return { rows };
}

export async function createTicket(tenantId: number, actorId: number, input: TicketInput) {
  const inserted = await db.insert(secTickets).values(
    withTenant(
      {
        subject: input.subject,
        details: input.details,
        routeTo: input.routeTo,
        status: "Routed",
        recordedBy: actorId,
      },
      tenantId,
    ),
  );
  return { id: Number(inserted[0].insertId) };
}

export async function updateTicket(tenantId: number, ticketId: number, status: "Open" | "Routed" | "Closed") {
  const [row] = await db
    .select({ id: secTickets.ticketId })
    .from(secTickets)
    .where(scoped(secTickets, tenantId, eq(secTickets.ticketId, ticketId)))
    .limit(1);
  if (!row) throw new SecretaryError("NOT_FOUND");
  await db
    .update(secTickets)
    .set({ status })
    .where(scoped(secTickets, tenantId, eq(secTickets.ticketId, ticketId)));
  return { id: ticketId, status };
}

export async function listIdCards(tenantId: number, query: { search: string; grade: string; section: string }) {
  const filters = [];
  if (query.grade) {
    const grade = Number(query.grade);
    if (Number.isInteger(grade)) filters.push(eq(students.gradeLevel, grade));
  }
  if (query.section) filters.push(eq(students.section, query.section));
  if (query.search) {
    const asId = Number(query.search);
    const nameMatch = like(students.fullName, `%${query.search.replace(/[\\%_]/g, "")}%`);
    filters.push(
      Number.isInteger(asId) && asId > 0 && String(asId) === query.search
        ? or(nameMatch, eq(students.studentId, asId))!
        : nameMatch,
    );
  }
  const extra = filters.length > 0 ? and(...filters) : undefined;
  const [school] = await db
    .select({ schoolName: schoolSettings.schoolName })
    .from(schoolSettings)
    .where(scoped(schoolSettings, tenantId))
    .limit(1);
  const rows = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      username: users.username,
      gradeLevel: students.gradeLevel,
      section: students.section,
      photo: students.photo,
      academicYear: students.academicYear,
    })
    .from(students)
    .leftJoin(users, and(eq(users.userId, students.userId), eq(users.tenantId, tenantId)))
    .where(scoped(students, tenantId, extra))
    .orderBy(asc(students.fullName))
    .limit(200);
  const cards = await Promise.all(
    rows.map(async (row) => {
      const code = studentCode(tenantId, row.id);
      return {
        id: row.id,
        fullName: row.fullName,
        username: row.username,
        gradeLevel: row.gradeLevel,
        section: row.section,
        academicYear: row.academicYear,
        hasPhoto: Boolean(row.photo && row.photo !== "default_profile.png"),
        code,
        qrSvg: await QRCode.toString(code, { type: "svg", margin: 1, width: 120 }),
      };
    }),
  );
  return { schoolName: school?.schoolName ?? "", rows: cards };
}

export async function scanForm(tenantId: number, actorId: number, input: OcrInput) {
  const parsed = parseFormText(input.rawText);
  const inserted = await db.insert(secOcrScans).values(
    withTenant(
      {
        rawText: input.rawText,
        parsedJson: JSON.stringify(parsed),
        recordedBy: actorId,
      },
      tenantId,
    ),
  );
  return {
    id: Number(inserted[0].insertId),
    parsed,
    ready: parseReady(parsed),
  };
}

export async function registerFromScan(tenantId: number, actorId: number, scanId: number) {
  const [row] = await db
    .select({
      id: secOcrScans.scanId,
      parsedJson: secOcrScans.parsedJson,
      studentId: secOcrScans.studentId,
    })
    .from(secOcrScans)
    .where(scoped(secOcrScans, tenantId, eq(secOcrScans.scanId, scanId)))
    .limit(1);
  if (!row) throw new SecretaryError("NOT_FOUND");
  if (row.studentId) throw new SecretaryError("NOT_READY");
  let parsed: ParsedForm;
  try {
    parsed = JSON.parse(row.parsedJson) as ParsedForm;
  } catch {
    throw new SecretaryError("PARSE_INCOMPLETE");
  }
  if (!parseReady(parsed) || !parsed.gender || !parsed.age || !parsed.gradeLevel || !parsed.registrationType) {
    throw new SecretaryError("PARSE_INCOMPLETE");
  }
  const created = await registerStudent(tenantId, actorId, {
    fullName: parsed.fullName,
    gender: parsed.gender,
    age: parsed.age,
    gradeLevel: parsed.gradeLevel,
    stream: null,
    registrationType: parsed.registrationType,
    previousSchool: parsed.previousSchool || undefined,
    kebele: parsed.kebele || undefined,
    gote: parsed.gote || undefined,
    houseNumber: parsed.houseNumber || undefined,
  });
  await db
    .update(secOcrScans)
    .set({ studentId: created.id })
    .where(scoped(secOcrScans, tenantId, eq(secOcrScans.scanId, scanId)));
  return created;
}

export async function listScans(tenantId: number) {
  const rows = await db
    .select({
      id: secOcrScans.scanId,
      studentId: secOcrScans.studentId,
      createdAt: secOcrScans.createdAt,
      parsedJson: secOcrScans.parsedJson,
    })
    .from(secOcrScans)
    .where(scoped(secOcrScans, tenantId))
    .orderBy(desc(secOcrScans.scanId))
    .limit(50);
  return {
    rows: rows.map((row) => {
      let parsed: ParsedForm;
      try {
        parsed = JSON.parse(row.parsedJson) as ParsedForm;
      } catch {
        parsed = {
          fullName: "",
          gender: null,
          age: null,
          gradeLevel: null,
          registrationType: null,
          previousSchool: "",
          kebele: "",
          gote: "",
          houseNumber: "",
        };
      }
      return {
        id: row.id,
        studentId: row.studentId,
        createdAt: row.createdAt,
        parsed,
      };
    }),
  };
}
