import { useState } from "react";
import { ClipboardCheck, Scale, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { toErrorKey } from "@/lib/apiError";
import {
  useBehavior,
  useCloseReferral,
  useHearingOutcome,
  useInvigilation,
  useManualDuty,
  usePrepareDay,
  usePlaceStudent,
  usePlacementStatus,
  useProgramStatus,
  useRemoveDuty,
  useSavePenalty,
  useSaveProgram,
  useSaveReferral,
  useSaveSession,
  useScheduleHearing,
  useVocational,
  type ReferralRow,
} from "./api/useVice";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

function whole(data: FormData, name: string): number {
  return Number(textOf(data, name));
}

const PLACEMENT_KEY = {
  Applied: "applied",
  Placed: "placed",
  Completed: "completed",
  Withdrawn: "withdrawn",
} as const;

const CASE_KEY = {
  Escalated: "escalated",
  Hearing: "hearing",
  Decided: "decided",
  Closed: "caseClosed",
} as const;

export function VocationalPage() {
  const { t } = useTranslation(["vice", "errors"]);
  const query = useVocational();
  const save = useSaveProgram();
  const status = useProgramStatus();
  const place = usePlaceStudent();
  const placementStatus = usePlacementStatus();
  const { setNotice, view } = useNotice();

  return (
    <>
      <PageHeader title={t("vocationalTitle")} description={t("vocationalHelp")} />
      {view}
      <Panel query={query}>
        {(data) => {
          const openSeats = data.programs.reduce((sum, row) => sum + Math.max(0, row.capacity - row.filled), 0);
          return (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label={t("programCount")} value={String(data.programs.length)} icon={Wrench} />
                <StatCard label={t("openSeats")} value={String(openSeats)} icon={Wrench} tone="success" />
                <StatCard label={t("placementCount")} value={String(data.placements.length)} icon={Wrench} />
              </div>
              <Card>
                <CardHeader title={t("programForm")} />
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      const grade = textOf(form, "gradeLevel");
                      save.mutate(
                        {
                          name: textOf(form, "name"),
                          trade: textOf(form, "trade"),
                          gradeLevel: grade ? Number(grade) : null,
                          capacity: whole(form, "capacity"),
                          description: textOf(form, "description"),
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
                    <Input name="name" label={t("programName")} required />
                    <Input name="trade" label={t("trade")} required />
                    <Select
                      name="gradeLevel"
                      label={t("gradeLevel")}
                      placeholder={t("anyGrade")}
                      options={[9, 10, 11, 12].map((grade) => ({ value: String(grade), label: String(grade) }))}
                    />
                    <Input name="capacity" type="number" min={1} max={200} label={t("capacity")} required defaultValue={20} />
                    <div className="md:col-span-2">
                      <Input name="description" label={t("description")} required />
                    </div>
                    <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                  </form>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={t("programs")} />
                <Table
                  columns={[
                    { key: "name", header: t("programName"), render: (row) => row.name },
                    { key: "trade", header: t("trade"), render: (row) => row.trade },
                    { key: "grade", header: t("gradeLevel"), render: (row) => row.gradeLevel ?? t("anyGrade") },
                    { key: "filled", header: t("filled"), render: (row) => `${row.filled}/${row.capacity}` },
                    {
                      key: "status",
                      header: t("status"),
                      render: (row) => <Badge tone={row.status === "Open" ? "success" : "neutral"}>{t(row.status === "Open" ? "open" : "closed")}</Badge>,
                    },
                    {
                      key: "set",
                      header: "",
                      render: (row) => (
                        <Button
                          variant="secondary"
                          loading={status.isPending}
                          onClick={() =>
                            status.mutate(
                              { id: row.id, status: row.status === "Open" ? "Closed" : "Open" },
                              { onError: (error) => fail(setNotice, t, error) },
                            )
                          }
                        >
                          {row.status === "Open" ? t("closeProgram") : t("reopenProgram")}
                        </Button>
                      ),
                    },
                  ]}
                  rows={data.programs}
                  rowKey={(row) => row.id}
                  empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
                />
              </Card>
              <Card>
                <CardHeader title={t("placeForm")} />
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      place.mutate(
                        { programId: whole(form, "programId"), studentId: whole(form, "studentId"), note: textOf(form, "note") },
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
                      name="programId"
                      label={t("program")}
                      placeholder={t("choose")}
                      required
                      options={data.programs.filter((row) => row.status === "Open").map((row) => ({ value: String(row.id), label: row.name }))}
                    />
                    <Select
                      name="studentId"
                      label={t("student")}
                      placeholder={t("choose")}
                      required
                      options={data.students.map((row) => ({ value: String(row.id), label: `${row.name} · ${row.gradeLevel}${row.section ? row.section : ""}` }))}
                    />
                    <div className="md:col-span-2">
                      <Input name="note" label={t("note")} />
                    </div>
                    <Button type="submit" loading={place.isPending}>{t("save")}</Button>
                  </form>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={t("placements")} />
                <Table
                  columns={[
                    { key: "student", header: t("student"), render: (row) => row.studentName },
                    { key: "program", header: t("program"), render: (row) => row.programName },
                    { key: "status", header: t("status"), render: (row) => <Badge tone="brand">{t(PLACEMENT_KEY[row.status])}</Badge> },
                    {
                      key: "set",
                      header: "",
                      render: (row) => (
                        <div className="flex flex-wrap gap-2">
                          {row.status === "Applied" ? (
                            <Button variant="secondary" onClick={() => placementStatus.mutate({ id: row.id, status: "Placed" }, { onError: (error) => fail(setNotice, t, error) })}>
                              {t("markPlaced")}
                            </Button>
                          ) : null}
                          {row.status === "Placed" ? (
                            <Button variant="secondary" onClick={() => placementStatus.mutate({ id: row.id, status: "Completed" }, { onError: (error) => fail(setNotice, t, error) })}>
                              {t("markCompleted")}
                            </Button>
                          ) : null}
                          {row.status === "Applied" || row.status === "Placed" ? (
                            <Button variant="ghost" onClick={() => placementStatus.mutate({ id: row.id, status: "Withdrawn" }, { onError: (error) => fail(setNotice, t, error) })}>
                              {t("withdraw")}
                            </Button>
                          ) : null}
                        </div>
                      ),
                    },
                  ]}
                  rows={data.placements}
                  rowKey={(row) => row.id}
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

export function BehaviorPage() {
  const { t } = useTranslation(["vice", "errors"]);
  const query = useBehavior();
  const save = useSaveReferral();
  const hearing = useScheduleHearing();
  const outcome = useHearingOutcome();
  const penalty = useSavePenalty();
  const close = useCloseReferral();
  const { setNotice, view } = useNotice();
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <>
      <PageHeader title={t("behaviorTitle")} description={t("behaviorHelp")} />
      {view}
      <Panel query={query}>
        {(data) => {
          const current = data.referrals.find((row) => row.id === picked) ?? data.referrals[0] ?? null;
          return (
            <div className="grid gap-4">
              <StatCard label={t("openCases")} value={String(data.openCount)} icon={Scale} />
              <Card>
                <CardHeader title={t("referralForm")} />
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      save.mutate(
                        {
                          studentId: whole(form, "studentId"),
                          category: textOf(form, "category") as ReferralRow["category"],
                          severity: textOf(form, "severity") as ReferralRow["severity"],
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
                    <Select name="studentId" label={t("student")} placeholder={t("choose")} required options={data.students.map((row) => ({ value: String(row.id), label: row.name }))} />
                    <Select
                      name="category"
                      label={t("category")}
                      options={[
                        { value: "attendance", label: t("attendance") },
                        { value: "misconduct", label: t("misconduct") },
                        { value: "academic", label: t("academic") },
                        { value: "safety", label: t("safety") },
                      ]}
                    />
                    <Select
                      name="severity"
                      label={t("severity")}
                      options={[
                        { value: "low", label: t("low") },
                        { value: "medium", label: t("medium") },
                        { value: "high", label: t("high") },
                      ]}
                    />
                    <div className="md:col-span-2">
                      <Input name="summary" label={t("summary")} required />
                    </div>
                    <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                  </form>
                </CardBody>
              </Card>
              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <Card>
                  <CardHeader title={t("cases")} />
                  <div className="grid">
                    {data.referrals.length === 0 ? <p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p> : null}
                    {data.referrals.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className={`border-b border-border px-4 py-3 text-left last:border-b-0 ${current?.id === row.id ? "bg-brand-50" : "bg-surface"}`}
                        onClick={() => setPicked(row.id)}
                      >
                        <span className="block font-semibold text-ink-strong">{row.studentName}</span>
                        <span className="mt-1 flex flex-wrap gap-2">
                          <Badge tone={row.severity === "high" ? "danger" : row.severity === "medium" ? "warning" : "neutral"}>{t(row.severity)}</Badge>
                          <Badge>{t(CASE_KEY[row.status])}</Badge>
                        </span>
                      </button>
                    ))}
                  </div>
                </Card>
                {current ? (
                  <div className="grid gap-4">
                    <Card>
                      <CardHeader
                        title={current.studentName}
                        description={current.summary}
                        actions={
                          current.status === "Closed" ? null : (
                            <Button variant="secondary" loading={close.isPending} onClick={() => close.mutate(current.id, { onError: (error) => fail(setNotice, t, error) })}>
                              {t("closeCase")}
                            </Button>
                          )
                        }
                      />
                      <CardBody>
                        <p className="text-sm text-ink-muted">{t(current.category)} · {t(CASE_KEY[current.status])}</p>
                      </CardBody>
                    </Card>
                    {current.status === "Escalated" || current.status === "Hearing" ? (
                      <Card>
                        <CardHeader title={t("hearingForm")} />
                        <CardBody>
                          <form
                            className="grid gap-3 md:grid-cols-2"
                            onSubmit={(event) => {
                              const form = readForm(event);
                              hearing.mutate(
                                { referralId: current.id, heldOn: textOf(form, "heldOn"), committee: textOf(form, "committee"), minutes: textOf(form, "minutes") },
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
                            <Input name="heldOn" type="date" label={t("heldOn")} required />
                            <Input name="committee" label={t("committee")} required />
                            <div className="md:col-span-2">
                              <Input name="minutes" label={t("minutes")} />
                            </div>
                            <Button type="submit" loading={hearing.isPending}>{t("save")}</Button>
                          </form>
                        </CardBody>
                      </Card>
                    ) : null}
                    <Card>
                      <CardHeader title={t("hearings")} />
                      <Table
                        columns={[
                          { key: "date", header: t("heldOn"), render: (row) => row.heldOn },
                          { key: "committee", header: t("committee"), render: (row) => row.committee },
                          { key: "outcome", header: t("outcome"), render: (row) => t(row.outcome === "Pending" ? "pending" : row.outcome === "Upheld" ? "upheld" : row.outcome === "Dismissed" ? "dismissed" : "reduced") },
                          {
                            key: "set",
                            header: "",
                            render: (row) => (
                              <form
                                className="flex flex-wrap items-end gap-2"
                                onSubmit={(event) => {
                                  const form = readForm(event);
                                  outcome.mutate(
                                    { id: row.id, outcome: textOf(form, "outcome") as ReferralRow["hearings"][number]["outcome"], minutes: row.minutes },
                                    { onError: (error) => fail(setNotice, t, error) },
                                  );
                                }}
                              >
                                <Select
                                  name="outcome"
                                  label={t("outcome")}
                                  defaultValue={row.outcome}
                                  options={[
                                    { value: "Pending", label: t("pending") },
                                    { value: "Upheld", label: t("upheld") },
                                    { value: "Dismissed", label: t("dismissed") },
                                    { value: "Reduced", label: t("reduced") },
                                  ]}
                                />
                                <Button type="submit" variant="secondary" loading={outcome.isPending}>{t("saveOutcome")}</Button>
                              </form>
                            ),
                          },
                        ]}
                        rows={current.hearings}
                        rowKey={(row) => row.id}
                        empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
                      />
                    </Card>
                    {current.status !== "Closed" ? (
                      <Card>
                        <CardHeader title={t("penaltyForm")} />
                        <CardBody>
                          <form
                            className="grid gap-3 md:grid-cols-2"
                            onSubmit={(event) => {
                              const form = readForm(event);
                              penalty.mutate(
                                {
                                  referralId: current.id,
                                  kind: textOf(form, "kind") as ReferralRow["penalties"][number]["kind"],
                                  days: whole(form, "days"),
                                  startsOn: textOf(form, "startsOn"),
                                  note: textOf(form, "note"),
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
                              name="kind"
                              label={t("kind")}
                              options={[
                                { value: "warning", label: t("warning") },
                                { value: "detention", label: t("detention") },
                                { value: "suspension", label: t("suspension") },
                                { value: "community", label: t("community") },
                              ]}
                            />
                            <Input name="days" type="number" min={0} max={90} label={t("days")} required defaultValue={0} />
                            <Input name="startsOn" type="date" label={t("startsOn")} required />
                            <Input name="note" label={t("note")} />
                            <Button type="submit" loading={penalty.isPending}>{t("save")}</Button>
                          </form>
                        </CardBody>
                      </Card>
                    ) : null}
                    <Card>
                      <CardHeader title={t("penalties")} />
                      <Table
                        columns={[
                          { key: "kind", header: t("kind"), render: (row) => t(row.kind) },
                          { key: "days", header: t("days"), render: (row) => String(row.days) },
                          { key: "starts", header: t("startsOn"), render: (row) => row.startsOn },
                          { key: "note", header: t("note"), render: (row) => row.note },
                        ]}
                        rows={current.penalties}
                        rowKey={(row) => row.id}
                        empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
                      />
                    </Card>
                  </div>
                ) : null}
              </div>
            </div>
          );
        }}
      </Panel>
    </>
  );
}

function gapCount(gaps: { missing: number }[]): number {
  return gaps.reduce((sum, row) => sum + row.missing, 0);
}

export function InvigilationPage() {
  const { t } = useTranslation(["vice", "errors"]);
  const query = useInvigilation();
  const save = useSaveSession();
  const prepare = usePrepareDay();
  const manual = useManualDuty();
  const remove = useRemoveDuty();
  const { setNotice, view } = useNotice();

  return (
    <>
      <PageHeader title={t("invigilationTitle")} description={t("invigilationHelp")} />
      {view}
      <Panel query={query}>
        {(data) => {
          const filled = data.sessions.reduce((sum, row) => sum + row.duties.length, 0);
          const open = data.sessions.reduce((sum, row) => sum + Math.max(0, row.needed - row.duties.length), 0);
          return (
            <div className="grid gap-4">
              <Card>
                <CardHeader title={t("prepareDay")} />
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      prepare.mutate(textOf(form, "examDate"), {
                        onSuccess: (result) => {
                          const gaps = gapCount(result.gaps);
                          if (result.sittings === 0) setNotice({ tone: "danger", text: t("noClasses") });
                          else if (gaps > 0) setNotice({ tone: "danger", text: t("gapsLeft", { count: gaps }) });
                          else if (result.assigned === 0) setNotice({ tone: "success", text: t("alreadySet") });
                          else setNotice({ tone: "success", text: t("prepared", { sittings: result.sittings, assigned: result.assigned }) });
                        },
                        onError: (error) => fail(setNotice, t, error),
                      });
                    }}
                  >
                    <Input name="examDate" type="date" label={t("examDay")} required />
                    <div className="flex items-end">
                      <Button type="submit" loading={prepare.isPending}>{t("prepareDay")}</Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label={t("sessionCount")} value={String(data.sessions.length)} icon={ClipboardCheck} />
                <StatCard label={t("filledSeats")} value={String(filled)} icon={ClipboardCheck} tone="success" />
                <StatCard label={t("openDuty")} value={String(open)} icon={ClipboardCheck} tone={open > 0 ? "danger" : "success"} />
              </div>
              <Card>
                <CardHeader title={t("sessionForm")} />
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      save.mutate(
                        {
                          title: textOf(form, "title"),
                          room: textOf(form, "room"),
                          examDate: textOf(form, "examDate"),
                          startTime: textOf(form, "startTime"),
                          endTime: textOf(form, "endTime"),
                          gradeLevel: whole(form, "gradeLevel"),
                          section: textOf(form, "section"),
                          needed: whole(form, "needed"),
                        },
                        {
                          onSuccess: (result) => {
                            const gaps = gapCount(result.gaps);
                            setNotice({
                              tone: gaps > 0 ? "danger" : "success",
                              text: gaps > 0 ? t("gapsLeft", { count: gaps }) : t("assigned"),
                            });
                            event.currentTarget.reset();
                          },
                          onError: (error) => fail(setNotice, t, error),
                        },
                      );
                    }}
                  >
                    <Input name="title" label={t("examTitle")} required />
                    <Input name="room" label={t("room")} required />
                    <Input name="examDate" type="date" label={t("examDate")} required />
                    <Input name="startTime" type="time" label={t("startTime")} required />
                    <Input name="endTime" type="time" label={t("endTime")} required />
                    <Input name="gradeLevel" type="number" min={1} max={12} label={t("gradeLevel")} required />
                    <Input name="section" label={t("section")} required />
                    <Input name="needed" type="number" min={1} max={6} label={t("needed")} required defaultValue={2} />
                    <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                  </form>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={t("sittings")} />
                <Table
                  columns={[
                    { key: "title", header: t("examTitle"), render: (row) => row.title },
                    { key: "when", header: t("when"), render: (row) => `${row.examDate} ${row.startTime.slice(0, 5)}–${row.endTime.slice(0, 5)}` },
                    { key: "room", header: t("room"), render: (row) => row.room },
                    { key: "class", header: t("classLabel"), render: (row) => `${row.gradeLevel}-${row.section}` },
                    { key: "seats", header: t("filled"), render: (row) => `${row.duties.length}/${row.needed}` },
                    {
                      key: "duties",
                      header: t("duties"),
                      render: (row) => (
                        <div className="grid gap-2">
                          {row.duties.map((duty) => (
                            <div key={duty.id} className="flex flex-wrap items-center gap-2">
                              <span>{duty.name || duty.staffId}</span>
                              <Badge tone={duty.duty === "lead" ? "brand" : "neutral"}>{t(duty.duty === "lead" ? "lead" : "assistant")}</Badge>
                              <Badge>{t(duty.source === "auto" ? "auto" : "manual")}</Badge>
                              <Button variant="ghost" onClick={() => remove.mutate(duty.id, { onError: (error) => fail(setNotice, t, error) })}>
                                {t("remove")}
                              </Button>
                            </div>
                          ))}
                          {row.duties.length < row.needed ? (
                            <form
                              className="flex flex-wrap items-end gap-2"
                              onSubmit={(event) => {
                                const form = readForm(event);
                                manual.mutate(
                                  { sessionId: row.id, staffId: whole(form, "staffId") },
                                  { onError: (error) => fail(setNotice, t, error) },
                                );
                              }}
                            >
                              <Select
                                name="staffId"
                                label={t("teacher")}
                                placeholder={t("choose")}
                                required
                                options={data.teachers.map((teacher) => ({ value: String(teacher.id), label: teacher.name }))}
                              />
                              <Button type="submit" variant="secondary" loading={manual.isPending}>{t("addTeacher")}</Button>
                            </form>
                          ) : null}
                        </div>
                      ),
                    },
                  ]}
                  rows={data.sessions}
                  rowKey={(row) => row.id}
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
