import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const settingsBodySchema = z.object({
  academicYear: z.string().trim().min(1).max(10),
  cutoffScore: z.number().min(0).max(10000),
});

export const scoreRowSchema = z.object({
  studentId: z.number().int().positive(),
  nationalScore: z.number().min(0).max(10000),
  transcriptRef: z.string().trim().max(255).optional().default(""),
});

export const importScoresSchema = z.object({
  academicYear: z.string().trim().min(1).max(10),
  rows: z.array(scoreRowSchema).min(1).max(500),
});

export const opportunityBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  url: z.string().trim().max(500).optional().default(""),
  guidelines: z.string().trim().max(4000).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export const applyBodySchema = z.object({
  opportunityId: z.number().int().positive(),
  note: z.string().trim().max(1000).optional().default(""),
});

export const requestLetterSchema = z.object({
  applicationId: z.number().int().positive(),
});

export const recommendationBodySchema = z.object({
  applicationId: z.number().int().positive(),
  body: z.string().trim().min(1).max(4000),
});

export type SettingsBody = z.infer<typeof settingsBodySchema>;
export type ImportScoresBody = z.infer<typeof importScoresSchema>;
export type OpportunityBody = z.infer<typeof opportunityBodySchema>;
export type ApplyBody = z.infer<typeof applyBodySchema>;
export type RecommendationBody = z.infer<typeof recommendationBodySchema>;
