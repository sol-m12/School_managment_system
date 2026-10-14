import { z } from "zod";

export const classSelectSchema = z.string().trim().min(3).max(40);
export const subjectIdSchema = z.coerce.number().int().positive();

export const sheetQuerySchema = z.object({
  classSelect: classSelectSchema,
  subjectId: subjectIdSchema,
});

export const planBodySchema = z.object({
  classSelect: classSelectSchema,
  subjectId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        name: z.string().trim().max(40),
        percent: z.number(),
      }),
    )
    .min(1)
    .max(30),
});

export const scoreBodySchema = z.object({
  classSelect: classSelectSchema,
  subjectId: z.number().int().positive(),
  finalize: z.boolean().optional(),
  marks: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        weightingType: z.string().trim().min(1).max(50),
        score: z.number().min(0).nullable(),
      }),
    )
    .max(8000),
});

export const planIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type PlanBody = z.infer<typeof planBodySchema>;
export type ScoreBody = z.infer<typeof scoreBodySchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const markSchema = z.enum(["X", "A", "P", "L"]);

export const attendanceQuerySchema = z.object({
  date: isoDate.optional(),
  classId: z.coerce.number().int().positive().optional(),
});

export const subjectAttendanceQuerySchema = z.object({
  date: isoDate.optional(),
  classSelect: classSelectSchema.optional(),
  subjectId: z.coerce.number().int().positive().optional(),
});

export const homeroomAttendanceBodySchema = z.object({
  classId: z.number().int().positive(),
  date: isoDate,
  marks: z.array(z.object({ studentId: z.number().int().positive(), mark: markSchema })).max(80),
});

export const subjectAttendanceBodySchema = z.object({
  classSelect: classSelectSchema,
  subjectId: z.number().int().positive(),
  date: isoDate,
  marks: z.array(z.object({ studentId: z.number().int().positive(), mark: markSchema })).max(80),
});

export const examBodySchema = z.object({
  examTitle: z.string().trim().min(1).max(255),
  gradeLevel: z.number().int().min(9).max(12),
  subjectId: z.number().int().positive(),
  section: z.string().trim().min(1).max(20),
  examPassword: z.string().trim().min(1).max(255),
  durationMinutes: z.number().int().min(1).max(300).default(40),
  isOfficial: z.boolean().optional(),
  weightingPercent: z.number().min(0).max(100).optional(),
});

export const examStatusSchema = z.object({
  status: z.enum(["Draft", "Published", "Closed"]),
});

export const examOpenSchema = z.object({
  password: z.string().max(255),
});

export const questionBodySchema = z.object({
  questionText: z.string().trim().min(1).max(8000),
  optionA: z.string().trim().min(1).max(2000),
  optionB: z.string().trim().min(1).max(2000),
  optionC: z.string().trim().min(1).max(2000),
  optionD: z.string().trim().min(1).max(2000),
  correctOption: z.enum(["A", "B", "C", "D"]),
  points: z.number().positive().max(100),
});

export const examGradeQuerySchema = z.object({
  grade: z.coerce.number().int().min(9).max(12).optional(),
});

export const lessonBodySchema = z.object({
  subjectId: z.number().int().positive(),
  gradeLevel: z.number().int().min(9).max(12),
  weekNumber: z.number().int().min(1).max(54),
  topicTitle: z.string().trim().min(1).max(255),
  learningObjectives: z.string().trim().max(4000).optional(),
});

export const registrationQuerySchema = z.object({
  grade: z.coerce.number().int().min(9).max(12).optional(),
  q: z.string().trim().max(100).optional(),
});

export const registrationBodySchema = z.object({
  studentId: z.number().int().positive().optional(),
  fullName: z.string().trim().min(1).max(255),
  gender: z.enum(["M", "F"]),
  age: z.number().int().min(1).max(120),
  gradeLevel: z.number().int().min(9).max(12),
  registrationType: z.enum(["አዲስ", "ነባር", "አቋራጭ", "ደጋሚ", "መልሶ ቅበላ"]),
  stream: z.enum(["Common", "Natural", "Social"]).nullable().optional(),
  previousSchool: z.string().trim().max(255).optional(),
  kebele: z.string().trim().max(100).optional(),
  gote: z.string().trim().max(100).optional(),
  houseNumber: z.string().trim().max(50).optional(),
  isTransfer: z.boolean().optional(),
  phoneNumber: z.string().trim().max(20).optional(),
});

export const simulationBodySchema = z.object({
  gradeLevel: z.number().int().min(9).max(12),
  section: z.string().trim().min(1).max(50),
  subjectName: z.string().trim().min(1).max(100),
  simTitle: z.string().trim().min(1).max(255),
  simUrl: z.string().trim().max(2000).optional(),
});

export const subjectReportQuerySchema = z.object({
  classSelect: classSelectSchema.optional(),
  subjectId: z.coerce.number().int().positive().optional(),
});

export const reportCardQuerySchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
});
