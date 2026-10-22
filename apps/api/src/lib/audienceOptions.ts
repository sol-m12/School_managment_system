import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { staff, students, systemSettings } from "../db/schema/index.js";
import { scoped } from "./tenant.js";

export const AUDIENCE_KEYS = [
  "All",
  "Students",
  "Teachers",
  "Staff",
  "Parents",
  "Admin_Only",
  "student",
  "teacher",
  "staff",
] as const;

export type AudienceKey = (typeof AUDIENCE_KEYS)[number];
export type AnnouncementRole = "All" | "Staff" | "Students" | "Parents" | "Admin_Only";

export const audienceKeySchema = z.enum(AUDIENCE_KEYS);

export const audiencePickSchema = z
  .object({
    audienceKey: audienceKeySchema,
    personId: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    const needsPerson = value.audienceKey === "student" || value.audienceKey === "teacher" || value.audienceKey === "staff";
    if (needsPerson && value.personId == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "personId", path: ["personId"] });
    }
    if (!needsPerson && value.personId != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "personId", path: ["personId"] });
    }
  });

export type AudiencePick = z.infer<typeof audiencePickSchema>;

function personName(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last].filter(Boolean).join(" ").trim();
}

async function currentYear(tenantId: number): Promise<string> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, "current_academic_year")))
    .limit(1);
  return row?.value ?? "";
}

export async function listAudienceOptions(tenantId: number) {
  const year = await currentYear(tenantId);
  const [studentRows, teacherRows, staffRows] = await Promise.all([
    db
      .select({
        id: students.studentId,
        name: students.fullName,
        gradeLevel: students.gradeLevel,
        section: students.section,
      })
      .from(students)
      .where(scoped(students, tenantId, year ? eq(students.academicYear, year) : undefined))
      .orderBy(asc(students.gradeLevel), asc(students.section), asc(students.fullName))
      .limit(2000),
    db
      .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName })
      .from(staff)
      .where(scoped(staff, tenantId, eq(staff.role, "Teacher")))
      .orderBy(asc(staff.firstName), asc(staff.lastName))
      .limit(500),
    db
      .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName, role: staff.role })
      .from(staff)
      .where(scoped(staff, tenantId))
      .orderBy(asc(staff.role), asc(staff.firstName), asc(staff.lastName))
      .limit(800),
  ]);
  return {
    groups: [
      { key: "All", labelKey: "audienceAll" },
      { key: "Students", labelKey: "audienceStudents" },
      { key: "Teachers", labelKey: "audienceTeachers" },
      { key: "Staff", labelKey: "audienceStaff" },
      { key: "Parents", labelKey: "audienceParents" },
      { key: "Admin_Only", labelKey: "audienceAdmin" },
    ],
    students: studentRows.map((row) => ({
      id: row.id,
      label: `${row.name} · ${row.gradeLevel}${row.section ? `-${row.section}` : ""}`,
    })),
    teachers: teacherRows.map((row) => ({ id: row.id, label: personName(row.firstName, row.lastName) || `ID ${row.id}` })),
    staff: staffRows.map((row) => ({
      id: row.id,
      label: `${personName(row.firstName, row.lastName) || `ID ${row.id}`} (${row.role})`,
    })),
  };
}

export class AudienceNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor() {
    super("NOT_FOUND");
    this.name = "AudienceNotFoundError";
  }
}

export function isPersonAudience(key: AudienceKey): boolean {
  return key === "student" || key === "teacher" || key === "staff";
}

export async function resolveAudiencePick(
  tenantId: number,
  input: AudiencePick,
): Promise<{ audienceLabel: string; targetRole: AnnouncementRole }> {
  if (input.audienceKey === "student") {
    const [row] = await db
      .select({ id: students.studentId, name: students.fullName, gradeLevel: students.gradeLevel, section: students.section })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, input.personId!)))
      .limit(1);
    if (!row) throw new AudienceNotFoundError();
    return {
      audienceLabel: `Student: ${row.name} (${row.gradeLevel}${row.section ? `-${row.section}` : ""})`,
      targetRole: "Students",
    };
  }
  if (input.audienceKey === "teacher") {
    const [row] = await db
      .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName })
      .from(staff)
      .where(scoped(staff, tenantId, and(eq(staff.staffId, input.personId!), eq(staff.role, "Teacher"))))
      .limit(1);
    if (!row) throw new AudienceNotFoundError();
    return { audienceLabel: `Teacher: ${personName(row.firstName, row.lastName)}`, targetRole: "Staff" };
  }
  if (input.audienceKey === "staff") {
    const [row] = await db
      .select({ id: staff.staffId, firstName: staff.firstName, lastName: staff.lastName, role: staff.role })
      .from(staff)
      .where(scoped(staff, tenantId, eq(staff.staffId, input.personId!)))
      .limit(1);
    if (!row) throw new AudienceNotFoundError();
    return { audienceLabel: `Staff: ${personName(row.firstName, row.lastName)} (${row.role})`, targetRole: "Staff" };
  }
  const groupLabel: Record<string, string> = {
    All: "All school",
    Students: "All students",
    Teachers: "All teachers",
    Staff: "All staff",
    Parents: "All parents",
    Admin_Only: "Admin only",
  };
  const targetMap: Record<string, AnnouncementRole> = {
    All: "All",
    Students: "Students",
    Teachers: "Staff",
    Staff: "Staff",
    Parents: "Parents",
    Admin_Only: "Admin_Only",
  };
  return {
    audienceLabel: groupLabel[input.audienceKey] ?? input.audienceKey,
    targetRole: targetMap[input.audienceKey] ?? "All",
  };
}
