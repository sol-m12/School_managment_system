import { z } from "zod";

/** Roles that exist on both staff.role and users.role. */
export const STAFF_ROLES = [
  "Admin",
  "Counselor",
  "Finance",
  "Librarian",
  "Registrar",
  "Secretary",
  "Store_Keeper",
  "Teacher",
  "Technician",
  "V_Principal",
  "Principal",
] as const;

export const ANNOUNCEMENT_ROLES = ["All", "Staff", "Students", "Parents", "Admin_Only"] as const;

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const announcementBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(60000),
  targetRole: z.enum(ANNOUNCEMENT_ROLES),
  startDate: dateText,
  endDate: dateText.nullable().optional(),
  isUrgent: z.boolean(),
});

export type AnnouncementInput = z.infer<typeof announcementBodySchema>;

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const teacherBodySchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  gender: z.enum(["Male", "Female", "Other"]),
  jobTitle: z.string().trim().min(1).max(100),
  phoneNumber: z.string().trim().max(50).optional().default(""),
  hireDate: dateText.nullable().optional(),
  salary: z.number().min(0).max(99_999_999.99),
  experienceYears: z.number().min(0).max(99.99),
  subjectId: z.number().int().positive().nullable().optional(),
});

export type TeacherInput = z.infer<typeof teacherBodySchema>;

export const staffBodySchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: z.enum(STAFF_ROLES),
  jobTitle: z.string().trim().max(100).optional().default(""),
  gender: z.enum(["Male", "Female"]).optional(),
  phoneNumber: z.string().trim().max(50).optional().default(""),
  salary: z.number().min(0).max(99_999_999.99).nullable().optional(),
  hireDate: dateText.nullable().optional(),
  password: z.string().min(1).max(255),
});

export type StaffInput = z.infer<typeof staffBodySchema>;

export const roleBodySchema = z.object({
  roleName: z.string().trim().min(1).max(100),
});

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null) return undefined;
  return value;
}

export const studentIdQuerySchema = z.object({
  search: z.string().trim().max(255).optional().default(""),
  grade: z.preprocess(emptyToUndefined, z.coerce.number().int().optional()),
  section: z.string().trim().max(10).optional().default(""),
});
