import { z } from "zod";
import { CRITERIA } from "./officeRules.js";

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const markStatus = z.enum(["P", "A", "T"]);

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const syncBodySchema = z.object({
  marks: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        subjectId: z.number().int().positive(),
        date: dateText,
        status: markStatus,
      }),
    )
    .min(1)
    .max(200),
});

export const swapBodySchema = z.object({
  leftId: z.number().int().positive(),
  rightId: z.number().int().positive(),
});

export const substitutionBodySchema = z.object({
  timetableId: z.number().int().positive(),
  coverDate: dateText,
  substituteStaffId: z.number().int().positive(),
  reason: z.string().trim().max(255).default(""),
});

export const incidentBodySchema = z.object({
  studentId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  category: z.enum(["attendance", "academic", "behavior", "safety"]),
  summary: z.string().trim().min(1).max(500),
});

export const incidentActionSchema = z.object({
  action: z.enum(["acknowledge", "close"]),
});

export const leaveBodySchema = z.object({
  kind: z.enum(["sick", "personal", "annual"]),
  startsOn: dateText,
  endsOn: dateText,
  reason: z.string().trim().min(1).max(500),
});

export const leaveActionSchema = z.object({
  action: z.enum(["withdraw", "approve", "reject"]),
});

export const recommendationBodySchema = z.object({
  subjectId: z.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  author: z.string().trim().max(255).default(""),
  reason: z.string().trim().min(1).max(500),
});

export const questionBodySchema = z.object({
  subjectId: z.number().int().positive(),
  topic: z.string().trim().min(1).max(120),
  stem: z.string().trim().min(1).max(1000),
  optionA: z.string().trim().min(1).max(255),
  optionB: z.string().trim().min(1).max(255),
  optionC: z.string().trim().min(1).max(255),
  optionD: z.string().trim().min(1).max(255),
  correct: z.enum(["A", "B", "C", "D"]),
  points: z.number().min(1).max(10),
});

export const paperBodySchema = z.object({
  subjectId: z.number().int().positive(),
  title: z.string().trim().min(1).max(160),
  count: z.number().int().min(1).max(50),
});

export const participationBodySchema = z.object({
  studentId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  markedOn: dateText,
});

export const participationQuerySchema = z.object({
  subjectId: z.coerce.number().int().positive().optional(),
  date: dateText.optional(),
});

export const standardBodySchema = z.object({
  subjectId: z.number().int().positive(),
  assessmentName: z.string().trim().min(1).max(100),
  maxScore: z.number().int().min(1).max(100),
});

export const requisitionBodySchema = z.object({
  itemName: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(10000),
  purpose: z.string().trim().min(1).max(500),
});

export const coverageBodySchema = z.object({
  planDetailId: z.number().int().positive(),
  coveredOn: dateText,
});

const scoreShape = Object.fromEntries(CRITERIA.map((item) => [item.key, z.number().min(0).max(item.max)])) as {
  [Key in (typeof CRITERIA)[number]["key"]]: z.ZodNumber;
};

export const evaluationBodySchema = z.object({
  staffId: z.number().int().positive(),
  term: z.enum(["1", "2"]),
  note: z.string().trim().max(500).default(""),
  scores: z.object(scoreShape),
});

export type SyncInput = z.infer<typeof syncBodySchema>;
export type SwapInput = z.infer<typeof swapBodySchema>;
export type SubstitutionInput = z.infer<typeof substitutionBodySchema>;
export type IncidentInput = z.infer<typeof incidentBodySchema>;
export type LeaveInput = z.infer<typeof leaveBodySchema>;
export type RecommendationInput = z.infer<typeof recommendationBodySchema>;
export type QuestionInput = z.infer<typeof questionBodySchema>;
export type PaperInput = z.infer<typeof paperBodySchema>;
export type ParticipationInput = z.infer<typeof participationBodySchema>;
export type StandardInput = z.infer<typeof standardBodySchema>;
export type RequisitionInput = z.infer<typeof requisitionBodySchema>;
export type CoverageInput = z.infer<typeof coverageBodySchema>;
export type EvaluationInput = z.infer<typeof evaluationBodySchema>;
