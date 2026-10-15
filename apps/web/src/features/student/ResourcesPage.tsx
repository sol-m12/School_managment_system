import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardBody, EmptyState, Input, Modal, Select } from "@/components/ui";
import { openStudentFile, shortDate } from "./api/format";
import type { ResourceRow } from "./api/types";
import { useStudentResources } from "./api/useStudentResources";
import { StudentPanel } from "./components/StudentPanel";

export function ResourcesPage() {
  const { t } = useTranslation("student");
  const [filters, setFilters] = useState({ search: "", semester: "", year: "" });
  const [draft, setDraft] = useState(filters);
  const [reading, setReading] = useState<ResourceRow | null>(null);
  const query = useStudentResources(filters);
  return (
    <StudentPanel query={query}>
      {(data) => (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-brand-900">{t("filesTitle")}</h2>
            <Badge tone="neutral">{t("classLine", { grade: data.gradeLevel, section: data.section, stream: data.stream })}</Badge>
          </div>
          <Card>
            <CardBody>
              <form
                className="grid gap-3 md:grid-cols-4"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  setFilters(draft);
                }}
              >
                <Input
                  label={t("searchByName")}
                  value={draft.search}
                  onChange={(event) => setDraft({ ...draft, search: event.target.value })}
                  placeholder={t("searchPlaceholder")}
                />
                <Select
                  label={t("semester")}
                  value={draft.semester}
                  onChange={(event) => setDraft({ ...draft, semester: event.target.value })}
                  placeholder={t("all")}
                  options={[
                    { value: "1st Semester", label: t("sem1") },
                    { value: "2nd Semester", label: t("sem2") },
                  ]}
                />
                <Input
                  label={t("year")}
                  value={draft.year}
                  onChange={(event) => setDraft({ ...draft, year: event.target.value })}
                  placeholder={t("yearPlaceholder")}
                />
                <div className="flex items-end">
                  <Button type="submit" fullWidth>
                    {t("filter")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
          {data.rows.length === 0 ? (
            <EmptyState title={t("noFiles")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.rows.map((row) => (
                <Card key={row.id}>
                  <CardBody className="flex h-full flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="brand">{row.subjectName || t("generalSubject")}</Badge>
                      <span className="text-xs text-ink-muted">{shortDate(row.sharedAt)}</span>
                    </div>
                    <h3 className="truncate font-bold" title={row.title}>
                      {row.title}
                    </h3>
                    <p className="text-sm text-ink-muted">{row.teacherName}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{t("semesterBadge", { value: row.semester ?? "" })}</Badge>
                      <Badge>{t("yearBadge", { value: row.academicYear ?? "" })}</Badge>
                    </div>
                    <div className="mt-auto flex gap-2">
                      {row.fileType === "EDITOR" ? (
                        <Button fullWidth onClick={() => setReading(row)}>
                          {t("read")}
                        </Button>
                      ) : (
                        <>
                          <Button variant="secondary" fullWidth onClick={() => void openStudentFile(`/student/resources/${row.id}/file`)}>
                            {t("view")}
                          </Button>
                          <Button fullWidth onClick={() => void openStudentFile(`/student/resources/${row.id}/file`)}>
                            {t("download")}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
          <Modal open={reading != null} onClose={() => setReading(null)} title={reading?.title ?? ""}>
            {reading ? (
              <div className="space-y-3 text-sm">
                <p>
                  {t("teacher")} <strong>{reading.teacherName}</strong>
                </p>
                <p className="whitespace-pre-wrap break-words">{reading.content}</p>
                <Button variant="secondary" onClick={() => setReading(null)}>
                  {t("close")}
                </Button>
              </div>
            ) : null}
          </Modal>
        </div>
      )}
    </StudentPanel>
  );
}
