import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { toErrorKey } from "@/lib/apiError";
import { BookOpen, CalendarDays, IdCard, Library } from "lucide-react";
import { openStudentFile } from "./api/format";
import {
  useApplyProgram,
  useAssignmentDesk,
  useAttendanceDesk,
  useChooseSkill,
  useCloseQuery,
  useDisciplineDesk,
  useDocumentDesk,
  useHelpdeskDesk,
  useIdDesk,
  useLibraryDesk,
  useNoticeDesk,
  useOpenQuery,
  usePlannerDesk,
  useRequestDocument,
  useSubmitWork,
  useTimetableDesk,
  useVocationalDesk,
} from "./api/useStudentDesk";
import { StudentPanel } from "./components/StudentPanel";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

const MARK = { P: "present", A: "absent", T: "tardy" } as const;
const BAND = { none: "bandNone", explore: "bandExplore", choose: "bandChoose", continue: "bandContinue" } as const;
const RANK = { reader: "rankReader", member: "rankMember", scholar: "rankScholar" } as const;
const DOC = { Submitted: "docSubmitted", Reviewing: "docReviewing", Ready: "docReady", Collected: "docCollected" } as const;
const STEP = ["Submitted", "Reviewing", "Ready", "Collected"] as const;

export function AttendanceStatusPage() {
  const { t } = useTranslation("student");
  const query = useAttendanceDesk();
  return (
    <>
      <PageHeader title={t("attendanceTitle")} description={t("attendanceHelp")} />
      <StudentPanel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard label={t("present")} value={String(data.present)} icon={CalendarDays} tone="success" />
              <StatCard label={t("absent")} value={String(data.absent)} icon={CalendarDays} tone="danger" />
              <StatCard label={t("tardy")} value={String(data.tardy)} icon={CalendarDays} />
            </div>
            <Card>
              <Table
                columns={[
                  { key: "date", header: t("date"), render: (row) => row.date },
                  { key: "subject", header: t("subject"), render: (row) => row.subject || t("homeroomMark") },
                  { key: "status", header: t("status"), render: (row) => t(MARK[row.status]) },
                  { key: "approval", header: t("approval"), render: (row) => row.approval },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </StudentPanel>
    </>
  );
}

export function DisciplineStatusPage() {
  const { t } = useTranslation("student");
  const query = useDisciplineDesk();
  return (
    <>
      <PageHeader title={t("disciplineTitle")} description={t("disciplineHelp")} />
      <StudentPanel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("warnings")} />
              <CardBody>{data.warnings.length === 0 ? t("empty") : data.warnings.map((row) => <p key={row.id}>{row.text}</p>)}</CardBody>
            </Card>
            <Card>
              <CardHeader title={t("penalties")} />
              <CardBody>
                {data.penalties.length === 0
                  ? t("empty")
                  : data.penalties.map((row) => (
                      <p key={row.id}>
                        {row.kind} · {row.days} · {row.startsOn} · {row.note}
                      </p>
                    ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("commendations")} />
              <CardBody>{data.commendations.length === 0 ? t("empty") : data.commendations.map((row) => <p key={row.id}>{row.note}</p>)}</CardBody>
            </Card>
          </div>
        )}
      </StudentPanel>
    </>
  );
}

export function StudentTimetablePage() {
  const { t } = useTranslation("student");
  const query = useTimetableDesk();
  return (
    <>
      <PageHeader title={t("timetableTitle")} description={t("timetableHelp")} />
      <StudentPanel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "day", header: t("day"), render: (row) => row.day },
                { key: "period", header: t("period"), render: (row) => String(row.period) },
                { key: "time", header: t("time"), render: (row) => `${row.start}–${row.end}` },
                { key: "subject", header: t("subject"), render: (row) => row.subject },
                { key: "teacher", header: t("teacher"), render: (row) => row.teacher },
                { key: "type", header: t("kind"), render: (row) => row.type },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </StudentPanel>
    </>
  );
}

export function NotificationsPage() {
  const { t } = useTranslation("student");
  const query = useNoticeDesk();
  return (
    <>
      <PageHeader title={t("noticeTitle")} description={t("noticeHelp")} />
      <StudentPanel query={query}>
        {(data) => (
          <div className="grid gap-3">
            {data.rows.length === 0 ? <p>{t("empty")}</p> : null}
            {data.rows.map((row) => (
              <Card key={row.id}>
                <CardHeader title={row.title} />
                <CardBody>
                  {row.urgent ? <Badge tone="danger">{t("urgent")}</Badge> : null}
                  <p className="mt-2 whitespace-pre-wrap">{row.content}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </StudentPanel>
    </>
  );
}

export function AssignmentsPage() {
  const { t } = useTranslation(["student", "errors"]);
  const query = useAssignmentDesk();
  const save = useSubmitWork();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("workTitle")} description={t("workHelp")} />
      {view}
      <StudentPanel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("notes")} />
              <CardBody>
                {data.notes.length === 0 ? t("empty") : null}
                {data.notes.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 py-1">
                    <span>{row.title}</span>
                    {row.hasFile ? (
                      <Button type="button" variant="secondary" onClick={() => void openStudentFile(`/student/resources/${row.id}/file`)}>
                        {t("download")}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("homework")} />
              <CardBody className="grid gap-4">
                {data.tasks.length === 0 ? t("empty") : null}
                {data.tasks.map((row) => (
                  <form
                    key={row.id}
                    className="grid gap-2"
                    onSubmit={(event: FormEvent<HTMLFormElement>) => {
                      const form = readForm(event);
                      save.mutate(
                        { taskId: row.id, body: textOf(form, "body") },
                        {
                          onSuccess: () => setNotice({ tone: "success", text: t("saved") }),
                          onError: (error) => fail(setNotice, t, error),
                        },
                      );
                    }}
                  >
                    <p className="font-semibold">
                      {row.subject} · {row.title}
                    </p>
                    <p className="text-sm text-ink-muted">{row.deadline ?? t("noDeadline")}</p>
                    {row.submitted ? (
                      <Badge tone="success">{t("submitted")}</Badge>
                    ) : (
                      <>
                        <Input name="body" label={t("answer")} required />
                        <Button type="submit" loading={save.isPending}>{t("submit")}</Button>
                      </>
                    )}
                  </form>
                ))}
              </CardBody>
            </Card>
          </div>
        )}
      </StudentPanel>
    </>
  );
}

export function StudentVocationalPage() {
  const { t } = useTranslation(["student", "errors"]);
  const query = useVocationalDesk();
  const choose = useChooseSkill();
  const apply = useApplyProgram();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("skillTitle")} description={t("skillHelp")} />
      {view}
      <StudentPanel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody>
                <p>{t(BAND[data.band])}</p>
                <p className="mt-2">{t("currentSkill")}: {data.currentSkill ?? t("noneYet")}</p>
              </CardBody>
            </Card>
            {data.canChoose ? (
              <Card>
                <CardHeader title={t("chooseSkill")} />
                <CardBody>
                  <form
                    className="grid max-w-md gap-3"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      choose.mutate(
                        { subjectId: Number(textOf(form, "subjectId")) },
                        {
                          onSuccess: () => setNotice({ tone: "success", text: t("saved") }),
                          onError: (error) => fail(setNotice, t, error),
                        },
                      );
                    }}
                  >
                    <Select name="subjectId" label={t("subject")} required options={data.subjects.map((row) => ({ value: String(row.id), label: row.name }))} />
                    <Button type="submit" loading={choose.isPending}>{t("chooseSkill")}</Button>
                  </form>
                </CardBody>
              </Card>
            ) : null}
            <Card>
              <Table
                columns={[
                  { key: "name", header: t("program"), render: (row) => row.name },
                  { key: "trade", header: t("trade"), render: (row) => row.trade },
                  { key: "seats", header: t("seats"), render: (row) => `${row.filled}/${row.capacity}` },
                  {
                    key: "apply",
                    header: t("action"),
                    render: (row) =>
                      row.mine || row.status !== "Open" ? (
                        row.mine ? t("applied") : row.status
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          loading={apply.isPending}
                          onClick={() =>
                            apply.mutate(
                              { programId: row.id, note: "" },
                              {
                                onSuccess: () => setNotice({ tone: "success", text: t("saved") }),
                                onError: (error) => fail(setNotice, t, error),
                              },
                            )
                          }
                        >
                          {t("apply")}
                        </Button>
                      ),
                  },
                ]}
                rows={data.programs}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </StudentPanel>
    </>
  );
}

export function LibraryStatusPage() {
  const { t } = useTranslation("student");
  const query = useLibraryDesk();
  return (
    <>
      <PageHeader title={t("libraryTitle")} description={t("libraryHelp")} />
      <StudentPanel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard label={t("libraryPoints")} value={String(data.points)} icon={Library} />
              <StatCard label={t("rankLabel")} value={t(RANK[data.rank])} icon={BookOpen} tone="success" />
              <StatCard label={t("borrowed")} value={String(data.borrowed)} icon={Library} />
            </div>
            <Card>
              <Table
                columns={[
                  { key: "title", header: t("book"), render: (row) => row.title },
                  { key: "status", header: t("status"), render: (row) => (row.late ? t("late") : row.status) },
                  { key: "borrowed", header: t("borrowedOn"), render: (row) => row.borrowDate ?? "" },
                ]}
                rows={data.loans}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </StudentPanel>
    </>
  );
}

export function LibraryUsagePage() {
  const { t } = useTranslation("student");
  const query = useLibraryDesk();
  return (
    <>
      <PageHeader title={t("usageTitle")} description={t("usageHelp")} />
      <StudentPanel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "date", header: t("date"), render: (row) => row.date ?? "" },
                { key: "shift", header: t("shift"), render: (row) => row.shift ?? "" },
                { key: "book", header: t("book"), render: (row) => row.bookTitle },
              ]}
              rows={data.usage}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </StudentPanel>
    </>
  );
}

export function DocumentRequestPage() {
  const { t } = useTranslation(["student", "errors"]);
  const query = useDocumentDesk();
  const save = useRequestDocument();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("documentTitle")} description={t("documentHelp")} />
      {view}
      <StudentPanel query={query}>
        {(data) => (
          <div className="grid gap-4">
            {data.canRequest ? (
              <Card>
                <CardBody>
                  <form
                    className="grid max-w-md gap-3"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      save.mutate(
                        { kind: textOf(form, "kind") as "transcript" | "document", purpose: textOf(form, "purpose") },
                        {
                          onSuccess: () => {
                            setNotice({ tone: "success", text: t("saved") });
                            event.currentTarget.reset();
                          },
                          onError: (error) => fail(setNotice, t, error),
                        },
                      );
                    }}
                  >
                    <Select
                      name="kind"
                      label={t("kind")}
                      required
                      options={[
                        { value: "transcript", label: t("transcript") },
                        { value: "document", label: t("otherDocument") },
                      ]}
                    />
                    <Input name="purpose" label={t("purpose")} required />
                    <Button type="submit" loading={save.isPending}>{t("request")}</Button>
                  </form>
                </CardBody>
              </Card>
            ) : (
              <p>{t("grade12Only")}</p>
            )}
            {data.rows.map((row) => (
              <Card key={row.id}>
                <CardHeader title={row.kind === "transcript" ? t("transcript") : t("otherDocument")} />
                <CardBody>
                  <p>{row.purpose}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STEP.map((step) => (
                      <Badge key={step} tone={step === row.status ? "success" : "neutral"}>
                        {t(DOC[step])}
                      </Badge>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </StudentPanel>
    </>
  );
}

export function HelpdeskPage() {
  const { t } = useTranslation(["student", "errors"]);
  const query = useHelpdeskDesk();
  const save = useOpenQuery();
  const close = useCloseQuery();
  const { setNotice, view } = useNotice();
  const categories = ["account", "network", "hardware", "marks", "other"] as const;
  return (
    <>
      <PageHeader title={t("helpTitle")} description={t("helpdeskHelp")} />
      {view}
      <StudentPanel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody>
                <form
                  className="grid max-w-xl gap-3"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      { title: textOf(form, "title"), details: textOf(form, "details"), category: textOf(form, "category") },
                      {
                        onSuccess: () => {
                          setNotice({ tone: "success", text: t("saved") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Input name="title" label={t("title")} required />
                  <Select name="category" label={t("category")} required options={categories.map((value) => ({ value, label: t(value) }))} />
                  <Input name="details" label={t("details")} required />
                  <Button type="submit" loading={save.isPending}>{t("submit")}</Button>
                </form>
              </CardBody>
            </Card>
            {data.rows.map((row) => (
              <Card key={row.id}>
                <CardHeader title={row.title} />
                <CardBody>
                  <p>{row.details}</p>
                  <p className="mt-2 text-sm text-ink-muted">{row.status}</p>
                  {row.status === "Open" || row.status === "InProgress" ? (
                    <Button type="button" variant="secondary" className="mt-3" loading={close.isPending} onClick={() => close.mutate(row.id)}>
                      {t("closeQuery")}
                    </Button>
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </StudentPanel>
    </>
  );
}

export function StudyPlannerPage() {
  const { t } = useTranslation("student");
  const query = usePlannerDesk();
  return (
    <>
      <PageHeader title={t("plannerTitle")} description={t("plannerHelp")} />
      <StudentPanel query={query}>
        {(data) =>
          data.items.length === 0 ? (
            <p>{t("plannerClear")}</p>
          ) : (
            <div className="grid gap-3">
              {data.items.map((row) => (
                <Card key={row.subject}>
                  <CardBody>
                    <p className="font-semibold">{row.subject}</p>
                    <p>{row.reason === "weak" ? t("reasonWeak") : t("reasonAbsent")}</p>
                    <p>{t("minutes", { count: row.minutes })}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          )
        }
      </StudentPanel>
    </>
  );
}

export function DigitalIdPage() {
  const { t } = useTranslation("student");
  const query = useIdDesk();
  return (
    <>
      <PageHeader title={t("idTitle")} description={t("idHelp")} />
      <StudentPanel query={query}>
        {(data) => (
          <Card>
            <CardBody className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
              <div dangerouslySetInnerHTML={{ __html: data.qrSvg.startsWith("<svg") ? data.qrSvg : "" }} />
              <div>
                <p className="text-xl font-semibold">{data.fullName}</p>
                <p>{t("studentCode")}: {data.code}</p>
                <p>{t("classBadge", { grade: data.gradeLevel, section: data.section })}</p>
                <p>{data.academicYear}</p>
                <p>{data.gender === "M" ? t("male") : t("female")}</p>
                <p className="flex items-center gap-2"><IdCard size={16} /> {data.username}</p>
              </div>
            </CardBody>
          </Card>
        )}
      </StudentPanel>
    </>
  );
}
