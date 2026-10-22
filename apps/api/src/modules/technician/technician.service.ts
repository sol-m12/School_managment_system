import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, like, or, type SQL } from "drizzle-orm";
import type { ResultSetHeader } from "mysql2";
import { db } from "../../db/index.js";
import { announcements, schoolSettings, staff, students, subjects, users } from "../../db/schema/index.js";
import { AudienceNotFoundError, isPersonAudience, listAudienceOptions, resolveAudiencePick } from "../../lib/audienceOptions.js";
import { hashPassword } from "../../lib/password.js";
import { ER_DUP_ENTRY, mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { readPhoto } from "../academics/photoStore.js";
import { STAFF_ROLES, type AnnouncementInput, type StaffInput, type TeacherInput } from "./technician.schema.js";

export type TechnicianErrorCode = "NOT_FOUND" | "USERNAME_TAKEN" | "ROLE_UNKNOWN" | "SUBJECT_NOT_FOUND";

export class TechnicianError extends Error {
  constructor(readonly code: TechnicianErrorCode) {
    super(code);
  }
}

const PASS_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function money(value: number): string {
  return value.toFixed(2);
}

function affected(result: unknown): number {
  const header = Array.isArray(result) ? (result[0] as ResultSetHeader | undefined) : (result as ResultSetHeader);
  return Number(header?.affectedRows ?? 0);
}

function blank(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

function usernameBase(firstName: string): string {
  const latin = firstName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return latin.slice(0, 20) || "user";
}

function randomPassword(): string {
  const bytes = randomBytes(8);
  let pass = "";
  for (let i = 0; i < 8; i += 1) pass += PASS_CHARS[bytes[i]! % PASS_CHARS.length];
  return pass;
}

function fourDigits(): string {
  return String(1000 + (randomBytes(2).readUInt16BE(0) % 9000));
}

type AccountTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertUser(
  tx: AccountTx,
  tenantId: number,
  firstName: string,
  role: (typeof STAFF_ROLES)[number],
  passwordHash: string,
): Promise<{ userId: number; username: string }> {
  const base = usernameBase(firstName);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const username = `${base}_${fourDigits()}`;
    try {
      const inserted = await tx.insert(users).values(
        withTenant(
          {
            username,
            passwordHash,
            role,
            passwordChanged: 0,
            isActive: 1,
            tokenVersion: 0,
          },
          tenantId,
        ),
      );
      return { userId: Number(inserted[0].insertId), username };
    } catch (error) {
      if (mysqlErrno(error) === ER_DUP_ENTRY) continue;
      throw error;
    }
  }
  throw new TechnicianError("USERNAME_TAKEN");
}

export async function listAnnouncements(tenantId: number) {
  const rows = await db
    .select({
      id: announcements.announcementId,
      title: announcements.title,
      content: announcements.content,
      targetRole: announcements.targetRole,
      startDate: announcements.startDate,
      endDate: announcements.endDate,
      isUrgent: announcements.isUrgent,
      postedAt: announcements.postedAt,
    })
    .from(announcements)
    .where(scoped(announcements, tenantId))
    .orderBy(desc(announcements.announcementId));
  return rows.map((row) => ({ ...row, isUrgent: row.isUrgent === 1 }));
}

export async function announcementAudienceOptions(tenantId: number) {
  return listAudienceOptions(tenantId);
}

async function resolveAnnouncementAudience(tenantId: number, input: AnnouncementInput) {
  try {
    return await resolveAudiencePick(tenantId, { audienceKey: input.audienceKey, personId: input.personId });
  } catch (error) {
    if (error instanceof AudienceNotFoundError) throw new TechnicianError("NOT_FOUND");
    throw error;
  }
}

export async function createAnnouncement(tenantId: number, userId: number, input: AnnouncementInput) {
  const resolved = await resolveAnnouncementAudience(tenantId, input);
  const content = isPersonAudience(input.audienceKey) ? `[${resolved.audienceLabel}]\n${input.content}` : input.content;
  const inserted = await db.insert(announcements).values(
    withTenant(
      {
        title: input.title,
        content,
        targetRole: resolved.targetRole,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        isUrgent: input.isUrgent ? 1 : 0,
        postedBy: userId,
      },
      tenantId,
    ),
  );
  return getAnnouncement(tenantId, Number(inserted[0].insertId));
}

export async function getAnnouncement(tenantId: number, id: number) {
  const [row] = await db
    .select({
      id: announcements.announcementId,
      title: announcements.title,
      content: announcements.content,
      targetRole: announcements.targetRole,
      startDate: announcements.startDate,
      endDate: announcements.endDate,
      isUrgent: announcements.isUrgent,
      postedAt: announcements.postedAt,
    })
    .from(announcements)
    .where(scoped(announcements, tenantId, eq(announcements.announcementId, id)))
    .limit(1);
  if (!row) throw new TechnicianError("NOT_FOUND");
  return { ...row, isUrgent: row.isUrgent === 1 };
}

export async function updateAnnouncement(tenantId: number, id: number, input: AnnouncementInput) {
  const resolved = await resolveAnnouncementAudience(tenantId, input);
  const content = isPersonAudience(input.audienceKey) ? `[${resolved.audienceLabel}]\n${input.content}` : input.content;
  const result = await db
    .update(announcements)
    .set({
      title: input.title,
      content,
      targetRole: resolved.targetRole,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      isUrgent: input.isUrgent ? 1 : 0,
    })
    .where(scoped(announcements, tenantId, eq(announcements.announcementId, id)));
  if (affected(result) === 0) throw new TechnicianError("NOT_FOUND");
  return getAnnouncement(tenantId, id);
}

export async function deleteAnnouncement(tenantId: number, id: number): Promise<void> {
  const result = await db
    .delete(announcements)
    .where(scoped(announcements, tenantId, eq(announcements.announcementId, id)));
  if (affected(result) === 0) throw new TechnicianError("NOT_FOUND");
}

export async function registrationOptions(tenantId: number) {
  const rows = await db
    .select({ id: subjects.subjectId, name: subjects.subjectName })
    .from(subjects)
    .where(scoped(subjects, tenantId))
    .orderBy(asc(subjects.subjectName), asc(subjects.subjectId));
  const seen = new Set<string>();
  const subjectRows = rows.flatMap((row) => {
    const name = row.name.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return [];
    seen.add(key);
    return [{ id: row.id, name }];
  });
  return { roles: [...STAFF_ROLES], subjects: subjectRows };
}

async function subjectSpecialization(tenantId: number, subjectId: number | null | undefined) {
  if (!subjectId) return "Regular" as const;
  const [row] = await db
    .select({ vocational: subjects.isVocational })
    .from(subjects)
    .where(scoped(subjects, tenantId, eq(subjects.subjectId, subjectId)))
    .limit(1);
  if (!row) throw new TechnicianError("SUBJECT_NOT_FOUND");
  return row.vocational === 1 ? ("Vocational" as const) : ("Regular" as const);
}

export async function listTeachers(tenantId: number) {
  const rows = await db
    .select({
      id: staff.staffId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      username: users.username,
      isApproved: staff.isApproved,
      passwordChanged: users.passwordChanged,
      salary: staff.salary,
      experienceYears: staff.experienceYears,
      phoneNumber: staff.phoneNumber,
    })
    .from(staff)
    .leftJoin(users, and(eq(users.userId, staff.userId), eq(users.tenantId, tenantId)))
    .where(scoped(staff, tenantId, eq(staff.role, "Teacher")))
    .orderBy(asc(staff.staffId));
  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    username: row.username,
    approved: row.isApproved === 1,
    passwordChanged: row.passwordChanged === 1,
    salary: row.salary,
    experienceYears: row.experienceYears,
    phoneNumber: row.phoneNumber,
  }));
}

export async function createTeacher(tenantId: number, input: TeacherInput) {
  const specialization = await subjectSpecialization(tenantId, input.subjectId);
  const temporaryPassword = randomPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const created = await db.transaction(async (tx) => {
    const account = await insertUser(tx, tenantId, input.firstName, "Teacher", passwordHash);
    const inserted = await tx.insert(staff).values(
      withTenant(
        {
          firstName: input.firstName,
          lastName: input.lastName,
          gender: input.gender,
          role: "Teacher" as const,
          specialization,
          jobTitle: input.jobTitle,
          phoneNumber: blank(input.phoneNumber),
          hireDate: input.hireDate ?? today(),
          salary: money(input.salary),
          experienceYears: money(input.experienceYears),
          userId: account.userId,
          subjectId: input.subjectId ?? null,
          isApproved: 1,
        },
        tenantId,
      ),
    );
    return { id: Number(inserted[0].insertId), username: account.username };
  });
  return { ...created, temporaryPassword };
}

export async function listStaff(tenantId: number) {
  const rows = await db
    .select({
      id: staff.staffId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      jobTitle: staff.jobTitle,
      username: users.username,
      isActive: users.isActive,
    })
    .from(staff)
    .leftJoin(users, and(eq(users.userId, staff.userId), eq(users.tenantId, tenantId)))
    .where(scoped(staff, tenantId))
    .orderBy(asc(staff.staffId));
  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    role: row.role,
    jobTitle: row.jobTitle,
    username: row.username,
    active: row.isActive === 1,
  }));
}

export async function createStaff(tenantId: number, input: StaffInput) {
  const passwordHash = await hashPassword(input.password);
  const jobTitle = input.jobTitle.trim() || input.role;
  return db.transaction(async (tx) => {
    const account = await insertUser(tx, tenantId, input.firstName, input.role, passwordHash);
    const inserted = await tx.insert(staff).values(
      withTenant(
        {
          firstName: input.firstName,
          lastName: input.lastName,
          gender: input.gender ?? null,
          role: input.role,
          specialization: "N/A" as const,
          jobTitle,
          phoneNumber: blank(input.phoneNumber),
          hireDate: input.hireDate ?? null,
          salary: input.salary == null ? null : money(input.salary),
          userId: account.userId,
          isApproved: 1,
        },
        tenantId,
      ),
    );
    return { id: Number(inserted[0].insertId), username: account.username };
  });
}

export async function listStudentIds(
  tenantId: number,
  query: { search: string; grade?: number; section: string },
) {
  const filters: SQL[] = [];
  if (query.grade !== undefined && Number.isInteger(query.grade)) {
    filters.push(eq(students.gradeLevel, query.grade));
  }
  if (query.section) filters.push(eq(students.section, query.section));
  if (query.search) {
    const nameMatch = like(students.fullName, `%${query.search}%`);
    const asId = Number(query.search);
    const idMatch =
      Number.isInteger(asId) && asId > 0 && String(asId) === query.search
        ? eq(students.studentId, asId)
        : undefined;
    const combined = idMatch ? or(nameMatch, idMatch) : nameMatch;
    if (combined) filters.push(combined);
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
    })
    .from(students)
    .leftJoin(users, and(eq(users.userId, students.userId), eq(users.tenantId, tenantId)))
    .where(scoped(students, tenantId, extra))
    .orderBy(asc(students.fullName));

  return {
    schoolName: school?.schoolName ?? "",
    rows: rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      username: row.username,
      gradeLevel: row.gradeLevel,
      section: row.section,
      hasPhoto: Boolean(row.photo && row.photo !== "default_profile.png"),
    })),
  };
}

export async function studentIdPhoto(tenantId: number, studentId: number) {
  const [row] = await db
    .select({ photo: students.photo })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!row?.photo || row.photo === "default_profile.png") throw new TechnicianError("NOT_FOUND");
  try {
    return await readPhoto(row.photo);
  } catch {
    throw new TechnicianError("NOT_FOUND");
  }
}
