import { useState } from "react";
import { BookMarked, ChartLine, ClipboardCheck, ShoppingCart, Star, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { toErrorKey } from "@/lib/apiError";
import {
  useAddRequisition,
  useApproveGrade,
  useApprovePlan,
  useCoverage,
  useCurriculum,
  useEvaluations,
  useGradeFlow,
  useHomeroomList,
  useMarkCovered,
  useRequisitions,
  useSaveEvaluation,
  useSaveStandard,
  useSendGrade,
  useSendRequisition,
  useStudent360,
} from "./api/useTeacherOffice";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

function whole(data: FormData, name: string): number {
  return Number(textOf(data, name));
}

export function Student360Page() {
  const { t } = useTranslation(["office", "errors"]);
  const list = useHomeroomList();
  const [studentId, setStudentId] = useState<number | null>(null);
  const detail = useStudent360(studentId);
  const { view } = useNotice();

  return (
    <>
      <PageHeader title={t("viewTitle")} description={t("viewHelp")} />
      {view}
      <Panel query={list}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody>
                <Select
                  label={t("student")}
                  placeholder={t("choose")}
                  value={studentId == null ? "" : String(studentId)}
                  onChange={(event) => setStudentId(event.target.value ? Number(event.target.value) : null)}
                  options={data.students.map((row) => ({ value: String(row.id), label: `${row.name} · ${row.gradeLevel} ${row.section}` }))}
                />
              </CardBody>
            </Card>
            {studentId != null ? (
              <Panel query={detail}>
                {(row) => (
                  <div className="grid gap-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <StatCard label={t("average")} value={row.average == null ? "—" : String(row.average)} icon={UsersRound} />
                      <StatCard label={t("present")} value={String(row.attendance.present)} icon={UsersRound} tone="success" />
                      <StatCard label={t("absent")} value={String(row.attendance.absent)} icon={UsersRound} tone="danger" />
                      <StatCard label={t("tardy")} value={String(row.attendance.tardy)} icon={UsersRound} />
                      <StatCard label={t("openIncidents")} value={String(row.openIncidents)} icon={UsersRound} />
                      <StatCard label={t("loans")} value={String(row.borrowedBooks)} icon={UsersRound} />
                      <StatCard label={t("participationTitle")} value={String(row.participation)} icon={UsersRound} />
                      <StatCard label={t("referrals")} value={String(row.referrals)} icon={UsersRound} />
                    </div>
                    <Card>
                      <CardHeader title={t("marks")} />
                      <Table
                        columns={[
                          { key: "subject", header: t("subject"), render: (item) => item.subject },
                          { key: "score", header: t("score"), render: (item) => `${item.score}/${item.maxScore}` },
                          { key: "status", header: t("status"), render: (item) => item.status ?? "" },
                        ]}
                        rows={row.grades}
                        rowKey={(item) => `${item.subject}-${item.score}`}
                        empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
                      />
                    </Card>
                  </div>
                )}
              </Panel>
            ) : null}
          </div>
        )}
      </Panel>
    </>
  );
}

export function CurriculumPage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useCurriculum();
  const approve = useApprovePlan();
  const save = useSaveStandard();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("curriculumTitle")} description={t("curriculumHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <StatCard label={t("curriculumTitle")} value={data.department} icon={BookMarked} />
            <Card>
              <CardHeader title={t("standard")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      { subjectId: whole(form, "subjectId"), assessmentName: textOf(form, "assessmentName"), maxScore: whole(form, "maxScore") },
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
                  <Input name="assessmentName" label={t("assessment")} required />
                  <Input name="maxScore" type="number" min={1} max={100} label={t("maxScore")} required />
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("standards")} />
              <Table
                columns={[
                  { key: "subject", header: t("subject"), render: (row) => row.subject },
                  { key: "name", header: t("assessment"), render: (row) => row.assessmentName },
                  { key: "max", header: t("maxScore"), render: (row) => row.maxScore },
                ]}
                rows={data.standards}
                rowKey={(row) => row.id}
                empty={<p className="px-4 py-8 text-center text-sm text-ink-muted">{t("empty")}</p>}
              />
            </Card>
            <Card>
              <CardHeader title={t("plan")} />
              <Table
                columns={[
                  { key: "subject", header: t("subject"), render: (row) => row.subject },
                  { key: "week", header: t("week"), render: (row) => row.week },
                  { key: "topic", header: t("plan"), render: (row) => row.topic },
                  { key: "status", header: t("status"), render: (row) => <Badge tone={row.status === "Approved" ? "success" : "neutral"}>{t(row.status === "Approved" ? "approved" : "draft")}</Badge> },
                  {
                    key: "act",
                    header: "",
                    render: (row) => row.status === "Draft" ? (
                      <Button variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>
                        {t("approvePlan")}
                      </Button>
                    ) : null,
                  },
                ]}
                rows={data.plans}
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

export function GradeWorkflowPage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useGradeFlow();
  const approve = useApproveGrade();
  const send = useSendGrade();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("gradesTitle")} description={t("gradesHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <StatCard label={t("gradesTitle")} value={data.department} icon={ClipboardCheck} />
            <Card>
              <Table
                columns={[
                  { key: "student", header: t("student"), render: (row) => row.student },
                  { key: "subject", header: t("subject"), render: (row) => row.subject },
                  { key: "score", header: t("score"), render: (row) => `${row.score}/${row.maxScore}` },
                  { key: "assessment", header: t("assessment"), render: (row) => row.assessment },
                  { key: "status", header: t("status"), render: (row) => row.status ?? "" },
                  { key: "review", header: t("review"), render: (row) => row.review === "Sent" ? t("sent") : row.review === "Approved" ? t("approved") : "" },
                  {
                    key: "act",
                    header: "",
                    render: (row) => row.status === "Submitted" ? (
                      <Button variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>{t("approve")}</Button>
                    ) : row.review === "Approved" ? (
                      <Button variant="secondary" loading={send.isPending} onClick={() => send.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>{t("send")}</Button>
                    ) : null,
                  },
                ]}
                rows={data.rows}
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

export function ProcurementPage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useRequisitions();
  const save = useAddRequisition();
  const send = useSendRequisition();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("procurementTitle")} description={t("procurementHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <StatCard label={t("procurementTitle")} value={data.department} icon={ShoppingCart} />
            <Card>
              <CardHeader title={t("procurementTitle")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      { itemName: textOf(form, "itemName"), quantity: whole(form, "quantity"), purpose: textOf(form, "purpose") },
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
                  <Input name="itemName" label={t("item")} required />
                  <Input name="quantity" type="number" min={1} label={t("quantity")} required />
                  <div className="md:col-span-2"><Input name="purpose" label={t("purpose")} required /></div>
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "item", header: t("item"), render: (row) => row.itemName },
                  { key: "qty", header: t("quantity"), render: (row) => row.quantity },
                  { key: "purpose", header: t("purpose"), render: (row) => row.purpose },
                  { key: "status", header: t("status"), render: (row) => <Badge>{t(row.status === "Sent" ? "sent" : "submitted")}</Badge> },
                  {
                    key: "act",
                    header: "",
                    render: (row) => row.status === "Submitted" ? (
                      <Button variant="secondary" loading={send.isPending} onClick={() => send.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>{t("sendProcurement")}</Button>
                    ) : null,
                  },
                ]}
                rows={data.rows}
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

export function CoveragePage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useCoverage();
  const mark = useMarkCovered();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("coverageTitle")} description={t("coverageHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {data.subjects.map((row) => (
                <StatCard key={row.id} label={row.name} value={`${row.percent}%`} icon={ChartLine} />
              ))}
            </div>
            <Card>
              <Table
                columns={[
                  { key: "subject", header: t("subject"), render: (row) => row.subject },
                  { key: "week", header: t("week"), render: (row) => row.week },
                  { key: "topic", header: t("plan"), render: (row) => row.topic },
                  { key: "status", header: t("status"), render: (row) => row.covered ? t("marked") : t(row.status === "Approved" ? "approved" : "draft") },
                  {
                    key: "act",
                    header: "",
                    render: (row) => !row.covered && row.status === "Approved" ? (
                      <Button
                        variant="secondary"
                        loading={mark.isPending}
                        onClick={() =>
                          mark.mutate(
                            { planDetailId: row.id, coveredOn: new Date().toISOString().slice(0, 10) },
                            { onError: (error) => fail(setNotice, t, error) },
                          )
                        }
                      >
                        {t("markCovered")}
                      </Button>
                    ) : null,
                  },
                ]}
                rows={data.topics}
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

const SCORE_FIELDS = [
  ["planning", 20],
  ["delivery", 30],
  ["assessment", 25],
  ["punctuality", 15],
  ["care", 10],
] as const;

export function EvaluationPage() {
  const { t } = useTranslation(["office", "errors"]);
  const query = useEvaluations();
  const save = useSaveEvaluation();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("evaluationTitle")} description={t("evaluationHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <StatCard label={t("evaluationTitle")} value={data.department} icon={Star} />
            <Card>
              <CardHeader title={t("evaluationTitle")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      {
                        staffId: whole(form, "staffId"),
                        term: textOf(form, "term") as "1" | "2",
                        note: textOf(form, "note"),
                        scores: {
                          planning: whole(form, "planning"),
                          delivery: whole(form, "delivery"),
                          assessment: whole(form, "assessment"),
                          punctuality: whole(form, "punctuality"),
                          care: whole(form, "care"),
                        },
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
                  <Select name="staffId" label={t("teacher")} placeholder={t("choose")} options={data.teachers.map((row) => ({ value: String(row.id), label: row.name }))} required />
                  <Select name="term" label={t("term")} options={[{ value: "1", label: t("term1") }, { value: "2", label: t("term2") }]} required />
                  {SCORE_FIELDS.map(([name, max]) => (
                    <Input key={name} name={name} type="number" min={0} max={max} label={`${t(name === "assessment" ? "assessmentScore" : name)} (${max})`} required />
                  ))}
                  <div className="md:col-span-2"><Input name="note" label={t("note")} /></div>
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("evaluations")} />
              <Table
                columns={[
                  { key: "teacher", header: t("teacher"), render: (row) => row.teacher },
                  { key: "term", header: t("term"), render: (row) => (row.term === "1" ? t("term1") : t("term2")) },
                  { key: "total", header: t("total"), render: (row) => `${row.total}/${row.max}` },
                  { key: "note", header: t("note"), render: (row) => row.note },
                ]}
                rows={data.rows}
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
