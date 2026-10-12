import { z } from "zod";

/** subjects.subject_name is varchar(100). */
export const SUBJECT_NAME_MAX = 100;
export const GRADE_LEVELS = [9, 10, 11, 12] as const;
export const STREAMS = ["Common", "Natural", "Social"] as const;

export const subjectBodySchema = z.object({
  subjectName: z.string().trim().min(1).max(SUBJECT_NAME_MAX),
  gradeLevel: z.number().int(),
  stream: z.enum(STREAMS),
  creditHours: z.number().int(),
  sortOrder: z.number().int(),
  isVocational: z.boolean(),
});

export type SubjectInput = z.infer<typeof subjectBodySchema>;

export const subjectIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
