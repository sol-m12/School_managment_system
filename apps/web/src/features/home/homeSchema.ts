import { z } from "zod";

export type HomeFieldError = "required" | "tooLong" | "validation";

export const homeFormSchema = z.object({
  senderName: z.string().trim().min(1, "required").max(100, "tooLong"),
  orgName: z.string().trim().max(100, "tooLong"),
  email: z
    .string()
    .trim()
    .max(100, "tooLong")
    .refine((value) => value === "" || z.email().safeParse(value).success, "validation"),
  phone: z.string().trim().min(1, "required").max(20, "tooLong"),
  subject: z.string().trim().min(1, "required").max(200, "tooLong"),
  message: z.string().trim().min(1, "required").max(4000, "tooLong"),
});

export type HomeFormValues = z.infer<typeof homeFormSchema>;

export const HOME_FORM_DEFAULTS: HomeFormValues = {
  senderName: "",
  orgName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};
