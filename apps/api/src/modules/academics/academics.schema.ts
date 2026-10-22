import { z } from "zod";

const yearText = z.string().trim().min(1).max(10);
const streamText = z.enum(["Common", "Natural", "Social"]);

export const studentBodySchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  gender: z.enum(["M", "F"]),
  age: z.number().int().positive(),
  gradeLevel: z.number().int().min(9).max(12),
  stream: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    streamText.nullable(),
  ),
  registrationType: z.enum(["አዲስ", "ነባር", "አቋራጭ", "ደጋሚ", "መልሶ ቅበላ"]),
  previousSchool: z.string().trim().max(255).optional(),
  kebele: z.string().trim().max(100).optional(),
  gote: z.string().trim().max(100).optional(),
  houseNumber: z.string().trim().max(50).optional(),
  isTransfer: z.boolean().optional(),
  academicYear: yearText.optional(),
});

export const placementQuerySchema = z.object({
  year: yearText.optional(),
  rosterYear: z.string().trim().max(20).optional(),
  grade: z.string().trim().max(12).optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
});

export const placementAutoSchema = z.object({
  year: yearText,
  rosterYear: z.string().trim().min(1).max(20),
  gradeLevel: z.number().int().min(1),
  stream: streamText,
  mode: z.enum(["merit", "equal"]),
});

export const placementManualSchema = z.object({
  year: yearText,
  rosterYear: z.string().trim().min(1).max(20),
  classId: z.number().int().positive(),
  studentIds: z.array(z.number().int().positive()).min(1),
});

export const placementResetSchema = z.object({
  year: yearText,
  scope: z.enum(["grade", "section", "all"]),
  gradeLevel: z.number().int().min(9).max(12).optional(),
  classId: z.number().int().positive().optional(),
});

export const assignmentBodySchema = z.object({
  staffId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  gradeLevel: z.number().int().positive(),
  section: z.string().trim().max(10).nullable(),
});

export const assignmentUpdateSchema = z.object({
  staffId: z.number().int().positive(),
});

export const scheduleGenerateSchema = z.object({
  shift: z.enum(["Morning", "Afternoon", "Both"]),
  totalPeriods: z.number().int().min(1).max(12).default(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  afternoonStartTime: z.string().regex(/^\d{2}:\d{2}$/).default("13:00"),
  duration: z.number().int().min(20).max(120).default(45),
});

export const scheduleMoveSchema = z.object({
  sourceId: z.number().int().positive(),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  period: z.number().int().positive(),
});

export const scheduleSwapSchema = z.object({
  sourceId: z.number().int().positive(),
  targetId: z.number().int().positive(),
});

export type StudentBody = z.infer<typeof studentBodySchema>;
export type PlacementQuery = z.infer<typeof placementQuerySchema>;
export type PlacementAuto = z.infer<typeof placementAutoSchema>;
export type PlacementManual = z.infer<typeof placementManualSchema>;
export type PlacementReset = z.infer<typeof placementResetSchema>;
export type AssignmentBody = z.infer<typeof assignmentBodySchema>;
export type ScheduleGenerate = z.infer<typeof scheduleGenerateSchema>;
export type ScheduleMove = z.infer<typeof scheduleMoveSchema>;
export type ScheduleSwap = z.infer<typeof scheduleSwapSchema>;
