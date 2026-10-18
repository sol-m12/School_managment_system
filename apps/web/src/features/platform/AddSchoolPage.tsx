import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert, Button, Input } from "@/components/ui";
import { toErrorKey, type ErrorKey } from "@/lib/apiError";
import { schoolLoginPath, schoolSiteUrl } from "@/lib/tenantSlug";
import { createPlatformSchool, type CreatedSchool } from "./platformApi";
import {
  addSchoolSchema,
  isPlatformFieldErrorKey,
  type AddSchoolValues,
} from "./platformSchemas";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function AddSchoolPage() {
  const { t } = useTranslation("platform");
  const { t: tErrors } = useTranslation("errors");
  const queryClient = useQueryClient();
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [created, setCreated] = useState<CreatedSchool | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddSchoolValues>({
    resolver: zodResolver(addSchoolSchema),
    defaultValues: {
      name: "",
      slug: "",
      adminUsername: "",
      adminPassword: "",
      adminFirstName: "",
      adminLastName: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createPlatformSchool,
    onSuccess: async (school) => {
      setCreated(school);
      await queryClient.invalidateQueries({ queryKey: ["platform", "schools"] });
    },
  });

  const fieldError = (message: string | undefined) =>
    isPlatformFieldErrorKey(message) ? tErrors(message) : undefined;

  const onSubmit = handleSubmit(async (values) => {
    setErrorKey(null);
    setCreated(null);
    try {
      await mutation.mutateAsync({
        name: values.name,
        slug: values.slug,
        adminUsername: values.adminUsername,
        adminPassword: values.adminPassword,
        adminFirstName: values.adminFirstName || undefined,
        adminLastName: values.adminLastName || undefined,
      });
    } catch (error) {
      setErrorKey(toErrorKey(error));
    }
  });

  const nameValue = watch("name");
  const slugRegister = register("slug");

  async function copySiteUrl() {
    if (!created) return;
    await navigator.clipboard.writeText(schoolSiteUrl(created.slug));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
              <CheckCircle2 aria-hidden className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t("add.successTitle")}</h1>
              <p className="mt-1 text-sm text-ink-muted">{t("add.successBody")}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-3 rounded-2xl bg-canvas p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t("add.resultName")}</dt>
              <dd className="font-medium">{created.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t("add.resultSlug")}</dt>
              <dd className="font-mono text-xs">{created.slug}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t("add.resultAdmin")}</dt>
              <dd className="font-medium">{created.adminUsername}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t("add.resultRole")}</dt>
              <dd className="font-medium">{created.adminRole}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">{t("add.resultSite")}</dt>
              <dd className="flex items-center gap-2 font-medium">
                <a
                  href={schoolSiteUrl(created.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-teal-700 hover:underline"
                >
                  {schoolSiteUrl(created.slug)}
                </a>
                <button
                  type="button"
                  onClick={() => void copySiteUrl()}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-ink-muted hover:bg-white"
                  aria-label={t("add.copy")}
                >
                  <Copy aria-hidden className="size-4" />
                </button>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t("add.resultLogin")}</dt>
              <dd className="font-medium">
                <Link to={schoolLoginPath(created.slug)} className="text-teal-700 hover:underline">
                  {schoolLoginPath(created.slug)}
                </Link>
              </dd>
            </div>
          </dl>
          {copied ? <p className="mt-2 text-sm text-teal-700">{t("add.copied")}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/platform/schools"
              className="inline-flex min-h-11 items-center rounded-control bg-teal-700 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-teal-800"
            >
              {t("add.backToList")}
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreated(null);
                setCopied(false);
              }}
            >
              {t("add.addAnother")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("add.title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("add.subtitle")}</p>
      </div>

      {errorKey ? (
        <Alert tone="danger" className="mb-4">
          {tErrors(errorKey)}
        </Alert>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-3xl border border-border bg-white p-6 shadow-soft sm:p-8"
        noValidate
      >
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
            {t("add.sectionSchool")}
          </legend>
          <Input
            label={t("add.name")}
            error={fieldError(errors.name?.message)}
            {...register("name", {
              onChange: (event) => {
                if (!slugTouched) {
                  setValue("slug", slugify(event.target.value), { shouldValidate: true });
                }
              },
            })}
          />
          <Input
            label={t("add.slug")}
            hint={t("add.slugHint", { slug: watch("slug") || "your-school" })}
            error={fieldError(errors.slug?.message)}
            {...slugRegister}
            onChange={(event) => {
              setSlugTouched(true);
              void slugRegister.onChange(event);
            }}
          />
          {nameValue ? (
            <p className="text-xs text-ink-muted">
              {t("add.preview", { url: schoolSiteUrl(watch("slug") || "your-school") })}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-4 border-t border-border pt-5">
          <legend className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
            {t("add.sectionAdmin")}
          </legend>
          <p className="text-sm text-ink-muted">{t("add.adminHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("add.adminFirstName")}
              error={fieldError(errors.adminFirstName?.message)}
              {...register("adminFirstName")}
            />
            <Input
              label={t("add.adminLastName")}
              error={fieldError(errors.adminLastName?.message)}
              {...register("adminLastName")}
            />
          </div>
          <Input
            label={t("add.adminUsername")}
            autoComplete="off"
            error={fieldError(errors.adminUsername?.message)}
            {...register("adminUsername")}
          />
          <Input
            label={t("add.adminPassword")}
            type="password"
            autoComplete="new-password"
            hint={t("add.passwordHint")}
            error={fieldError(errors.adminPassword?.message)}
            {...register("adminPassword")}
          />
        </fieldset>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" className="bg-teal-700 hover:bg-teal-800" disabled={isSubmitting}>
            {t("add.submit")}
          </Button>
          <Link
            to="/platform/schools"
            className="inline-flex min-h-11 items-center rounded-control px-4 text-sm font-medium text-ink-muted hover:text-ink-strong"
          >
            {t("add.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
