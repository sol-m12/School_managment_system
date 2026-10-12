import { z } from "zod";
import { STREAMS, type SubjectInput } from "./api/useSubjects";

/** subjects.subject_name is varchar(100). */
export const SUBJECT_NAME_MAX = 100;
export const GRADE_LEVELS = [9, 10, 11, 12] as const;
const COMMON_ONLY_GRADES: readonly number[] = [9, 10];

/** Messages are keys in the `errors` locale namespace. */
export type FieldErrorKey = "required" | "tooLong" | "wholeNumber";

const FIELD_ERROR_KEYS: readonly string[] = ["required", "tooLong", "wholeNumber"];

export function isFieldErrorKey(value: string | undefined): value is FieldErrorKey {
  return value !== undefined && FIELD_ERROR_KEYS.includes(value);
}

function wholeNumber() {
  return z.number({ error: "required" }).int("wholeNumber");
}

export const subjectFormSchema = z.object({
  subjectName: z.string().trim().min(1, "required").max(SUBJECT_NAME_MAX, "tooLong"),
  gradeLevel: z.number({ error: "required" }).int(),
  stream: z.enum(STREAMS),
  creditHours: wholeNumber(),
  sortOrder: wholeNumber(),
  isVocational: z.boolean(),
});

export type SubjectFormValues = z.input<typeof subjectFormSchema>;

/** Legacy toggleStream() sets Common when the grade select changes to 9 or 10. The select stays usable. */
export function isCommonOnlyGrade(gradeLevel: number): boolean {
  return COMMON_ONLY_GRADES.includes(gradeLevel);
}

export function toSubjectInput(values: z.output<typeof subjectFormSchema>): SubjectInput {
  return values;
}

export const CREATE_DEFAULTS: SubjectFormValues = {
  subjectName: "",
  gradeLevel: 9,
  stream: "Common",
  creditHours: 3,
  sortOrder: 1,
  isVocational: false,
};
