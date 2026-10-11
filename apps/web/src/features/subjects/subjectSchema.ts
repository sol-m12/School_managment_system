import { z } from "zod";
import { STREAMS, type SubjectInput } from "./api/useSubjects";

/** subjects.subject_name is varchar(100). */
export const SUBJECT_NAME_MAX = 100;
export const GRADE_LEVELS = [9, 10, 11, 12] as const;
const COMMON_ONLY_GRADES: readonly number[] = [9, 10];

/** Messages are keys in the `errors` locale namespace. */
export type FieldErrorKey = "required" | "tooLong" | "wholeNumber" | "creditRange" | "orderRange";

const FIELD_ERROR_KEYS: readonly string[] = ["required", "tooLong", "wholeNumber", "creditRange", "orderRange"];

export function isFieldErrorKey(value: string | undefined): value is FieldErrorKey {
  return value !== undefined && FIELD_ERROR_KEYS.includes(value);
}

function wholeNumber(min: number, max: number, rangeKey: FieldErrorKey) {
  return z.number({ error: "required" }).int("wholeNumber").min(min, rangeKey).max(max, rangeKey);
}

export const subjectFormSchema = z.object({
  subjectName: z.string().trim().min(1, "required").max(SUBJECT_NAME_MAX, "tooLong"),
  gradeLevel: z.number({ error: "required" }).int().min(9, "required").max(12, "required"),
  // A disabled select (grades 9 and 10) submits no value; toSubjectInput sets Common.
  stream: z.enum(STREAMS).optional(),
  creditHours: wholeNumber(0, 20, "creditRange"),
  sortOrder: wholeNumber(0, 999, "orderRange"),
  isVocational: z.boolean(),
});

export type SubjectFormValues = z.input<typeof subjectFormSchema>;

export function isCommonOnlyGrade(gradeLevel: number): boolean {
  return COMMON_ONLY_GRADES.includes(gradeLevel);
}

export function toSubjectInput(values: z.output<typeof subjectFormSchema>): SubjectInput {
  return {
    ...values,
    stream: isCommonOnlyGrade(values.gradeLevel) ? "Common" : (values.stream ?? "Common"),
  };
}

export const CREATE_DEFAULTS: SubjectFormValues = {
  subjectName: "",
  gradeLevel: 9,
  stream: "Common",
  creditHours: 3,
  sortOrder: 1,
  isVocational: false,
};
