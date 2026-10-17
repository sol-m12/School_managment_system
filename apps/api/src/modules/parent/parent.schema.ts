import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createParentBodySchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(8).max(100),
  displayName: z.string().trim().min(2).max(200),
});

export const lookupParentQuerySchema = z.object({
  code: z.string().trim().min(4).max(32),
});

export const linkParentBodySchema = z.object({
  parentCode: z.string().trim().min(4).max(32),
  studentId: z.number().int().positive(),
});

export const appointmentBodySchema = z.object({
  studentId: z.number().int().positive(),
  withRole: z.enum(["Principal", "V_Principal"]),
  purpose: z.string().trim().min(3).max(500),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
});

export const messageBodySchema = z.object({
  studentId: z.number().int().positive(),
  withRole: z.enum(["Principal", "V_Principal", "Homeroom", "Subject"]),
  subjectName: z.string().trim().min(1).max(120).optional().nullable(),
  body: z.string().trim().min(1).max(2000),
});

export type CreateParentInput = z.infer<typeof createParentBodySchema>;
export type LinkParentInput = z.infer<typeof linkParentBodySchema>;
export type AppointmentInput = z.infer<typeof appointmentBodySchema>;
export type MessageInput = z.infer<typeof messageBodySchema>;
