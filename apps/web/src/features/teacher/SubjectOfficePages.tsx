import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, Library, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { OpacPanel } from "@/features/library/OpacPanel";
import { toErrorKey } from "@/lib/apiError";
import {
  useAddCover,
  useAddQuestion,
  useAttendanceBoard,
  useCancelCover,
  useClosePaper,
  useGeneratePaper,
  useIncidentAction,
  useIncidents,
  useLeave,
  useLeaveAction,
  useLibrary,
  useMarkParticipation,
  useParticipation,
  useQuestions,
  useRecommendBook,
  useReportIncident,
  useRequestLeave,
  useSwapPeriods,
  useSyncAttendance,
  useTimetable,
  type AttendanceGroup,
} from "./api/useTeacherOffice";

const QUEUE_KEY = "keyt.attendance.queue";

type QueuedMark = {
  studentId: number;
  subjectId: number;
  date: string;
  status: "P" | "A" | "T";
  label: string;
};

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

function whole(data: FormData, name: string): number {
  return Number(textOf(data, name));
}

function readQueue(): QueuedMark[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as QueuedMark[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(rows: QueuedMark[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(rows));
}

function markKey(row: { studentId: number; subjectId: number; date: string }): string {
  return `${row.studentId}|${row.subjectId}|${row.date}`;
}

const STATUS_KEY = { P: "present", A: "absent", T: "tardy" } as const;

export function OfflineAttendancePage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useAttendanceBoard();
  const sync = useSyncAttendance();
  const { setNotice, view } = useNotice();
  const [queue, setQueue] = useState<QueuedMark[]>(() => readQueue());
  const [online, setOnline] = useState(() => navigator.onLine);
  const [groupKey, setGroupKey] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function push(next: QueuedMark[]) {
    writeQueue(next);
    setQueue(next);
  }

  function runSync(rows: QueuedMark[]) {
    if (rows.length === 0 || !navigator.onLine) return;
    sync.mutate(
      rows.map((row) => ({ studentId: row.studentId, subjectId: row.subjectId, date: row.date, status: row.status })),
      {
        onSuccess: (result) => {
          const blocked = new Set(result.conflicts.map(markKey));
          push(rows.filter((row) => blocked.has(markKey(row))));
          setNotice({
            tone: result.conflicts.length > 0 ? "danger" : "success",
            text: `${t("synced", { count: result.synced })} ${t("conflicts", { count: result.conflicts.length })}`,
          });
        },
        onError: (error) => fail(setNotice, t, error),
      },
    );
  }

  const syncRef = useRef(runSync);
  useEffect(() => {
    syncRef.current = runSync;
  });

  useEffect(() => {
    function onlineNow() {
      setOnline(true);
      syncRef.current(readQueue());
    }
    function offlineNow() {
      setOnline(false);
    }
    window.addEventListener("online", onlineNow);
    window.addEventListener("offline", offlineNow);
    return () => {
      window.removeEventListener("online", onlineNow);
      window.removeEventListener("offline", offlineNow);
    };
  }, []);

  return (
    <>
      <PageHeader title={t("offlineTitle")} description={t("offlineHelp")} />
      {view}
      <Panel query={query}>
        {(data) => {
          const groups = data.groups;
          const selected = groups.find((row) => groupValue(row) === groupKey) ?? groups[0];
          return (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label={t("queue")} value={String(queue.length)} icon={Wifi} />
                <StatCard label={online ? t("online") : t("offline")} value={online ? t("online") : t("offline")} icon={Wifi} tone={online ? "success" : "danger"} />
                <StatCard label={t("classGroup")} value={String(groups.length)} icon={Wifi} />
              </div>
              <Card>
                <CardHeader title={t("classGroup")} />
                <CardBody className="grid gap-3">
                  <Select
                    label={t("classGroup")}
                    value={selected ? groupValue(selected) : ""}
                    onChange={(event) => setGroupKey(event.target.value)}
                    options={groups.map((row) => ({ value: groupValue(row), label: `${row.classLabel} · ${row.subject}` }))}
                  />
                  <Input label={t("date")} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                  <Button loading={sync.isPending} onClick={() => runSync(queue)}>{t("sync")}</Button>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={selected ? `${selected.classLabel} · ${selected.subject}` : t("student")} />
                <Table
                  columns={[
                    { key: "name", header: t("student"), render: (row) => row.name },
                    {
                      key: "mark",
                      header: t("mark"),
                      render: (row) => (
                        <div className="flex flex-wrap gap-2">
                          {(["P", "A", "T"] as const).map((status) => (
                            <Button
                              key={status}
                              variant="secondary"
                              onClick={() => {
                                if (!selected) return;
                                const next = queue.filter((item) => markKey(item) !== markKey({ studentId: row.id, subjectId: selected.subjectId, date }));
                                push([...next, { studentId: row.id, subjectId: selected.subjectId, date, status, label: `${row.name} · ${selected.subject}` }]);
                              }}
                            >
                              {t(STATUS_KEY[status])}
                            </Button>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                  rows={selected?.students ?? []}
                  rowKey={(row) => row.id}
                  empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
                />
              </Card>
              <Card>
                <CardHeader title={t("queue")} />
                <Table
                  columns={[
                    { key: "label", header: t("student"), render: (row) => row.label },
                    { key: "date", header: t("date"), render: (row) => row.date },
                    { key: "status", header: t("status"), render: (row) => t(STATUS_KEY[row.status]) },
                  ]}
                  rows={queue}
                  rowKey={(row) => markKey(row)}
                  empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
                />
              </Card>
            </div>
          );
        }}
      </Panel>
    </>
  );
}

function groupValue(row: AttendanceGroup): string {
  return `${row.subjectId}|${row.classLabel}`;
}

export function TimetablePage() {
  const { t } = useTranslation(["office", "errors", "teacher"]);
  const query = useTimetable();
  const swap = useSwapPeriods();
  const cover = useAddCover();
  const cancel = useCancelCover();
  const { setNotice, view } = useNotice();

  return (
    <>
      <PageHeader title={t("timetableTitle")} description={t("timetableHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label={t("myPeriods")} value={String(data.mine.length)} icon={CalendarDays} />
              <StatCard label={t("covers")} value={String(data.substitutions.length)} icon={CalendarDays} />
            </div>
            <Card>
              <CardHeader title={t("swap")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    swap.mutate(
                      { leftId: whole(form, "leftId"), rightId: whole(form, "rightId") },
                      { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                    );
                  }}
                >
                  <Select name="leftId" label={t("mySlot")} placeholder={t("choose")} options={data.mine.map(slotOption)} required />
                  <Select name="rightId" label={t("otherSlot")} placeholder={t("choose")} options={data.school.map(slotOption)} required />
                  <Button type="submit" loading={swap.isPending}>{t("swap")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("cover")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    cover.mutate(
                      {
                        timetableId: whole(form, "timetableId"),
                        coverDate: textOf(form, "coverDate"),
                        substituteStaffId: whole(form, "substituteStaffId"),
                        reason: textOf(form, "reason"),
                      },
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
                  <Select name="timetableId" label={t("mySlot")} placeholder={t("choose")} options={data.mine.map(slotOption)} required />
                  <Input name="coverDate" type="date" label={t("date")} required />
                  <Select name="substituteStaffId" label={t("substitute")} placeholder={t("choose")} options={data.teachers.map((row) => ({ value: String(row.id), label: row.name }))} required />
                  <Input name="reason" label={t("reason")} />
                  <Button type="submit" loading={cover.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("covers")} />
              <Table
                columns={[
                  { key: "date", header: t("date"), render: (row) => row.coverDate },
                  { key: "name", header: t("substitute"), render: (row) => row.substituteName },
                  { key: "reason", header: t("reason"), render: (row) => row.reason },
                  {
                    key: "cancel",
                    header: "",
                    render: (row) => (
                      <Button variant="secondary" loading={cancel.isPending} onClick={() => cancel.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>
                        {t("cancelCover")}
                      </Button>
                    ),
                  },
                ]}
                rows={data.substitutions}
                rowKey={(row) => row.id}
                empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
              />
            </Card>
            <Card>
              <CardHeader title={t("schoolPeriods")} />
              <SlotTable rows={data.school} />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

function slotOption(row: { id: number; day: string; period: number; classLabel: string; subject: string; teacherName: string }) {
  return { value: String(row.id), label: `${row.day} ${row.period} · ${row.classLabel} · ${row.subject} · ${row.teacherName}` };
}

function SlotTable({ rows }: { rows: { id: number; day: string; period: number; start: string; end: string; classLabel: string; subject: string; teacherName: string }[] }) {
  const { t } = useTranslation("office");
  return (
    <Table
      columns={[
        { key: "day", header: t("day"), render: (row) => row.day },
        { key: "period", header: t("period"), render: (row) => row.period },
        { key: "time", header: t("time"), render: (row) => `${row.start}–${row.end}` },
        { key: "class", header: t("classGroup"), render: (row) => row.classLabel },
        { key: "subject", header: t("subject"), render: (row) => row.subject },
        { key: "teacher", header: t("teacher"), render: (row) => row.teacherName },
      ]}
      rows={rows}
      rowKey={(row) => row.id}
      empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
    />
  );
}

export function IncidentsPage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useIncidents();
  const save = useReportIncident();
  const act = useIncidentAction();
  const roster = useAttendanceBoard();
  const { setNotice, view } = useNotice();
  const students = roster.data?.groups.flatMap((group) => group.students.map((student) => ({ ...student, subjectId: group.subjectId, label: `${student.name} · ${group.subject}` }))) ?? [];

  return (
    <>
      <PageHeader title={t("incidentTitle")} description={t("incidentHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("report")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    const [subjectText, studentText] = textOf(form, "pair").split(":");
                    save.mutate(
                      {
                        studentId: Number(studentText),
                        subjectId: Number(subjectText),
                        category: textOf(form, "category") as "attendance" | "academic" | "behavior" | "safety",
                        summary: textOf(form, "summary"),
                      },
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
                    name="pair"
                    label={t("student")}
                    placeholder={t("choose")}
                    options={students.map((row) => ({ value: `${row.subjectId}:${row.id}`, label: row.label }))}
                    required
                  />
                  <Select
                    name="category"
                    label={t("category")}
                    options={(["attendance", "academic", "behavior", "safety"] as const).map((value) => ({ value, label: t(value) }))}
                    required
                  />
                  <div className="md:col-span-2">
                    <Input name="summary" label={t("summary")} required />
                  </div>
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <IncidentTable title={t("mine")} rows={data.mine} actionLabel={t("close")} onAct={(id) => act.mutate({ id, action: "close" }, { onError: (error) => fail(setNotice, t, error) })} pending={act.isPending} />
            <IncidentTable title={t("inbox")} rows={data.inbox} actionLabel={t("acknowledge")} onAct={(id) => act.mutate({ id, action: "acknowledge" }, { onError: (error) => fail(setNotice, t, error) })} pending={act.isPending} />
          </div>
        )}
      </Panel>
    </>
  );
}

function IncidentTable({
  title,
  rows,
  actionLabel,
  onAct,
  pending,
}: {
  title: string;
  rows: { id: number; studentName: string; subject: string; category: string; summary: string; status: string }[];
  actionLabel: string;
  onAct: (id: number) => void;
  pending: boolean;
}) {
  const { t } = useTranslation("office");
  return (
    <Card>
      <CardHeader title={title} />
      <Table
        columns={[
          { key: "student", header: t("student"), render: (row) => row.studentName },
          { key: "subject", header: t("subject"), render: (row) => row.subject },
          { key: "category", header: t("category"), render: (row) => t(row.category as "attendance") },
          { key: "summary", header: t("summary"), render: (row) => row.summary },
          { key: "status", header: t("status"), render: (row) => <Badge>{t(row.status === "Open" ? "open" : row.status === "Acknowledged" ? "acknowledged" : "closed")}</Badge> },
          { key: "act", header: "", render: (row) => <Button variant="secondary" loading={pending} onClick={() => onAct(row.id)}>{actionLabel}</Button> },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
        empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
      />
    </Card>
  );
}

export function LeavePage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useLeave();
  const save = useRequestLeave();
  const act = useLeaveAction();
  const { setNotice, view } = useNotice();

  return (
    <>
      <PageHeader title={t("leaveTitle")} description={t("leaveHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("leaveTitle")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      { kind: textOf(form, "kind") as "sick" | "personal" | "annual", startsOn: textOf(form, "startsOn"), endsOn: textOf(form, "endsOn"), reason: textOf(form, "reason") },
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
                  <Select name="kind" label={t("kind")} options={(["sick", "personal", "annual"] as const).map((value) => ({ value, label: t(value) }))} required />
                  <Input name="startsOn" type="date" label={t("starts")} required />
                  <Input name="endsOn" type="date" label={t("ends")} required />
                  <Input name="reason" label={t("reason")} required />
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <LeaveTable title={t("myLeave")} rows={data.mine} action={data.mine.some((row) => row.status === "Pending") ? "withdraw" : null} act={act} setNotice={setNotice} t={t} />
            <LeaveTable title={t("leaveInbox")} rows={data.inbox} action="decide" act={act} setNotice={setNotice} t={t} />
          </div>
        )}
      </Panel>
    </>
  );
}

function LeaveTable({
  title,
  rows,
  action,
  act,
  setNotice,
  t,
}: {
  title: string;
  rows: { id: number; teacherName?: string; kind: string; startsOn: string; endsOn: string; reason: string; status: string }[];
  action: "withdraw" | "decide" | null;
  act: ReturnType<typeof useLeaveAction>;
  setNotice: (value: { tone: "success" | "danger"; text: string }) => void;
  t: (key: "errors:server") => string;
}) {
  const labels = useTranslation("office").t;
  return (
    <Card>
      <CardHeader title={title} />
      <Table
        columns={[
          { key: "teacher", header: labels("teacher"), render: (row) => row.teacherName ?? "" },
          { key: "kind", header: labels("kind"), render: (row) => labels(row.kind as "sick") },
          { key: "when", header: labels("date"), render: (row) => `${row.startsOn} – ${row.endsOn}` },
          { key: "reason", header: labels("reason"), render: (row) => row.reason },
          { key: "status", header: labels("status"), render: (row) => <Badge>{labels(row.status.toLowerCase() as "pending")}</Badge> },
          {
            key: "act",
            header: "",
            render: (row) =>
              row.status !== "Pending" || !action ? null : action === "withdraw" ? (
                <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate({ id: row.id, action: "withdraw" }, { onError: (error) => fail(setNotice, t, error) })}>
                  {labels("withdraw")}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate({ id: row.id, action: "approve" }, { onError: (error) => fail(setNotice, t, error) })}>{labels("approve")}</Button>
                  <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate({ id: row.id, action: "reject" }, { onError: (error) => fail(setNotice, t, error) })}>{labels("reject")}</Button>
                </div>
              ),
          },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
        empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{labels("empty")}</p>}
      />
    </Card>
  );
}

export function LibraryPage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useLibrary();
  const save = useRecommendBook();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("libraryTitle")} description={t("libraryHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <StatCard label={t("borrowed")} value={String(data.borrowed.length)} icon={Library} />
            <Card>
              <CardHeader title={t("recommend")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      { subjectId: whole(form, "subjectId"), title: textOf(form, "title"), author: textOf(form, "author"), reason: textOf(form, "reason") },
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
                  <Select name="subjectId" label={t("subject")} placeholder={t("choose")} options={data.subjects.map((row) => ({ value: String(row.id), label: row.name }))} required />
                  <Input name="title" label={t("title")} required />
                  <Input name="author" label={t("author")} />
                  <Input name="reason" label={t("reason")} required />
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("borrowed")} />
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "author", header: t("author"), render: (row) => row.author },
                  { key: "date", header: t("date"), render: (row) => row.borrowDate ?? "" },
                ]}
                rows={data.borrowed}
                rowKey={(row) => row.id}
                empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
              />
            </Card>
            <Card>
              <CardHeader title={t("recommendations")} />
              <Table
                columns={[
                  { key: "subject", header: t("subject"), render: (row) => row.subject },
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "reason", header: t("reason"), render: (row) => row.reason },
                ]}
                rows={data.recommendations}
                rowKey={(row) => row.id}
                empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
              />
            </Card>
            <OpacPanel />
          </div>
        )}
      </Panel>
    </>
  );
}

export function QuestionBankPage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useQuestions();
  const save = useAddQuestion();
  const generate = useGeneratePaper();
  const close = useClosePaper();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("questionTitle")} description={t("questionHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label={t("questions")} value={String(data.questions.length)} icon={BookOpen} />
              <StatCard label={t("papers")} value={String(data.papers.length)} icon={BookOpen} />
            </div>
            <Card>
              <CardHeader title={t("addQuestion")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      {
                        subjectId: whole(form, "subjectId"),
                        topic: textOf(form, "topic"),
                        stem: textOf(form, "stem"),
                        optionA: textOf(form, "optionA"),
                        optionB: textOf(form, "optionB"),
                        optionC: textOf(form, "optionC"),
                        optionD: textOf(form, "optionD"),
                        correct: textOf(form, "correct"),
                        points: whole(form, "points"),
                      },
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
                  <Select name="subjectId" label={t("subject")} placeholder={t("choose")} options={data.subjects.map((row) => ({ value: String(row.id), label: row.name }))} required />
                  <Input name="topic" label={t("topic")} required />
                  <div className="md:col-span-2"><Input name="stem" label={t("stem")} required /></div>
                  <Input name="optionA" label={t("optionA")} required />
                  <Input name="optionB" label={t("optionB")} required />
                  <Input name="optionC" label={t("optionC")} required />
                  <Input name="optionD" label={t("optionD")} required />
                  <Select name="correct" label={t("correct")} options={["A", "B", "C", "D"].map((value) => ({ value, label: value }))} required />
                  <Input name="points" type="number" min={1} max={10} defaultValue={1} label={t("points")} required />
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("generate")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    generate.mutate(
                      { subjectId: whole(form, "subjectId"), title: textOf(form, "title"), count: whole(form, "count") },
                      {
                        onSuccess: () => setNotice({ tone: "success", text: t("saved") }),
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Select name="subjectId" label={t("subject")} placeholder={t("choose")} options={data.subjects.map((row) => ({ value: String(row.id), label: row.name }))} required />
                  <Input name="title" label={t("paperTitle")} required />
                  <Input name="count" type="number" min={1} max={50} defaultValue={1} label={t("count")} required />
                  <Button type="submit" loading={generate.isPending}>{t("generate")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("papers")} />
              <Table
                columns={[
                  { key: "title", header: t("paperTitle"), render: (row) => row.title },
                  { key: "subject", header: t("subject"), render: (row) => row.subject },
                  { key: "count", header: t("count"), render: (row) => row.count },
                  { key: "status", header: t("status"), render: (row) => <Badge tone={row.status === "Open" ? "success" : "neutral"}>{t(row.status === "Open" ? "open" : "closed")}</Badge> },
                  {
                    key: "close",
                    header: "",
                    render: (row) => row.status === "Open" ? (
                      <Button variant="secondary" loading={close.isPending} onClick={() => close.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>{t("closePaper")}</Button>
                    ) : null,
                  },
                ]}
                rows={data.papers}
                rowKey={(row) => row.id}
                empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function ParticipationPage() {
  const { t } = useTranslation(["office", "errors"]);
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const query = useParticipation(subjectId, date);
  const mark = useMarkParticipation();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("participationTitle")} description={t("participationHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-3"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    setSubjectId(textOf(form, "subjectId"));
                    setDate(textOf(form, "date"));
                  }}
                >
                  <Select name="subjectId" label={t("subject")} placeholder={t("choose")} defaultValue={subjectId} options={data.subjects.map((row) => ({ value: String(row.id), label: row.name }))} required />
                  <Input name="date" type="date" label={t("date")} defaultValue={date || data.date} required />
                  <Button type="submit">{t("show")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("participationTitle")} />
              <Table
                columns={[
                  { key: "name", header: t("student"), render: (row) => row.name },
                  { key: "marked", header: t("status"), render: (row) => row.marked ? <Badge tone="success">{t("marked")}</Badge> : "" },
                  {
                    key: "act",
                    header: "",
                    render: (row) => (
                      <Button
                        variant="secondary"
                        loading={mark.isPending}
                        onClick={() =>
                          mark.mutate(
                            { studentId: row.id, subjectId: Number(subjectId), markedOn: data.date },
                            { onError: (error) => fail(setNotice, t, error) },
                          )
                        }
                      >
                        {t("mark")}
                      </Button>
                    ),
                  },
                ]}
                rows={data.students}
                rowKey={(row) => row.id}
                empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}
