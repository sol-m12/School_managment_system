import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useAddLesson,
  useLessonPlans,
  useRegistration,
  useSaveRegistration,
} from "./api/useTeacherPages";

const field = "mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 font-normal";

function Loading() {
  const { t } = useTranslation("common");
  return (
    <div className="flex justify-center py-10 text-brand-700">
      <Spinner size="lg" label={t("loading")} />
    </div>
  );
}

export function BestTeachingPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const plans = useLessonPlans();
  const add = useAddLesson();
  const [notice, setNotice] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState("");

  if (plans.isPending) return <Loading />;
  if (plans.isError || !plans.data) return <Alert tone="danger">{t(`errors:${toErrorKey(plans.error)}`)}</Alert>;
  const subject = plans.data.subjects.find((item) => String(item.id) === subjectId) ?? plans.data.subjects[0];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject) return;
    const form = new FormData(event.currentTarget);
    setNotice(null);
    try {
      await add.mutateAsync({
        subjectId: subject.id,
        gradeLevel: Number(form.get("gradeLevel")),
        weekNumber: Number(form.get("weekNumber")),
        topicTitle: String(form.get("topicTitle") ?? ""),
        learningObjectives: String(form.get("learningObjectives") ?? ""),
      });
      event.currentTarget.reset();
      setNotice(t("teacher:planSaved"));
    } catch (error) {
      setNotice(t(`errors:${toErrorKey(error)}`));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("teacher:bestTitle")}</h1>
      <p className="text-sm text-ink-muted">{t("teacher:regYearValue", { year: plans.data.academicYear })}</p>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-surface p-4 shadow-raised md:grid-cols-2">
        <label className="text-sm font-bold">
          {t("teacher:subject")}
          <select className={field} value={subject ? String(subject.id) : ""} onChange={(event) => setSubjectId(event.target.value)}>
            {plans.data.subjects.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:gradePick")}
          <select name="gradeLevel" className={field}>
            {(subject?.grades ?? []).map((grade) => (
              <option key={grade} value={grade}>{t("teacher:gradeN", { grade })}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">{t("teacher:week")}<input name="weekNumber" type="number" min={1} required className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:topic")}<input name="topicTitle" required className={field} /></label>
        <label className="text-sm font-bold md:col-span-2">{t("teacher:objectives")}<textarea name="learningObjectives" className={field} /></label>
        <Button type="submit" loading={add.isPending}>{t("teacher:addPlan")}</Button>
      </form>
      {plans.data.plans.length === 0 ? <Alert tone="warning">{t("teacher:noPlans")}</Alert> : (
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="px-2 py-1">{t("teacher:week")}</th>
              <th className="px-2 py-1">{t("teacher:subject")}</th>
              <th className="px-2 py-1">{t("teacher:topic")}</th>
              <th className="px-2 py-1">{t("teacher:status")}</th>
            </tr>
          </thead>
          <tbody>
            {plans.data.plans.map((plan) => (
              <tr key={plan.id} className="border-t border-border">
                <td className="px-2 py-2">{plan.weekNumber}</td>
                <td className="px-2 py-2">{plan.subjectName} · {t("teacher:gradeN", { grade: plan.gradeLevel })}</td>
                <td className="px-2 py-2">
                  <p className="font-semibold">{plan.topicTitle}</p>
                  <p className="text-ink-muted">{plan.learningObjectives}</p>
                </td>
                <td className="px-2 py-2">{plan.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const REG_TYPES = [
  { value: "አዲስ", label: "regNew" },
  { value: "ደጋሚ", label: "regRepeat" },
  { value: "አቋራጭ", label: "regTransferIn" },
  { value: "መልሶ ቅበላ", label: "regReturn" },
] as const;

export function StudentRegistrationPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [grade, setGrade] = useState(9);
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState<number | undefined>();
  const board = useRegistration(grade, query);
  const save = useSaveRegistration();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (board.isPending) return <Loading />;
  if (board.isError || !board.data) return <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice(null);
    const registrationType = String(form.get("registrationType") ?? "");
    if (!registrationType) return;
    try {
      await save.mutateAsync({
        studentId,
        fullName: String(form.get("fullName") ?? ""),
        gender: String(form.get("gender")),
        age: Number(form.get("age")),
        gradeLevel: Number(form.get("gradeLevel")),
        registrationType,
        stream: Number(form.get("gradeLevel")) >= 11 ? String(form.get("stream")) : null,
        phoneNumber: String(form.get("phoneNumber") ?? ""),
        isTransfer: form.get("isTransfer") === "on",
        previousSchool: String(form.get("previousSchool") ?? ""),
        kebele: String(form.get("kebele") ?? ""),
        gote: String(form.get("gote") ?? ""),
        houseNumber: String(form.get("houseNumber") ?? ""),
      });
      setStudentId(undefined);
      setFormKey((value) => value + 1);
      setNotice({ tone: "success", text: t("teacher:studentSaved") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-bold">{t("teacher:regYear")}</p>
      <p className="text-lg font-bold text-brand-700">{t("teacher:regYearValue", { year: board.data.academicYear })}</p>
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-sm font-bold">{t("teacher:gradeChoice")}</span>
        {[9, 10, 11, 12].map((item) => (
          <Button key={item} type="button" variant={item === grade ? "primary" : "secondary"} onClick={() => setGrade(item)}>
            {t("teacher:gradeN", { grade: item })}
          </Button>
        ))}
      </div>
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      <form key={formKey} onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-surface p-4 shadow-raised md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold">{t("teacher:regForm", { grade })}</h2>
        <label className="text-sm font-bold md:col-span-2">
          {t("teacher:liveSearch")}
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={field} />
          {board.data.matches.length > 0 ? (
            <ul className="mt-1 rounded border border-border bg-canvas">
              {board.data.matches.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-surface"
                    onClick={() => {
                      if (!match.editable) return;
                      setStudentId(match.id);
                      setQuery(match.fullName);
                    }}
                  >
                    {match.fullName} · #{match.id}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
        <label className="text-sm font-bold md:col-span-2">{t("teacher:fullName")}<input name="fullName" required defaultValue={query} className={field} /></label>
        <label className="text-sm font-bold">
          {t("teacher:regGrade")}
          <select name="gradeLevel" defaultValue={grade} className={field}>
            {[9, 10, 11, 12].map((item) => <option key={item} value={item}>{t("teacher:gradeN", { grade: item })}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:regSex")}
          <select name="gender" className={field}>
            <option value="M">{t("teacher:male")}</option>
            <option value="F">{t("teacher:female")}</option>
          </select>
        </label>
        <label className="text-sm font-bold">{t("teacher:age")}<input name="age" type="number" min={1} required className={field} /></label>
        <label className="text-sm font-bold">
          {t("teacher:regStatus")}
          <select name="registrationType" required defaultValue="" className={field}>
            <option value="">{t("teacher:regStatusPlaceholder")}</option>
            {REG_TYPES.map((item) => <option key={item.value} value={item.value}>{t(`teacher:${item.label}`)}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">{t("teacher:phone")}<input name="phoneNumber" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:fan")}<input name="fanNumber" className={field} /></label>
        <label className="text-sm font-bold">
          {t("teacher:stream")}
          <select name="stream" className={field}>
            <option value="Common">{t("teacher:streamNone")}</option>
            <option value="Natural">Natural Science</option>
            <option value="Social">Social Science</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input name="isTransfer" type="checkbox" />
          {t("teacher:transfer")}
        </label>
        <label className="text-sm font-bold">{t("teacher:previousSchool")}<input name="previousSchool" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:kebele")}<input name="kebele" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:gote")}<input name="gote" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:houseNumber")}<input name="houseNumber" className={field} /></label>
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{t("teacher:saveStudent")}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setStudentId(undefined);
              setQuery("");
              setFormKey((value) => value + 1);
            }}
          >
            {t("teacher:newStudent")}
          </Button>
        </div>
      </form>
      <section className="rounded-xl bg-surface p-4 shadow-raised">
        <h2 className="mb-3 font-bold">{t("teacher:pendingTitle", { grade })}</h2>
        {board.data.pending.length === 0 ? <p>{t("teacher:pendingEmpty")}</p> : (
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="px-2 py-1">#ID</th>
                <th className="px-2 py-1">{t("teacher:fullName")}</th>
                <th className="px-2 py-1">{t("teacher:typeCol")}</th>
                <th className="px-2 py-1">{t("teacher:regGrade")}</th>
              </tr>
            </thead>
            <tbody>
              {board.data.pending.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.fullName}</td>
                  <td className="px-2 py-2">{row.registrationType}</td>
                  <td className="px-2 py-2">{t("teacher:gradeN", { grade: row.gradeLevel })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
