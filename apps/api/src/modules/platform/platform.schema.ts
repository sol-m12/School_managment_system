import { z } from "zod";

export const platformLoginBodySchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
});

export type PlatformLoginBody = z.infer<typeof platformLoginBodySchema>;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "SLUG_FORMAT");

export const createSchoolBodySchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: slugSchema,
  adminUsername: z.string().trim().min(2).max(50),
  adminPassword: z.string().min(8).max(200),
  adminFirstName: z.string().trim().min(1).max(100).optional(),
  adminLastName: z.string().trim().min(1).max(100).optional(),
});

export type CreateSchoolBody = z.infer<typeof createSchoolBodySchema>;
