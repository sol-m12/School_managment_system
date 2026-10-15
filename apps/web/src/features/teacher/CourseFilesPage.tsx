import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, EmptyState, Input, PageHeader, Select, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useAddCourseFile, useCourseFiles } from "./api/useCourseFiles";

const CATEGORIES = ["Course material", "Lecture notes", "Assignment"] as const;

export function CourseFilesPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const board = useCourseFiles();
  const add = useAddCourseFile();
  const [classSelect, setClassSelect] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  if (board.isPending) return <p className="py-8 text-center text-sm text-ink-muted">{t("common:loading")}</p>;
  if (board.isError || !board.data) return <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>;
  const data = board.data;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice(null);
    try {
      await add.mutateAsync({
        classSelect,
        category,
        title: String(form.get("title") ?? ""),
        content: String(form.get("content") ?? ""),
      });
      event.currentTarget.reset();
      setClassSelect("");
      setNotice({ tone: "success", text: t("teacher:courseSaved") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("teacher:courseTitle")} description={t("teacher:courseHint")} />
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Select
              label={t("teacher:gradePick")}
              value={classSelect}
              onChange={(event) => setClassSelect(event.target.value)}
              placeholder={t("teacher:storeItemPlaceholder")}
              options={data.classes.map((row) => ({ value: row.value, label: row.label }))}
              required
            />
            <Select
              label={t("teacher:courseCategory")}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              options={[
                { value: "Course material", label: t("teacher:courseMaterial") },
                { value: "Lecture notes", label: t("teacher:courseNotes") },
                { value: "Assignment", label: t("teacher:courseAssignment") },
              ]}
            />
            <Input name="title" label={t("teacher:fileTitle")} required />
            <div className="md:col-span-2">
              <Input name="content" label={t("teacher:courseBody")} required />
            </div>
            <Button type="submit" loading={add.isPending} disabled={classSelect === ""}>
              {t("teacher:courseShare")}
            </Button>
          </form>
        </CardBody>
      </Card>
      {data.rows.length === 0 ? (
        <EmptyState title={t("teacher:courseEmpty")} />
      ) : (
        <Card>
          <Table
            columns={[
              { key: "title", header: t("teacher:fileTitle"), render: (row) => row.title },
              {
                key: "category",
                header: t("teacher:courseCategory"),
                render: (row) =>
                  row.category === "Lecture notes"
                    ? t("teacher:courseNotes")
                    : row.category === "Assignment"
                      ? t("teacher:courseAssignment")
                      : t("teacher:courseMaterial"),
              },
              { key: "class", header: t("teacher:courseClass"), render: (row) => row.classLabel },
              { key: "date", header: t("teacher:requestedOn"), render: (row) => row.sharedAt },
            ]}
            rows={data.rows}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
    </div>
  );
}
