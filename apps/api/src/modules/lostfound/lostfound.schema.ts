import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const postItemSchema = z.object({
  kind: z.enum(["Lost", "Found"]),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional().default(""),
  locationText: z.string().trim().max(255).optional().default(""),
  contactText: z.string().trim().max(255).optional().default(""),
});

export const moderateSchema = z.object({
  action: z.enum(["Approve", "Reject", "Resolve"]),
});

export type PostItemBody = z.infer<typeof postItemSchema>;
export type ModerateBody = z.infer<typeof moderateSchema>;
