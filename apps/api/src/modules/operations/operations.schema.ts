import { z } from "zod";

export const DEPARTMENTS = [
  "Languages",
  "Mathematics",
  "Natural Science",
  "Social Science",
  "Aesthetics",
  "Vocational",
  "Physical Education",
] as const;

export const TICKET_CATEGORIES = ["account", "network", "hardware", "marks", "other"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "urgent"] as const;
export const TICKET_STATUSES = ["Open", "InProgress", "Resolved", "Closed"] as const;
export const NOTICE_CHANNELS = ["letter", "phone", "email"] as const;

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const provisionBodySchema = z.object({
  kind: z.enum(["student", "staff"]),
  id: z.number().int().positive(),
});

export const resetToIdBodySchema = z.object({
  userId: z.number().int().positive(),
});

export const gradeProtocolBodySchema = z.object({
  action: z.enum(["lock", "unlock"]),
  studentId: z.number().int().positive().nullable(),
  subjectId: z.number().int().positive(),
  academicYear: z.string().trim().min(1).max(10),
  semester: z.enum(["1", "2"]),
  reason: z.string().trim().min(8).max(500),
});

export const ticketBodySchema = z.object({
  title: z.string().trim().min(3).max(160),
  details: z.string().trim().min(3).max(4000),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
});

export const ticketStatusBodySchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

export const noticeBodySchema = z.object({
  channel: z.enum(NOTICE_CHANNELS),
  recipient: z.string().trim().min(2).max(160),
  referenceNo: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(2).max(160),
  sentOn: dateText,
});

export const backupCheckBodySchema = z.object({
  action: z.enum(["backup", "restore"]),
  note: z.string().trim().max(255).optional(),
});

export const importBodySchema = z.object({
  csv: z.string().min(1).max(100_000),
});

export const homeroomBodySchema = z.object({
  classId: z.number().int().positive(),
  staffId: z.number().int().positive(),
});

export const departmentHeadBodySchema = z.object({
  department: z.enum(DEPARTMENTS),
  staffId: z.number().int().positive(),
});

export const auditQuerySchema = z.object({
  action: z.string().trim().min(1).max(100).optional(),
});

export type ProvisionInput = z.infer<typeof provisionBodySchema>;
export type GradeProtocolInput = z.infer<typeof gradeProtocolBodySchema>;
export type TicketInput = z.infer<typeof ticketBodySchema>;
export type TicketStatusInput = z.infer<typeof ticketStatusBodySchema>;
export type NoticeInput = z.infer<typeof noticeBodySchema>;
export type BackupCheckInput = z.infer<typeof backupCheckBodySchema>;
export type HomeroomDutyInput = z.infer<typeof homeroomBodySchema>;
export type DepartmentHeadInput = z.infer<typeof departmentHeadBodySchema>;
