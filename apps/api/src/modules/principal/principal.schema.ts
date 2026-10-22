import { z } from "zod";
import { audienceKeySchema, audiencePickSchema } from "../../lib/audienceOptions.js";

export const REPORT_COLUMNS = [
  "name",
  "gender",
  "gradeLevel",
  "section",
  "year",
  "registrationType",
  "average",
  "absenceRate",
] as const;

export type ReportColumn = (typeof REPORT_COLUMNS)[number];

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const policyBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  area: z.enum(["performance", "policy", "compliance"]),
  status: z.enum(["Draft", "Active", "Retired"]),
  effectiveOn: dateText.nullable().optional(),
});

export const policyStatusSchema = z.object({
  status: z.enum(["Draft", "Active", "Retired"]),
});

export const messageAudienceKeySchema = audienceKeySchema;

export const messageBodySchema = audiencePickSchema.and(
  z.object({
    kind: z.enum(["announcement", "emergency", "memo", "targeted", "bulk"]),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(4000),
  }),
);

export const decideBodySchema = z.object({
  source: z.enum(["store", "registration", "attendance", "staff"]),
  sourceId: z.number().int().positive(),
  action: z.enum(["approve", "reject", "clarify", "override"]),
  note: z.string().trim().max(255).default(""),
});

export const documentBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
});

export const signBodySchema = z.object({
  signerName: z.string().trim().min(3).max(160),
});

export const transferBodySchema = z.object({
  studentId: z.number().int().positive(),
  destination: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(1).max(255),
});

export const clearanceBodySchema = z.object({
  libraryClear: z.boolean(),
  storeClear: z.boolean(),
  financeClear: z.boolean(),
});

export const trainingBodySchema = audiencePickSchema.and(
  z.object({
    title: z.string().trim().min(1).max(160),
    trainer: z.string().trim().min(1).max(160),
    scheduledOn: dateText,
    seats: z.number().int().min(1).max(500),
    notes: z.string().trim().max(2000).default(""),
  }),
);

export const incidentBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  details: z.string().trim().min(1).max(4000),
  severity: z.enum(["low", "medium", "high"]),
  studentId: z.number().int().positive().nullable().optional(),
});

export const incidentStatusSchema = z.object({
  status: z.enum(["Open", "Investigating", "Resolved"]),
});

export const reportDefBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  columns: z.array(z.enum(REPORT_COLUMNS)).min(1).max(REPORT_COLUMNS.length),
});

export type PolicyInput = z.infer<typeof policyBodySchema>;
export type MessageInput = z.infer<typeof messageBodySchema>;
export type DecideInput = z.infer<typeof decideBodySchema>;
export type DocumentInput = z.infer<typeof documentBodySchema>;
export type SignInput = z.infer<typeof signBodySchema>;
export type TransferInput = z.infer<typeof transferBodySchema>;
export type ClearanceInput = z.infer<typeof clearanceBodySchema>;
export type TrainingInput = z.infer<typeof trainingBodySchema>;
export type IncidentInput = z.infer<typeof incidentBodySchema>;
export type ReportDefInput = z.infer<typeof reportDefBodySchema>;
