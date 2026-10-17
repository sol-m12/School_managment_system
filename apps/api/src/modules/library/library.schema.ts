import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
});

export const codeQuerySchema = z.object({
  code: z.string().trim().min(1).max(80),
});

export const studentQuerySchema = z.object({
  studentId: z.coerce.number().int().positive(),
});

export const bookBodySchema = z.object({
  bookName: z.string().trim().min(1).max(255),
  author: z.string().trim().max(255).default(""),
  publishedYear: z.string().trim().max(10).default(""),
  pageCount: z.number().int().positive().nullable().default(null),
  accessionNumber: z.string().trim().min(1).max(50),
  gradeLevel: z.number().int().min(1).max(12).nullable().default(null),
  subjectId: z.number().int().positive().nullable().default(null),
  quantity: z.number().int().min(1).max(999),
  remarks: z.string().trim().max(500).default(""),
});

export const checkoutBodySchema = z.object({
  bookId: z.number().int().positive(),
  userId: z.number().int().positive(),
});

export const scanBodySchema = z.object({
  bookCode: z.string().trim().min(1).max(80),
  patronCode: z.string().trim().min(1).max(80),
});

export const intakeBodySchema = z.object({
  itemId: z.number().int().positive(),
  copies: z.number().int().min(1).max(999),
});

export const patronBodySchema = z.object({
  userId: z.number().int().positive(),
  action: z.enum(["In", "Out"]),
  bookTitle: z.string().trim().max(255).default(""),
});

export const resourceBodySchema = z.object({
  title: z.string().trim().max(255).default(""),
  subjectId: z.number().int().positive().nullable().default(null),
  note: z.string().trim().max(500).default(""),
  recommendationId: z.number().int().positive().nullable().default(null),
});

export const literacyBodySchema = z.object({
  studentId: z.number().int().positive(),
  note: z.string().trim().max(500).default(""),
});

export const reserveBodySchema = z.object({
  bookId: z.number().int().positive(),
});

export type BookInput = z.infer<typeof bookBodySchema>;
export type CheckoutInput = z.infer<typeof checkoutBodySchema>;
export type ScanInput = z.infer<typeof scanBodySchema>;
export type IntakeInput = z.infer<typeof intakeBodySchema>;
export type PatronInput = z.infer<typeof patronBodySchema>;
export type ResourceInput = z.infer<typeof resourceBodySchema>;
export type LiteracyInput = z.infer<typeof literacyBodySchema>;
