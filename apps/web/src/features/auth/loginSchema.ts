import { z } from "zod";

/** Messages are keys in the `errors` locale namespace. */
export type FieldErrorKey = "required" | "tooLong";

export const loginSchema = z.object({
  tenantSlug: z.string().trim().min(1, "required").max(100, "tooLong"),
  username: z.string().trim().min(1, "required").max(50, "tooLong"),
  password: z.string().min(1, "required").max(200, "tooLong"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export function isFieldErrorKey(value: string | undefined): value is FieldErrorKey {
  return value === "required" || value === "tooLong";
}
