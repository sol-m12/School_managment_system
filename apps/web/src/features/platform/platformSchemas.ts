import { z } from "zod";

export const platformLoginSchema = z.object({
  username: z.string().trim().min(1, "required").max(50, "tooLong"),
  password: z.string().min(1, "required").max(200, "tooLong"),
});

export type PlatformLoginValues = z.infer<typeof platformLoginSchema>;

export const addSchoolSchema = z.object({
  name: z.string().trim().min(2, "required").max(255, "tooLong"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "required")
    .max(100, "tooLong")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slugFormat"),
  adminUsername: z.string().trim().min(2, "required").max(50, "tooLong"),
  adminPassword: z.string().min(8, "passwordShort").max(200, "tooLong"),
  adminFirstName: z.string().trim().max(100, "tooLong").optional().or(z.literal("")),
  adminLastName: z.string().trim().max(100, "tooLong").optional().or(z.literal("")),
});

export type AddSchoolValues = z.infer<typeof addSchoolSchema>;

export function isPlatformFieldErrorKey(
  message: string | undefined,
): message is "required" | "tooLong" | "slugFormat" | "passwordShort" {
  return (
    message === "required" ||
    message === "tooLong" ||
    message === "slugFormat" ||
    message === "passwordShort"
  );
}
