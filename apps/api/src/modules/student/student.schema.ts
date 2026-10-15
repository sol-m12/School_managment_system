import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const resourceQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  semester: z.enum(["1st Semester", "2nd Semester"]).optional(),
  year: z.string().trim().max(10).optional(),
});

export const messageBodySchema = z.object({
  text: z.string().trim().min(1).max(2000),
});
