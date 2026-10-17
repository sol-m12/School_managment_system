import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const transcriptBodySchema = z.object({
  studentId: z.number().int().positive(),
  kind: z.enum(["transcript", "cumulative"]),
});

export const sectionBodySchema = z.object({
  academicYear: z.string().trim().regex(/^\d{4}$/),
  gradeLevel: z.number().int().min(1).max(12),
  section: z.string().trim().min(1).max(10),
});

export const correctionBodySchema = z.object({
  gradeEntryId: z.number().int().positive(),
  proposedScore: z.number().finite().nonnegative(),
  reason: z.string().trim().min(3).max(500),
});

export const unlockBodySchema = sectionBodySchema.extend({
  reason: z.string().trim().min(3).max(500),
});

export const decideBodySchema = z.object({
  action: z.enum(["grant", "refuse"]),
  note: z.string().trim().min(3).max(500),
});

export const importBodySchema = z.object({
  kind: z.enum(["csv", "structured", "excel", "pdf"]),
  text: z.string().max(200_000).default(""),
});

export const staffBodySchema = z.object({
  staffId: z.number().int().positive(),
  kind: z.enum(["credential", "work", "file"]),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(1000),
});

export const alumniBodySchema = z.object({
  studentId: z.number().int().positive(),
  graduationYear: z.string().trim().regex(/^\d{4}$/),
  note: z.string().trim().max(255).default(""),
});

export const alumniQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  year: z.string().trim().max(10).optional().default(""),
  gender: z.enum(["", "M", "F"]).optional().default(""),
});

export const exportQuerySchema = z.object({
  kind: z.enum(["marks", "alumni"]),
  year: z.string().trim().max(10).optional().default(""),
});

export const verifyQuerySchema = z.object({
  code: z.string().trim().min(4).max(16),
});

export const fileFieldsSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(160),
});
