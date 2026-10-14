import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Input, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useDeletePlan, useGradeOptions, useGradeSheet, useSavePlans, useSaveScores, type GradeSheet } from "./api/useTeacher";

type DraftRow = { name: string; percent: string };

function blankRow(): DraftRow {
  return { name: "", percent: "" };
}

function planLabel(classSelect: string, name: string): string {
  const prefix = `${classSelect}:`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export function GradeEntryPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [params, setParams] = useSearchParams();
  const options = useGradeOptions();
  const classSelect = params.get("classSelect") ?? "";
  const subjectId = params.get("subjectId") ?? "";
  const showSheet = params.get("load") === "1" && classSelect !== "" && subjectId !== "";
  const sheet = useGradeSheet(classSelect, subjectId, showSheet);
  const savePlans = useSavePlans();
  const deletePlan = useDeletePlan();
  const saveScores = useSaveScores();
  const [draftClass, setDraftClass] = useState(classSelect);
  const [draftSubject, setDraftSubject] = useState(subjectId);
  const [planRows, setPlanRows] = useState<DraftRow[]>([blankRow()]);
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [finalize, setFinalize] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    setDraftClass(classSelect);
    setDraftSubject(subjectId);
  }, [classSelect, subjectId]);

  useEffect(() => {
    if (!sheet.data) return;
    const next: Record<string, string> = {};
    for (const student of sheet.data.students) {
      for (const plan of sheet.data.plans) {
        const score = student.scores[plan.name];
        next[`${student.id}:${plan.name}`] = score === undefined ? "" : score.toFixed(2);
      }
    }
    setMarks(next);
    setFinalize(false);
  }, [sheet.data]);

  const visibleStudents = useMemo(() => {
    const rows = sheet.data?.students ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((student) => student.fullName.toLowerCase().includes(needle));
  }, [search, sheet.data]);

  function loadSheet(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    if (!draftClass || !draftSubject) return;
    setParams({ classSelect: draftClass, subjectId: draftSubject, load: "1" });
  }

  async function onSavePlan(event: FormEvent) {
    event.preventDefault();
    if (!sheet.data) return;
    setNotice(null);
    try {
      const result = await savePlans.mutateAsync({
        classSelect,
        subjectId: Number(subjectId),
        items: planRows.map((row) => ({ name: row.name.trim(), percent: Number(row.percent) })),
      });
      if (result.added > 0) setNotice({ tone: "success", text: t("teacher:plansAdded", { count: result.added }) });
      if (result.rejectedName) {
        setNotice({ tone: "danger", text: t("teacher:weightOver", { name: result.rejectedName }) });
      }
      setPlanRows([blankRow()]);
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  function onScore(studentId: number, planName: string, max: number, value: string) {
    const key = `${studentId}:${planName}`;
    if (value !== "" && Number(value) > max) {
      window.alert(t("teacher:scoreOver", { max }));
      setMarks((current) => ({ ...current, [key]: "" }));
      return;
    }
    setMarks((current) => ({ ...current, [key]: value }));
  }

  function rowTotal(student: GradeSheet["students"][number]): number {
    if (!sheet.data) return 0;
    return sheet.data.plans.reduce((sum, plan) => {
      const raw = marks[`${student.id}:${plan.name}`] ?? "";
      return sum + (raw === "" ? 0 : Number(raw));
    }, 0);
  }

  async function onSaveScores(event: FormEvent) {
    event.preventDefault();
    if (!sheet.data) return;
    setNotice(null);
    const payload = sheet.data.students.flatMap((student) =>
      sheet.data!.plans.map((plan) => {
        const raw = marks[`${student.id}:${plan.name}`] ?? "";
        return {
          studentId: student.id,
          weightingType: plan.name,
          score: raw === "" ? null : Number(raw),
        };
      }),
    );
    try {
      await saveScores.mutateAsync({
        classSelect,
        subjectId: Number(subjectId),
        finalize,
        marks: payload,
      });
      setNotice({ tone: "success", text: t("teacher:gradesSaved") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  if (options.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (options.isError || !options.data) {
    return <Alert tone="danger">{t(`errors:${toErrorKey(options.error)}`)}</Alert>;
  }

  const meta = options.data;

  return (
    <div>
      <section className="mb-4 rounded-xl bg-gradient-to-br from-[#1a237e] to-[#3949ab] px-6 py-7 text-white shadow-raised">
        <h1 className="text-2xl font-bold">{t("teacher:gradeTitle")}</h1>
        <p className="mt-1 text-sm text-white/80">
          {t("teacher:gradeMeta", {
            year: meta.academicYear,
            semester: meta.semester,
            name: meta.teacherName || t("teacher:scheduleTitle"),
          })}
        </p>
      </section>

      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}

      <form onSubmit={loadSheet} className="mb-4 grid gap-3 rounded-xl bg-surface p-4 shadow-raised md:grid-cols-3">
        <label className="text-sm font-bold">
          {t("teacher:chooseClass")}
          <select
            required
            value={draftClass}
            onChange={(event) => setDraftClass(event.target.value)}
            className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 font-normal"
          >
            <option value="">{t("teacher:chooseClassPlaceholder")}</option>
            {meta.classes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:chooseSubject")}
          <select
            required
            value={draftSubject}
            onChange={(event) => setDraftSubject(event.target.value)}
            className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 font-normal"
          >
            <option value="">{t("teacher:chooseSubjectPlaceholder")}</option>
            {meta.subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" fullWidth>
            {t("teacher:showSheet")}
          </Button>
        </div>
      </form>

      {showSheet && sheet.isPending ? (
        <div className="flex justify-center py-10 text-brand-700">
          <Spinner size="lg" label={t("common:loading")} />
        </div>
      ) : null}
      {showSheet && sheet.isError ? <Alert tone="danger">{t(`errors:${toErrorKey(sheet.error)}`)}</Alert> : null}

      {sheet.data ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <aside className="rounded-xl bg-surface p-3 shadow-soft lg:col-span-1">
            <h2 className="mb-3 border-b border-border pb-2 text-sm font-bold text-[#1a237e]">
              {t("teacher:planTitle", { total: sheet.data.totalPercent })}
            </h2>
            {sheet.data.plans.map((plan) => (
              <div key={plan.id} className="mb-2 flex items-center justify-between rounded-lg border border-border border-l-4 border-l-[#3949ab] px-3 py-2">
                <div>
                  <p className="text-sm font-bold">{planLabel(classSelect, plan.name)}</p>
                  <p className="text-xs text-ink-muted">{t("teacher:weight", { percent: plan.percent })}</p>
                </div>
                {sheet.data && !sheet.data.locked ? (
                  <button
                    type="button"
                    className="text-danger"
                    onClick={() => {
                      if (!window.confirm(t("teacher:deletePlan"))) return;
                      setNotice(null);
                      void deletePlan
                        .mutateAsync({ id: plan.id, classSelect, subjectId: Number(subjectId) })
                        .then(() => setNotice({ tone: "success", text: t("teacher:planDeleted") }))
                        .catch((error: unknown) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }));
                    }}
                  >
                    {t("teacher:removePlan")}
                  </button>
                ) : null}
              </div>
            ))}
            {!sheet.data.locked && sheet.data.totalPercent < 100 ? (
              <form onSubmit={onSavePlan} className="mt-3 rounded border border-border bg-canvas p-2">
                {planRows.map((row, index) => (
                  <div key={index} className="mb-2 border-b border-border pb-2">
                    <Input
                      label={t("teacher:planName")}
                      value={row.name}
                      required
                      onChange={(event) =>
                        setPlanRows((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
                      }
                    />
                    <Input
                      label={t("teacher:planPercent")}
                      type="number"
                      step="0.1"
                      required
                      value={row.percent}
                      onChange={(event) =>
                        setPlanRows((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, percent: event.target.value } : item)),
                        )
                      }
                    />
                  </div>
                ))}
                <Button type="button" variant="secondary" fullWidth className="mb-2" onClick={() => setPlanRows((current) => [...current, blankRow()])}>
                  {t("teacher:addRow")}
                </Button>
                <Button type="submit" fullWidth loading={savePlans.isPending}>
                  {t("teacher:savePlan")}
                </Button>
              </form>
            ) : null}
          </aside>

          <section className="rounded-xl bg-surface p-3 shadow-soft lg:col-span-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("teacher:searchStudents")}
              className="mb-3 h-11 w-full rounded-full border-2 border-border px-5"
            />
            <form onSubmit={onSaveScores}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border text-left text-xs font-bold text-[#1a237e]">
                      <th className="min-w-52 px-2 py-2">{t("teacher:studentName")}</th>
                      {sheet.data.plans.map((plan) => (
                        <th key={plan.id} className="px-2 py-2 text-center">
                          {planLabel(classSelect, plan.name)}
                          <br />({plan.percent})
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center">{t("teacher:totalMark")}</th>
                      <th className="px-2 py-2 text-center">{t("teacher:status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student) => (
                      <tr key={student.id} className="border-t border-border">
                        <td className="px-2 py-2">
                          <p className="text-sm font-bold">{student.fullName}</p>
                          <p className="text-xs text-ink-muted">{t("teacher:studentId", { id: student.id })}</p>
                        </td>
                        {sheet.data?.plans.map((plan) => (
                          <td key={plan.id} className="px-2 py-2 text-center">
                            <input
                              type="number"
                              step="0.01"
                              readOnly={student.locked}
                              value={marks[`${student.id}:${plan.name}`] ?? ""}
                              onChange={(event) => onScore(student.id, plan.name, plan.percent, event.target.value)}
                              className="w-[75px] rounded-md border border-border px-1 py-1 text-center font-semibold read-only:bg-canvas read-only:text-ink-muted"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center font-bold text-brand-700">{rowTotal(student).toFixed(2)}</td>
                        <td className="px-2 py-2 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              student.status === "Draft" ? "bg-[#fff4e6] text-[#fd7e14]" : "bg-[#ebfbee] text-[#40c057]"
                            }`}
                          >
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sheet.data.locked ? (
                <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded border border-border bg-canvas p-4 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-sm font-bold text-danger">
                    <input type="checkbox" checked={finalize} onChange={(event) => setFinalize(event.target.checked)} />
                    {t("teacher:finalize")}
                  </label>
                  <Button type="submit" loading={saveScores.isPending}>
                    {t("teacher:saveGrades")}
                  </Button>
                </div>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
