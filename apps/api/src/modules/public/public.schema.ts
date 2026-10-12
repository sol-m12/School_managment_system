import { z } from "zod";

export const publicSlugQuerySchema = z.object({
  slug: z.string().trim().min(1).max(100).default("keyit"),
});

/** Lengths match external_inquiries columns. */
export const inquiryBodySchema = z.object({
  slug: z.string().trim().min(1).max(100).default("keyit"),
  senderName: z.string().trim().min(1).max(100),
  orgName: z.string().trim().max(100).optional().default(""),
  email: z
    .string()
    .trim()
    .max(100)
    .refine((value) => value === "" || z.email().safeParse(value).success)
    .optional()
    .default(""),
  phone: z.string().trim().min(1).max(20),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
});

export type InquiryBody = z.infer<typeof inquiryBodySchema>;
