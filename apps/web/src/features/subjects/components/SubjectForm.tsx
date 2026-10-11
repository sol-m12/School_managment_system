import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Select, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { STREAMS, type SubjectInput } from "../api/useSubjects";
import {
  GRADE_LEVELS,
  isCommonOnlyGrade,
  isFieldErrorKey,
  SUBJECT_NAME_MAX,
  subjectFormSchema,
  toSubjectInput,
  type SubjectFormValues,
} from "../subjectSchema";

type SubjectFormProps = {
  /** "create" = the add form on the list page, "edit" = the edit page (different legacy labels and layout). */
  variant: "create" | "edit";
  defaultValues: SubjectFormValues;
  /** Resolves true when saved; the create form then resets to its defaults. */
  onSubmit: (input: SubjectInput) => Promise<boolean>;
};

export function SubjectForm({ variant, defaultValues, onSubmit }: SubjectFormProps) {
  const { t } = useTranslation(["subjects", "errors"]);
  const isCreate = variant === "create";

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(subjectFormSchema), defaultValues });

  const gradeLevel = useWatch({ control, name: "gradeLevel" });
  const commonOnly = isCommonOnlyGrade(Number(gradeLevel));

  useEffect(() => {
    if (commonOnly) setValue("stream", "Common");
  }, [commonOnly, setValue]);

  const gradeOptions = useMemo(
    () =>
      GRADE_LEVELS.map((grade) => ({
        value: String(grade),
        label: t(isCreate ? "subjects:gradeShort" : "subjects:gradeLong", { grade }),
      })),
    [t, isCreate],
  );
  const streamOptions = useMemo(
    () => STREAMS.map((stream) => ({ value: stream, label: t(`subjects:streams.${stream}`) })),
    [t],
  );

  const fieldError = (message: string | undefined) => (isFieldErrorKey(message) ? t(`errors:${message}`) : undefined);

  const submit = handleSubmit(async (values) => {
    const saved = await onSubmit(toSubjectInput(values));
    if (saved && isCreate) reset(defaultValues);
  });

  const labels = isCreate ? "subjects:create" : "subjects:edit";

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="grid grid-cols-12 gap-4">
      <Input
        className={cn("col-span-12", isCreate ? "md:col-span-3" : "md:col-span-6")}
        label={t(`${labels}.subjectName`)}
        placeholder={isCreate ? t("subjects:create.subjectNamePlaceholder") : undefined}
        maxLength={SUBJECT_NAME_MAX}
        required
        error={fieldError(errors.subjectName?.message)}
        {...register("subjectName")}
      />
      <Select
        className={cn("col-span-6", isCreate ? "md:col-span-2" : "md:col-span-3")}
        label={t(`${labels}.gradeLevel`)}
        options={gradeOptions}
        required
        error={fieldError(errors.gradeLevel?.message)}
        {...register("gradeLevel", { setValueAs: (value: string | number) => Number(value) })}
      />
      <Select
        className={cn("col-span-6", isCreate ? "md:col-span-2" : "md:col-span-3")}
        label={t(`${labels}.stream`)}
        options={streamOptions}
        disabled={commonOnly}
        {...register("stream")}
      />
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={20}
        step={1}
        className={cn("col-span-6", isCreate ? "md:col-span-1" : "md:col-span-4")}
        label={t(`${labels}.creditHours`)}
        error={fieldError(errors.creditHours?.message)}
        {...register("creditHours", { valueAsNumber: true })}
      />
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={999}
        step={1}
        className={cn("col-span-6", isCreate ? "md:col-span-2" : "md:col-span-4")}
        label={t(`${labels}.sortOrder`)}
        title={isCreate ? t("subjects:create.sortOrderTitle") : undefined}
        hint={isCreate ? undefined : t("subjects:edit.sortOrderHint")}
        required={!isCreate}
        error={fieldError(errors.sortOrder?.message)}
        {...register("sortOrder", { valueAsNumber: true })}
      />
      <div className={cn("col-span-6 flex items-end", isCreate ? "md:col-span-2" : "col-span-12 md:col-span-4")}>
        <Switch label={t(`${labels}.isVocational`)} {...register("isVocational")} />
      </div>

      <div
        className={cn(
          "col-span-12 flex justify-center md:justify-end",
          isCreate ? "mt-2" : "mt-4 border-t border-border pt-5",
        )}
      >
        <Button
          type="submit"
          size={isCreate ? "md" : "lg"}
          loading={isSubmitting}
          leftIcon={isCreate ? undefined : <Save aria-hidden="true" className="size-4" />}
          className="px-10"
        >
          {t(`${labels}.submit`)}
        </Button>
      </div>
    </form>
  );
}
