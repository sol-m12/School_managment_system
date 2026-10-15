import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useAddSimulation, useRemoveSimulation, useSimulations } from "./api/useSimulations";

export function SimulationsPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const board = useSimulations();
  const add = useAddSimulation();
  const remove = useRemoveSimulation();
  const [classSelect, setClassSelect] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  if (board.isPending) return <p className="py-8 text-center text-sm text-ink-muted">{t("common:loading")}</p>;
  if (board.isError || !board.data) return <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>;
  const data = board.data;
  const chosen = data.classes.find((row) => row.value === classSelect);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const [grade, section] = classSelect.split("-");
    setNotice(null);
    try {
      await add.mutateAsync({
        gradeLevel: Number(grade),
        section: section ?? "",
        subjectName,
        simTitle: String(form.get("simTitle") ?? ""),
        simUrl: String(form.get("simUrl") ?? ""),
      });
      event.currentTarget.reset();
      setClassSelect("");
      setSubjectName("");
      setNotice({ tone: "success", text: t("teacher:simulationSaved") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("teacher:simTitle")} description={data.academicYear} />
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Select
              label={t("teacher:gradePick")}
              value={classSelect}
              onChange={(event) => {
                setClassSelect(event.target.value);
                setSubjectName("");
              }}
              placeholder={t("teacher:storeItemPlaceholder")}
              options={data.classes.map((row) => ({ value: row.value, label: row.label }))}
              required
            />
            <Select
              label={t("teacher:subject")}
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              placeholder={t("teacher:storeItemPlaceholder")}
              options={(chosen?.subjects ?? []).map((name) => ({ value: name, label: name }))}
              required
            />
            <Input name="simTitle" label={t("teacher:simName")} required />
            <Input name="simUrl" label={t("teacher:simUrl")} />
            <Button type="submit" loading={add.isPending}>
              {t("teacher:addSimulation")}
            </Button>
          </form>
        </CardBody>
      </Card>
      {data.items.length === 0 ? (
        <EmptyState title={t("teacher:noSimulations")} />
      ) : (
        <div className="grid gap-3">
          {data.items.map((item) => (
            <Card key={item.id}>
              <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">{item.simTitle}</p>
                  <p className="text-sm text-ink-muted">
                    {item.subjectName} · {item.gradeLevel}
                    {item.section}
                  </p>
                  {item.simUrl ? (
                    <a className="text-sm text-brand-700" href={item.simUrl} target="_blank" rel="noreferrer">
                      {item.simUrl}
                    </a>
                  ) : null}
                </div>
                <Button
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => {
                    setNotice(null);
                    remove.mutate(item.id, {
                      onSuccess: () => setNotice({ tone: "success", text: t("teacher:simulationDeleted") }),
                      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                    });
                  }}
                >
                  {t("teacher:deleteSimulation")}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
