import { z } from "zod";

export const loginBodySchema = z.object({
  tenantSlug: z.string().trim().min(1).max(100),
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
