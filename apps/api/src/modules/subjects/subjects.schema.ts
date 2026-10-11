import { z } from "zod";

/** subjects.subject_name is varchar(100). */
export const SUBJECT_NAME_MAX = 100;
export const GRADE_LEVELS = [9, 10, 11, 12] as const;
export const STREAMS = ["Common", "Natural", "Social"] as const;
/** Grades that only allow the Common stream. */
export const COMMON_ONLY_GRADES: readonly number[] = [9, 10];

export const subjectBodySchema = z.object({
  subjectName: z.string().trim().min(1).max(SUBJECT_NAME_MAX),
  gradeLevel: z.number().int().min(9).max(12),
  stream: z.enum(STREAMS),
  creditHours: z.number().int().min(0).max(20),
  sortOrder: z.number().int().min(0).max(999),
  isVocational: z.boolean(),
});

export type SubjectInput = z.infer<typeof subjectBodySchema>;

export const subjectIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export function isStreamAllowed(input: Pick<SubjectInput, "gradeLevel" | "stream">): boolean {
  return !COMMON_ONLY_GRADES.includes(input.gradeLevel) || input.stream === "Common";
}
