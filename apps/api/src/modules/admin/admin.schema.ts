import { z } from "zod";

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/);

export const academicYearBodySchema = z.object({
  academicYear: z.string().trim().min(1).max(20),
  semester: z.enum(["1", "2"]),
});

export const passwordResetBodySchema = z.object({
  userId: z.number().int().positive(),
  password: z.string().min(1).max(255),
});

export const schoolInfoBodySchema = z.object({
  schoolName: z.string().trim().min(1).max(255),
  schoolVision: z.string().max(255).optional(),
  schoolEmail: z.string().max(100).optional(),
  schoolPhone: z.string().max(50).optional(),
  schoolAddress: z.string().max(255).optional(),
  aboutText: z.string().max(10000).optional(),
  schoolNeeds: z.string().max(10000).optional(),
  promoVideoUrl: z.string().max(255).optional(),
});

export const gradeUnlockBodySchema = z.object({
  studentId: z.number().int().positive().nullable(),
  subjectId: z.number().int().positive(),
  academicYear: z.string().trim().min(1).max(10),
  semester: z.enum(["1", "2"]),
});

export const approveGradeBodySchema = z.object({
  gradeLevel: z.number().int().positive(),
});

export const approveAttendanceBodySchema = z.object({
  recordedBy: z.number().int().positive(),
  startDate: dateText,
  endDate: dateText,
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const studentQuerySchema = z.object({
  academicYear: z.string().max(10).optional(),
  gradeLevel: z.coerce.number().int().positive().optional(),
  section: z.string().max(10).optional(),
  gender: z.enum(["M", "F"]).optional(),
  registrationType: z.string().max(20).optional(),
});

export const userQuerySchema = z.object({
  q: z.string().max(100).optional(),
});

export const profileBodySchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().max(255).optional(),
});

export const incomeBodySchema = z.object({
  source: z.string().trim().min(1).max(100),
  amount: money,
  dateReceived: dateText,
});

export const expenseBodySchema = z.object({
  category: z.string().trim().min(1).max(100),
  amount: money,
  datePaid: dateText,
  description: z.string().max(5000).optional(),
});

export type AcademicYearInput = z.infer<typeof academicYearBodySchema>;
export type PasswordResetInput = z.infer<typeof passwordResetBodySchema>;
export type SchoolInfoInput = z.infer<typeof schoolInfoBodySchema>;
export type GradeUnlockInput = z.infer<typeof gradeUnlockBodySchema>;
export type ApproveAttendanceInput = z.infer<typeof approveAttendanceBodySchema>;
export type StudentQuery = z.infer<typeof studentQuerySchema>;
export type ProfileInput = z.infer<typeof profileBodySchema>;
export type IncomeInput = z.infer<typeof incomeBodySchema>;
export type ExpenseInput = z.infer<typeof expenseBodySchema>;
