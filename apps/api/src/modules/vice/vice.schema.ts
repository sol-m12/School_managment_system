import { z } from "zod";

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clockText = z.string().regex(/^\d{2}:\d{2}$/);

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const programBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  trade: z.string().trim().min(1).max(80),
  gradeLevel: z.number().int().min(1).max(12).nullable(),
  capacity: z.number().int().min(1).max(200),
  description: z.string().trim().min(1).max(500),
});

export const programStatusSchema = z.object({
  status: z.enum(["Open", "Closed"]),
});

export const placementBodySchema = z.object({
  programId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  note: z.string().trim().max(255).default(""),
});

export const placementStatusSchema = z.object({
  status: z.enum(["Applied", "Placed", "Completed", "Withdrawn"]),
});

export const referralBodySchema = z.object({
  studentId: z.number().int().positive(),
  category: z.enum(["attendance", "misconduct", "academic", "safety"]),
  severity: z.enum(["low", "medium", "high"]),
  summary: z.string().trim().min(1).max(500),
});

export const hearingBodySchema = z.object({
  heldOn: dateText,
  committee: z.string().trim().min(1).max(255),
  minutes: z.string().trim().max(1000).default(""),
});

export const hearingOutcomeSchema = z.object({
  outcome: z.enum(["Pending", "Upheld", "Dismissed", "Reduced"]),
  minutes: z.string().trim().max(1000),
});

export const penaltyBodySchema = z.object({
  kind: z.enum(["warning", "detention", "suspension", "community"]),
  days: z.number().int().min(0).max(90),
  startsOn: dateText,
  note: z.string().trim().max(255).default(""),
});

export const sessionBodySchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    room: z.string().trim().min(1).max(80),
    examDate: dateText,
    startTime: clockText,
    endTime: clockText,
    gradeLevel: z.number().int().min(1).max(12),
    section: z.string().trim().min(1).max(10),
    needed: z.number().int().min(1).max(6),
  })
  .refine((value) => value.endTime > value.startTime, { path: ["endTime"] });

export const manualDutySchema = z.object({
  staffId: z.number().int().positive(),
});

export const examDaySchema = z.object({
  examDate: dateText,
});

export type ProgramInput = z.infer<typeof programBodySchema>;
export type PlacementInput = z.infer<typeof placementBodySchema>;
export type ReferralInput = z.infer<typeof referralBodySchema>;
export type HearingInput = z.infer<typeof hearingBodySchema>;
export type HearingOutcomeInput = z.infer<typeof hearingOutcomeSchema>;
export type PenaltyInput = z.infer<typeof penaltyBodySchema>;
export type SessionInput = z.infer<typeof sessionBodySchema>;
