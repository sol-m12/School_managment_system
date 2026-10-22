import { z } from "zod";
import { studentBodySchema } from "../academics/academics.schema.js";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const studentSearchSchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  grade: z.string().trim().max(12).optional().default(""),
  section: z.string().trim().max(10).optional().default(""),
});

export const registerBodySchema = studentBodySchema;

export const renewBodySchema = z.object({
  studentIds: z.array(z.number().int().positive()).max(200).optional(),
  code: z.string().trim().max(80).optional(),
  gradeLevel: z.number().int().min(9).max(12).optional(),
  section: z.string().trim().max(10).optional(),
  toYear: z.string().trim().min(1).max(10).optional(),
});

export const noticeBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(5000),
  targetRole: z.enum(["All", "Staff", "Students", "Parents", "Admin_Only"]).default("All"),
});

export const decideBodySchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export const documentBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  audience: z.string().trim().max(120).default(""),
  fileNote: z.string().trim().max(500).default(""),
});

export const appointmentBodySchema = z.object({
  visitorName: z.string().trim().min(1).max(255),
  purpose: z.string().trim().min(1).max(500),
  withRole: z.enum(["Principal", "V_Principal", "Registrar", "Technician", "Librarian", "Secretary"]),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Browsers may send HH:mm or HH:mm:ss from <input type="time">
  startsAt: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .transform((value) => value.slice(0, 5)),
});

export const appointmentStatusSchema = z.object({
  status: z.enum(["Scheduled", "Done", "Cancelled"]),
});

export const ticketBodySchema = z.object({
  subject: z.string().trim().min(1).max(255),
  details: z.string().trim().min(1).max(1000),
  routeTo: z.enum(["Principal", "V_Principal", "Registrar", "Technician", "Librarian"]),
});

export const ticketStatusSchema = z.object({
  status: z.enum(["Open", "Routed", "Closed"]),
});

export const ocrBodySchema = z.object({
  rawText: z.string().trim().min(1).max(8000),
});

export const ocrRegisterSchema = z.object({
  scanId: z.number().int().positive(),
});

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type RenewInput = z.infer<typeof renewBodySchema>;
export type NoticeInput = z.infer<typeof noticeBodySchema>;
export type DocumentInput = z.infer<typeof documentBodySchema>;
export type AppointmentInput = z.infer<typeof appointmentBodySchema>;
export type TicketInput = z.infer<typeof ticketBodySchema>;
export type OcrInput = z.infer<typeof ocrBodySchema>;
