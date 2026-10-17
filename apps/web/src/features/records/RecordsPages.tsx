import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Archive, FileCheck2, LockKeyhole, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { toErrorKey } from "@/lib/apiError";
import {
  downloadRecordFile,
  useAcceptMark,
  useAccessLog,
  useAddAlumni,
  useAddStaffRecord,
  useAdvanceQueue,
  useAlumni,
  useApplyCorrection,
  useApplyUnlock,
  useArchiveRoster,
  useArchives,
  useAskCorrection,
  useAskUnlock,
  useCreateTranscript,
  useDecideOverride,
  useImportStudents,
  useMinistryExport,
  useRecordFiles,
  useRecordInbox,
  useRecordQueue,
  useRecordRequests,
  useRecordOverrides,
  useRecordStaff,
  useRecordStudents,
  useRecordsDesk,
  useSaveFile,
  useTranscripts,
  useVerifyCode,
  type RequestRow,
} from "./api/useRecords";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

function saved(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, text: string) {
  setNotice({ tone: "success", text });
}

const QUEUE_TONE = { Submitted: "warning", Reviewing: "info", Ready: "brand", Collected: "success" } as const;
const REQUEST_TONE = { Pending: "warning", Granted: "info", Applied: "success", Refused: "danger" } as const;

function word(t: (key: string) => string, value: string): string {
  const key = value === "file" ? "fileNote" : value.charAt(0).toLowerCase() + value.slice(1);
  return t(key);
}

function MissingChoice({ title, help, to, label }: { title: string; help: string; to: string; label: string }) {
  return (
    <EmptyState
      title={title}
      description={help}
      action={
        <Link className="text-sm font-semibold text-brand-700 underline" to={to}>
          {label}
        </Link>
      }
    />
  );
}

function QrMark({ svg }: { svg: string }) {
  if (!svg.startsWith("<svg")) return null;
  return <div className="h-28 w-28" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function RecordsHomePage() {
  const { t } = useTranslation("records");
  const query = useRecordsDesk();
  const steps = [
    { icon: FileCheck2, title: t("stepAccept"), to: "/records/inbox" },
    { icon: Archive, title: t("stepArchive"), to: "/records/archives" },
    { icon: ScrollText, title: t("stepQueue"), to: "/records/queue" },
    { icon: LockKeyhole, title: t("stepOverride"), to: "/records/corrections" },
  ];
  return (
    <>
      <PageHeader title={t("homeTitle")} description={t("homeHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("waiting")} value={String(data.waiting)} icon={FileCheck2} />
              <StatCard label={t("queueOpen")} value={String(data.queue)} icon={ScrollText} tone="success" />
              <StatCard label={t("locks")} value={String(data.locks)} icon={LockKeyhole} tone="danger" />
              <StatCard label={t("documents")} value={String(data.documents)} icon={Archive} />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {steps.map((step) => (
                <Link key={step.to} to={step.to} className="rounded-card border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-raised">
                  <step.icon aria-hidden="true" className="mb-3 size-5 text-brand-700" />
                  <p className="text-sm font-semibold text-ink-strong">{step.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

export function RecordInboxPage() {
  const { t } = useTranslation(["records", "errors"]);
  const query = useRecordInbox();
  const accept = useAcceptMark();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("inboxTitle")} description={t("inboxHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardHeader title={t("inboxTitle")} />
            <Table
              columns={[
                { key: "student", header: t("student"), render: (row) => row.student },
                { key: "subject", header: t("subject"), render: (row) => row.subject },
                { key: "score", header: t("score"), render: (row) => `${row.score}/${row.maxScore}` },
                { key: "place", header: t("section"), render: (row) => `${row.gradeLevel}${row.section} ${row.year}` },
                {
                  key: "action",
                  header: t("action"),
                  render: (row) => (
                    <Button
                      type="button"
                      loading={accept.isPending}
                      onClick={() =>
                        accept.mutate(row.id, {
                          onSuccess: () => saved(setNotice, t("saved")),
                          onError: (error) => fail(setNotice, t, error),
                        })
                      }
                    >
                      {t("accept")}
                    </Button>
                  ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function RecordQueuePage() {
  const { t } = useTranslation(["records", "errors"]);
  const query = useRecordQueue();
  const advance = useAdvanceQueue();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("queueTitle")} description={t("queueHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardHeader title={t("queueTitle")} />
            <Table
              columns={[
                { key: "student", header: t("student"), render: (row) => row.student },
                { key: "kind", header: t("kind"), render: (row) => word(t, row.kind) },
                { key: "purpose", header: t("purpose"), render: (row) => row.purpose },
                { key: "status", header: t("status"), render: (row) => <Badge tone={QUEUE_TONE[row.status]}>{word(t, row.status)}</Badge> },
                {
                  key: "action",
                  header: t("action"),
                  render: (row) =>
                    row.status === "Collected" ? (
                      word(t, row.status)
                    ) : (
                      <Button
                        type="button"
                        loading={advance.isPending}
                        onClick={() =>
                          advance.mutate(row.id, {
                            onSuccess: () => saved(setNotice, t("saved")),
                            onError: (error) => fail(setNotice, t, error),
                          })
                        }
                      >
                        {t("advance")}
                      </Button>
                    ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function TranscriptsPage() {
  const { t } = useTranslation(["records", "errors"]);
  const students = useRecordStudents();
  const query = useTranscripts();
  const create = useCreateTranscript();
  const { setNotice, view } = useNotice();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    create.mutate(
      { studentId: Number(textOf(data, "studentId")), kind: textOf(data, "kind") === "cumulative" ? "cumulative" : "transcript" },
      { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
    );
  }
  return (
    <>
      <PageHeader title={t("transcriptTitle")} description={t("transcriptHelp")} />
      {view}
      <Panel query={students}>
        {(list) =>
          list.rows.length === 0 ? (
            <MissingChoice title={t("noStudents")} help={t("noStudentsHelp")} to="/records/import" label={t("goImport")} />
          ) : (
            <Card className="mb-4">
              <CardBody>
                <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
                  <Select
                    label={t("student")}
                    name="studentId"
                    placeholder={t("choose")}
                    required
                    options={list.rows.map((row) => ({ value: String(row.id), label: `${row.fullName} ${row.gradeLevel}${row.section}` }))}
                  />
                  <Select
                    label={t("kind")}
                    name="kind"
                    options={[
                      { value: "transcript", label: t("transcript") },
                      { value: "cumulative", label: t("cumulative") },
                    ]}
                  />
                  <div className="flex items-end">
                    <Button type="submit" loading={create.isPending}>
                      {t("issue")}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )
        }
      </Panel>
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-3 md:grid-cols-2">
            {data.rows.length === 0 ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
            {data.rows.map((row) => (
              <Card key={row.id}>
                <CardBody className="flex gap-4">
                  <QrMark svg={row.qrSvg} />
                  <div>
                    <p className="font-semibold text-ink-strong">{row.student}</p>
                    <p className="text-sm text-ink-muted">{word(t, row.kind)} · {row.academicYear}</p>
                    <p className="mt-1 font-mono text-sm">{row.verifyCode}</p>
                    <p className="text-sm text-ink-muted">{row.summary}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

export function ArchivesPage() {
  const { t } = useTranslation(["records", "errors"]);
  const query = useArchives();
  const archive = useArchiveRoster();
  const { setNotice, view } = useNotice();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    archive.mutate(
      { academicYear: textOf(data, "academicYear"), gradeLevel: Number(textOf(data, "gradeLevel")), section: textOf(data, "section") },
      { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
    );
  }
  return (
    <>
      <PageHeader title={t("archiveTitle")} description={t("archiveHelp")} />
      {view}
      <Card className="mb-4">
        <CardBody>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
            <Input label={t("year")} name="academicYear" required maxLength={4} />
            <Select label={t("grade")} name="gradeLevel" options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }))} />
            <Input label={t("section")} name="section" required maxLength={10} />
            <div className="flex items-end">
              <Button type="submit" loading={archive.isPending}>{t("archive")}</Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("archiveTitle")} />
              <Table
                columns={[
                  { key: "place", header: t("section"), render: (row) => `${row.gradeLevel}${row.section}` },
                  { key: "year", header: t("year"), render: (row) => row.academicYear },
                  { key: "rows", header: t("rows"), render: (row) => row.rowCount },
                ]}
                rows={data.archives}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
            <Card>
              <CardHeader title={t("lock")} />
              <Table
                columns={[
                  { key: "place", header: t("section"), render: (row) => `${row.gradeLevel}${row.section} ${row.academicYear}` },
                  {
                    key: "status",
                    header: t("status"),
                    render: (row) => <Badge tone={row.status === "Locked" ? "danger" : "success"}>{word(t, row.status)}</Badge>,
                  },
                ]}
                rows={data.locks}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

function RequestTable({
  rows,
  apply,
  kind,
}: {
  rows: RequestRow[];
  apply: (id: number) => void;
  kind: "correction" | "unlock";
}) {
  const { t } = useTranslation("records");
  return (
    <Table
      columns={[
        { key: "kind", header: t("kind"), render: (row) => word(t, row.kind) },
        { key: "place", header: t("section"), render: (row) => `${row.gradeLevel}${row.section} ${row.academicYear}` },
        { key: "score", header: t("proposed"), render: (row) => row.proposedScore ?? "—" },
        { key: "reason", header: t("reason"), render: (row) => row.reason },
        { key: "note", header: t("note"), render: (row) => row.principalNote || "—" },
        { key: "status", header: t("status"), render: (row) => <Badge tone={REQUEST_TONE[row.status]}>{word(t, row.status)}</Badge> },
        {
          key: "action",
          header: t("action"),
          render: (row) =>
            row.kind === kind && row.status === "Granted" ? (
              <Button type="button" onClick={() => apply(row.id)}>
                {t("apply")}
              </Button>
            ) : (
              "—"
            ),
        },
      ]}
      rows={rows}
      rowKey={(row) => row.id}
      empty={t("empty")}
    />
  );
}

export function CorrectionsPage() {
  const { t } = useTranslation(["records", "errors"]);
  const query = useRecordRequests();
  const ask = useAskCorrection();
  const applyCorrection = useApplyCorrection();
  const askUnlock = useAskUnlock();
  const applyUnlock = useApplyUnlock();
  const { setNotice, view } = useNotice();
  function correct(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    ask.mutate(
      { gradeEntryId: Number(textOf(data, "gradeEntryId")), proposedScore: Number(textOf(data, "proposedScore")), reason: textOf(data, "reason") },
      { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
    );
  }
  function unlock(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    askUnlock.mutate(
      {
        academicYear: textOf(data, "academicYear"),
        gradeLevel: Number(textOf(data, "gradeLevel")),
        section: textOf(data, "section"),
        reason: textOf(data, "reason"),
      },
      { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
    );
  }
  return (
    <>
      <PageHeader title={t("correctionTitle")} description={t("correctionHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("correction")} />
              <CardBody>
                {(data.accepted ?? []).length === 0 ? (
                  <MissingChoice title={t("noMarks")} help={t("noMarksHelp")} to="/records/inbox" label={t("goInbox")} />
                ) : (
                  <form className="grid gap-3 md:grid-cols-4" onSubmit={correct}>
                    <Select
                      label={t("score")}
                      name="gradeEntryId"
                      placeholder={t("choose")}
                      required
                      options={(data.accepted ?? []).map((row) => ({
                        value: String(row.id),
                        label: `${row.student} ${row.subject} ${row.score}`,
                      }))}
                    />
                    <Input label={t("proposed")} name="proposedScore" type="number" required min={0} step="0.01" />
                    <Input label={t("reason")} name="reason" required maxLength={500} />
                    <div className="flex items-end">
                      <Button type="submit" loading={ask.isPending}>{t("ask")}</Button>
                    </div>
                  </form>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("unlock")} />
              <CardBody>
                <form className="grid gap-3 md:grid-cols-5" onSubmit={unlock}>
                  <Input label={t("year")} name="academicYear" required maxLength={4} />
                  <Select label={t("grade")} name="gradeLevel" options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }))} />
                  <Input label={t("section")} name="section" required maxLength={10} />
                  <Input label={t("reason")} name="reason" required maxLength={500} />
                  <div className="flex items-end">
                    <Button type="submit" loading={askUnlock.isPending}>{t("ask")}</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("correctionTitle")} />
              <RequestTable
                rows={data.rows.filter((row) => row.kind === "correction")}
                kind="correction"
                apply={(id) =>
                  applyCorrection.mutate(id, {
                    onSuccess: () => saved(setNotice, t("saved")),
                    onError: (error) => fail(setNotice, t, error),
                  })
                }
              />
              <RequestTable
                rows={data.rows.filter((row) => row.kind === "unlock")}
                kind="unlock"
                apply={(id) =>
                  applyUnlock.mutate(id, {
                    onSuccess: () => saved(setNotice, t("saved")),
                    onError: (error) => fail(setNotice, t, error),
                  })
                }
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function RecordImportPage() {
  const { t } = useTranslation(["records", "errors"]);
  const importRows = useImportStudents();
  const { setNotice, view } = useNotice();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    const kind = textOf(data, "kind");
    importRows.mutate(
      { kind: kind === "structured" || kind === "excel" || kind === "pdf" ? kind : "csv", text: textOf(data, "text") },
      { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
    );
  }
  return (
    <>
      <PageHeader title={t("importTitle")} description={t("importHelp")} />
      {view}
      <Card>
        <CardBody>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <Select
              label={t("kind")}
              name="kind"
              options={[
                { value: "csv", label: t("csvFile") },
                { value: "structured", label: t("structuredFile") },
                { value: "excel", label: t("excelFile") },
                { value: "pdf", label: t("pdfFile") },
              ]}
            />
            <label className="text-sm font-medium text-ink-strong">
              {t("fileText")}
              <textarea name="text" required rows={8} className="mt-1 w-full rounded-card border border-border bg-surface p-3 text-sm" />
            </label>
            <Button type="submit" loading={importRows.isPending}>{t("import")}</Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}

export function StaffRecordsPage() {
  const { t } = useTranslation(["records", "errors"]);
  const query = useRecordStaff();
  const add = useAddStaffRecord();
  const { setNotice, view } = useNotice();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    const kind = textOf(data, "kind");
    add.mutate(
      {
        staffId: Number(textOf(data, "staffId")),
        kind: kind === "work" || kind === "file" ? kind : "credential",
        title: textOf(data, "title"),
        body: textOf(data, "body"),
      },
      { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
    );
  }
  return (
    <>
      <PageHeader title={t("staffTitle")} description={t("staffHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody>
                {data.staff.length === 0 ? (
                  <MissingChoice title={t("noStaff")} help={t("noStaffHelp")} to="/system/staff-registration" label={t("goStaff")} />
                ) : (
                  <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
                    <Select
                      label={t("staffMember")}
                      name="staffId"
                      placeholder={t("choose")}
                      required
                      options={data.staff.map((row) => ({ value: String(row.id), label: `${row.firstName} ${row.lastName}` }))}
                    />
                    <Select
                      label={t("kind")}
                      name="kind"
                      options={[
                        { value: "credential", label: t("credential") },
                        { value: "work", label: t("work") },
                        { value: "file", label: t("fileNote") },
                      ]}
                    />
                    <Input label={t("title")} name="title" required maxLength={160} />
                    <Input label={t("body")} name="body" required maxLength={1000} />
                    <Button type="submit" loading={add.isPending}>{t("save")}</Button>
                  </form>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("staffTitle")} />
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "kind", header: t("kind"), render: (row) => word(t, row.kind) },
                  { key: "body", header: t("body"), render: (row) => row.body },
                ]}
                rows={data.records}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function RecordFilesPage() {
  const { t } = useTranslation(["records", "errors"]);
  const students = useRecordStudents();
  const files = useRecordFiles();
  const save = useSaveFile();
  const { setNotice, view } = useNotice();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = readForm(event);
    const file = form.elements.namedItem("file");
    const picked = file instanceof HTMLInputElement ? file.files?.[0] : undefined;
    if (!picked) return;
    const body = new FormData();
    body.set("studentId", textOf(data, "studentId"));
    body.set("title", textOf(data, "title"));
    body.set("file", picked);
    save.mutate(body, { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) });
  }
  return (
    <>
      <PageHeader title={t("filesTitle")} description={t("filesHelp")} />
      {view}
      <Panel query={students}>
        {(list) =>
          list.rows.length === 0 ? (
            <MissingChoice title={t("noStudents")} help={t("noStudentsHelp")} to="/records/import" label={t("goImport")} />
          ) : (
            <Card className="mb-4">
              <CardBody>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
                  <Select
                    label={t("student")}
                    name="studentId"
                    placeholder={t("choose")}
                    required
                    options={list.rows.map((row) => ({ value: String(row.id), label: row.fullName }))}
                  />
                  <Input label={t("title")} name="title" required maxLength={160} />
                  <label className="text-sm font-medium text-ink-strong">
                    {t("pdfFile")}
                    <input name="file" type="file" accept="application/pdf" required className="mt-1 block w-full text-sm" />
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )
        }
      </Panel>
      <Panel query={files}>
        {(data) => (
          <Card>
            <CardHeader title={t("filesTitle")} />
            <Table
              columns={[
                { key: "student", header: t("student"), render: (row) => row.student },
                { key: "title", header: t("title"), render: (row) => row.title },
                {
                  key: "action",
                  header: t("action"),
                  render: (row) => (
                    <Button type="button" onClick={() => void downloadRecordFile(row.id, row.title)}>
                      {t("download")}
                    </Button>
                  ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function AlumniPage() {
  const { t } = useTranslation(["records", "errors"]);
  const students = useRecordStudents();
  const add = useAddAlumni();
  const [filter, setFilter] = useState({ q: "", year: "", gender: "" });
  const [draft, setDraft] = useState(filter);
  const query = useAlumni(filter);
  const { setNotice, view } = useNotice();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    add.mutate(
      { studentId: Number(textOf(data, "studentId")), graduationYear: textOf(data, "graduationYear"), note: textOf(data, "note") },
      { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
    );
  }
  const graduates = (students.data?.rows ?? []).filter((row) => row.gradeLevel === 12);
  if (students.isPending) return <Spinner />;
  return (
    <>
      <PageHeader title={t("alumniTitle")} description={t("alumniHelp")} />
      {view}
      {students.isSuccess && graduates.length === 0 ? (
        <MissingChoice title={t("noGraduates")} help={t("noStudentsHelp")} to="/records/import" label={t("goImport")} />
      ) : (
        <Card className="mb-4">
          <CardBody>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
              <Select
                label={t("student")}
                name="studentId"
                placeholder={t("choose")}
                required
                options={graduates.map((row) => ({ value: String(row.id), label: row.fullName }))}
              />
              <Input label={t("graduationYear")} name="graduationYear" required maxLength={4} />
              <Input label={t("note")} name="note" maxLength={255} />
              <div className="flex items-end">
                <Button type="submit" loading={add.isPending}>{t("save")}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader title={t("filter")} />
        <CardBody>
          <form
            className="mb-4 grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              setFilter(draft);
            }}
          >
            <Input label={t("name")} value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} />
            <Input label={t("year")} value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} />
            <Select
              label={t("gender")}
              value={draft.gender}
              onChange={(event) => setDraft({ ...draft, gender: event.target.value })}
              options={[
                { value: "", label: t("all") },
                { value: "M", label: t("male") },
                { value: "F", label: t("female") },
              ]}
            />
            <div className="flex items-end">
              <Button type="submit">{t("filter")}</Button>
            </div>
          </form>
          <Panel query={query}>
            {(data) => (
              <Table
                columns={[
                  { key: "name", header: t("name"), render: (row) => row.fullName },
                  { key: "gender", header: t("gender"), render: (row) => (row.gender === "M" ? t("male") : t("female")) },
                  { key: "year", header: t("graduationYear"), render: (row) => row.graduationYear },
                  { key: "section", header: t("section"), render: (row) => row.section },
                  { key: "note", header: t("note"), render: (row) => row.note },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            )}
          </Panel>
        </CardBody>
      </Card>
    </>
  );
}

export function MinistryExportPage() {
  const { t } = useTranslation(["records", "errors"]);
  const [kind, setKind] = useState<"marks" | "alumni">("marks");
  const [year, setYear] = useState("");
  const [run, setRun] = useState(false);
  const query = useMinistryExport(kind, year, run);
  function download() {
    if (!query.data) return;
    const blob = new Blob([query.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ministry-${kind}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeader title={t("exportTitle")} description={t("exportHelp")} />
      <Card>
        <CardBody>
          <form
            className="mb-4 grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              setRun(true);
            }}
          >
            <Select
              label={t("kind")}
              value={kind}
              onChange={(event) => {
                setKind(event.target.value === "alumni" ? "alumni" : "marks");
                setRun(false);
              }}
              options={[
                { value: "marks", label: t("marks") },
                { value: "alumni", label: t("alumni") },
              ]}
            />
            <Input label={t("year")} value={year} onChange={(event) => { setYear(event.target.value); setRun(false); }} />
            <div className="flex items-end gap-2">
              <Button type="submit">{t("open")}</Button>
              <Button type="button" onClick={download} disabled={!query.data}>{t("csv")}</Button>
              <Button type="button" onClick={() => window.print()} disabled={!query.data}>{t("print")}</Button>
            </div>
          </form>
          {query.data ? (
            <div className="ministry-sheet">
              <h2 className="mb-3 text-lg font-semibold">{kind === "marks" ? t("marks") : t("alumni")}</h2>
              <table className="w-full text-sm">
                <tbody>
                  {query.data.rows.map((row, index) => (
                    <tr key={index} className="border-b border-border">
                      {Object.values(row).map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-2 py-1">{String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </>
  );
}

export function AccessLogPage() {
  const { t } = useTranslation("records");
  const query = useAccessLog();
  return (
    <>
      <PageHeader title={t("accessTitle")} description={t("accessHelp")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardHeader title={t("accessTitle")} />
            <Table
              columns={[
                { key: "when", header: t("when"), render: (row) => row.createdAt },
                { key: "action", header: t("action"), render: (row) => row.actionType },
                { key: "target", header: t("target"), render: (row) => row.targetCode },
                { key: "description", header: t("description"), render: (row) => row.description },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function RecordOverridesPage() {
  const { t } = useTranslation(["records", "errors"]);
  const query = useRecordOverrides();
  const decide = useDecideOverride();
  const { setNotice, view } = useNotice();
  function send(id: number, action: "grant" | "refuse", note: string) {
    decide.mutate(
      { id, action, note },
      { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
    );
  }
  return (
    <>
      <PageHeader title={t("overrideTitle")} description={t("overrideHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardHeader title={t("overrideTitle")} />
            <Table
              columns={[
                { key: "kind", header: t("kind"), render: (row) => word(t, row.kind) },
                { key: "place", header: t("section"), render: (row) => `${row.gradeLevel}${row.section} ${row.academicYear}` },
                { key: "reason", header: t("reason"), render: (row) => row.reason },
                { key: "status", header: t("status"), render: (row) => <Badge tone={REQUEST_TONE[row.status]}>{word(t, row.status)}</Badge> },
                {
                  key: "action",
                  header: t("action"),
                  render: (row) =>
                    row.status === "Pending" ? <OverrideForm onSend={(action, note) => send(row.id, action, note)} /> : row.principalNote || "—",
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

function OverrideForm({ onSend }: { onSend: (action: "grant" | "refuse", note: string) => void }) {
  const { t } = useTranslation("records");
  return (
    <form
      className="flex min-w-56 flex-col gap-2"
      onSubmit={(event) => {
        const data = readForm(event);
        onSend("grant", textOf(data, "note"));
      }}
    >
      <Input label={t("note")} name="note" required maxLength={500} />
      <div className="flex gap-2">
        <Button type="submit">{t("grant")}</Button>
        <Button
          type="button"
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (!form) return;
            const note = textOf(new FormData(form), "note");
            if (note.length < 3) return;
            onSend("refuse", note);
          }}
        >
          {t("refuse")}
        </Button>
      </div>
    </form>
  );
}

export function VerifyPage() {
  const { t } = useTranslation(["records", "errors"]);
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState("");
  const query = useVerifyCode(code);
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader title={t("verifyTitle")} description={t("verifyHelp")} />
        <CardBody>
          <form
            className="mb-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setCode(draft.trim());
            }}
          >
            <Input label={t("code")} value={draft} onChange={(event) => setDraft(event.target.value)} required />
            <Button type="submit">{t("check")}</Button>
          </form>
          {query.isError ? <Alert tone="danger">{t("verifyMissing")}</Alert> : null}
          {query.data ? (
            <div className="rounded-card border border-success/30 bg-success/10 p-4">
              <p className="font-semibold text-ink-strong">{t("verifyValid")}</p>
              <p className="mt-2 text-sm">{t("school")}: {query.data.school}</p>
              <p className="text-sm">{t("student")}: {query.data.student}</p>
              <p className="text-sm">{t("kind")}: {word(t, query.data.kind)}</p>
              <p className="text-sm">{t("year")}: {query.data.academicYear}</p>
              <p className="text-sm">{t("issued")}: {query.data.issuedOn}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </main>
  );
}

