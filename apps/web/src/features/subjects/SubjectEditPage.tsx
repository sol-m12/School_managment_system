import { useCallback, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, CardBody, PageHeader, Spinner } from "@/components/ui";
import { toErrorKey, type ErrorKey } from "@/lib/apiError";
import { useSaveSubject } from "./api/useSaveSubject";
import { useSubject } from "./api/useSubject";
import type { SubjectInput } from "./api/useSubjects";
import { SubjectForm } from "./components/SubjectForm";

/** Errors with their own message; everything else shows the legacy "could not change" text. */
const SPECIFIC_ERRORS: readonly ErrorKey[] = [
  "validation",
  "forbidden",
  "unauthorized",
  "network",
  "subjectNotFound",
  "subjectStreamInvalid",
];

type Result = { status: "success" } | { status: "error"; key: ErrorKey };

export function SubjectEditPage() {
  const { t } = useTranslation(["subjects", "errors", "common"]);
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const subject = useSubject(id);
  const { mutateAsync: saveSubject } = useSaveSubject(id);
  const [result, setResult] = useState<Result | null>(null);

  const handleSubmit = useCallback(
    async (input: SubjectInput) => {
      setResult(null);
      try {
        await saveSubject(input);
        setResult({ status: "success" });
        return true;
      } catch (error) {
        setResult({ status: "error", key: toErrorKey(error) });
        return false;
      }
    },
    [saveSubject],
  );

  const message = (() => {
    if (!result) return null;
    if (result.status === "success") return <Alert tone="success">{t("subjects:edit.success")}</Alert>;
    if (result.key === "subjectDuplicate") return <Alert tone="danger">{t("subjects:edit.duplicate")}</Alert>;
    if (SPECIFIC_ERRORS.includes(result.key)) return <Alert tone="danger">{t(`errors:${result.key}`)}</Alert>;
    return <Alert tone="danger">{t("subjects:edit.failed")}</Alert>;
  })();

  const header = (
    <PageHeader
      title={t("subjects:edit.title")}
      actions={
        <Button
          variant="secondary"
          leftIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
          onClick={() => navigate("/academics/subjects")}
        >
          {t("subjects:edit.back")}
        </Button>
      }
    />
  );

  if (!Number.isInteger(id) || id <= 0 || subject.isError) {
    const errorKey = subject.isError ? toErrorKey(subject.error) : "subjectNotFound";
    return (
      <div className="mx-auto max-w-5xl">
        {header}
        <Alert tone="danger">{t(`errors:${errorKey}`)}</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {header}
      <Card>
        <CardBody className="sm:p-8">
          {message ? <div className="mb-5">{message}</div> : null}
          {subject.isPending ? (
            <div className="flex justify-center py-10 text-brand-700">
              <Spinner size="lg" label={t("common:loading")} />
            </div>
          ) : (
            <SubjectForm
              key={subject.data.id}
              variant="edit"
              defaultValues={{
                subjectName: subject.data.subjectName,
                gradeLevel: subject.data.gradeLevel,
                stream: subject.data.stream,
                creditHours: subject.data.creditHours,
                sortOrder: subject.data.sortOrder ?? Number.NaN,
                isVocational: subject.data.isVocational,
              }}
              onSubmit={handleSubmit}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
