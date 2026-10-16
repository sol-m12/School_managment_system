import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const choiceBodySchema = z.object({
  subjectId: z.number().int().positive(),
});

export const applyBodySchema = z.object({
  programId: z.number().int().positive(),
  note: z.string().trim().max(255).default(""),
});

export const workBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const queryBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  details: z.string().trim().min(1).max(2000),
  category: z.enum(["account", "network", "hardware", "marks", "other"]),
});

export const documentBodySchema = z.object({
  kind: z.enum(["transcript", "document"]),
  purpose: z.string().trim().min(1).max(255),
});

export const commendationBodySchema = z.object({
  studentId: z.number().int().positive(),
  note: z.string().trim().min(1).max(500),
});
