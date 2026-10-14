import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useAddQuestion, useCreateExam, useExamList, useExamOptions, useExamStatus, useOpenExam } from "./api/useTeacherPages";

const field = "mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 font-normal";

export function OnlineExamsPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [grade, setGrade] = useState("");
  const options = useExamOptions(grade);
  const exams = useExamList();
  const create = useCreateExam();
  const status = useExamStatus();
  const open = useOpenExam();
  const addQuestion = useAddQuestion();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [password, setPassword] = useState("");
  const [openedId, setOpenedId] = useState<number | null>(null);

  if (options.isPending || exams.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (options.isError || !options.data) return <Alert tone="danger">{t(`errors:${toErrorKey(options.error)}`)}</Alert>;
  if (exams.isError || !exams.data) return <Alert tone="danger">{t(`errors:${toErrorKey(exams.error)}`)}</Alert>;

  const meta = options.data;

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice(null);
    const official = form.get("isOfficial") === "on";
    const weight = String(form.get("weightingPercent") ?? "");
    try {
      await create.mutateAsync({
        examTitle: String(form.get("examTitle") ?? ""),
        gradeLevel: Number(form.get("gradeLevel")),
        subjectId: Number(form.get("subjectId")),
        section: String(form.get("section") ?? ""),
        examPassword: String(form.get("examPassword") ?? ""),
        durationMinutes: Number(form.get("durationMinutes") || 40),
        isOfficial: official,
        weightingPercent: official && weight !== "" ? Number(weight) : undefined,
      });
      event.currentTarget.reset();
      setNotice({ tone: "success", text: t("teacher:examCreated") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  async function onOpen(event: FormEvent) {
    event.preventDefault();
    if (!openedId) return;
    setNotice(null);
    try {
      await open.mutateAsync({ id: openedId, password });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  async function onQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openedId) return;
    const form = new FormData(event.currentTarget);
    setNotice(null);
    try {
      await addQuestion.mutateAsync({
        examId: openedId,
        questionText: String(form.get("questionText") ?? ""),
        optionA: String(form.get("optionA") ?? ""),
        optionB: String(form.get("optionB") ?? ""),
        optionC: String(form.get("optionC") ?? ""),
        optionD: String(form.get("optionD") ?? ""),
        correctOption: String(form.get("correctOption") ?? "A") as "A" | "B" | "C" | "D",
        points: Number(form.get("points") || 1),
      });
      event.currentTarget.reset();
      if (open.data) await open.mutateAsync({ id: openedId, password });
      setNotice({ tone: "success", text: t("teacher:questionAdded") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  function statusLabel(value: string) {
    if (value === "Published") return t("teacher:statusPublished");
    if (value === "Closed") return t("teacher:statusClosed");
    return t("teacher:statusDraft");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl bg-surface shadow-raised">
        <div className="bg-[#001f3f] px-6 py-5 text-white">
          <h1 className="text-2xl font-bold">{t("teacher:examCreateTitle")}</h1>
          <p className="mt-1 text-sm">{t("teacher:yearSemester", { year: meta.academicYear, semester: meta.semester })}</p>
        </div>
        <form onSubmit={onCreate} className="grid gap-4 p-5 md:grid-cols-2">
          {notice ? <div className="md:col-span-2"><Alert tone={notice.tone}>{notice.text}</Alert></div> : null}
          <h2 className="md:col-span-2 font-bold">{t("teacher:examDetails")}</h2>
          <label className="text-sm font-bold md:col-span-2">
            {t("teacher:examTitle")}
            <input name="examTitle" required placeholder={t("teacher:examTitlePlaceholder")} className={field} />
          </label>
          <label className="text-sm font-bold">
            {t("teacher:gradePick")}
            <select
              name="gradeLevel"
              required
              className={field}
              value={grade || (meta.grade ? String(meta.grade) : "")}
              onChange={(event) => setGrade(event.target.value)}
            >
              <option value="">{t("teacher:choose")}</option>
              {meta.grades.map((item) => (
                <option key={item} value={item}>
                  Grade {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            {t("teacher:subjectPick")}
            <select name="subjectId" required className={field}>
              <option value="">{t("teacher:choose")}</option>
              {meta.subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            {t("teacher:sectionPick")}
            <select name="section" required className={field}>
              <option value="">{t("teacher:choose")}</option>
              {meta.sections.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            {t("teacher:examPassword")}
            <input name="examPassword" required placeholder={t("teacher:passwordPlaceholder")} className={field} />
            <span className="mt-1 block font-normal text-ink-muted">{t("teacher:examPasswordHint")}</span>
          </label>
          <label className="text-sm font-bold">
            {t("teacher:duration")}
            <input name="durationMinutes" type="number" min={1} defaultValue={40} className={field} />
            <span className="mt-1 block font-normal text-ink-muted">{t("teacher:minutes")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold md:col-span-2">
            <input name="isOfficial" type="checkbox" />
            {t("teacher:official")}
          </label>
          <label className="text-sm font-bold">
            {t("teacher:weighting")}
            <input name="weightingPercent" type="number" min={0} max={100} placeholder="20" className={field} />
            <span className="mt-1 block font-normal text-ink-muted">{t("teacher:weightHint")}</span>
          </label>
          <div className="flex items-end gap-2">
            <Button type="reset" variant="secondary">{t("teacher:clearAll")}</Button>
            <Button type="submit" loading={create.isPending}>{t("teacher:createExam")}</Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-raised">
        <h2 className="text-xl font-bold">{t("teacher:examIndex")}</h2>
        <p className="mb-4 text-sm text-ink-muted">{t("teacher:examIndexHint")}</p>
        <div className="space-y-3">
          {exams.data.exams.length === 0 ? <Alert tone="warning">{t("teacher:noExams")}</Alert> : null}
          {exams.data.exams.map((exam) => (
            <article key={exam.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold">{exam.title}</h3>
                  <p className="text-sm text-ink-muted">
                    {exam.subjectName} · {statusLabel(exam.status)}
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={() => { setOpenedId(exam.id); setPassword(""); open.reset(); }}>
                  {t("teacher:openExam")}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="self-center text-sm font-bold">{t("teacher:changeStatus")}</span>
                {(["Draft", "Published", "Closed"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    onClick={() => status.mutate({ id: exam.id, status: value })}
                  >
                    {value === "Draft" ? t("teacher:toDraft") : value === "Published" ? t("teacher:toPublished") : t("teacher:toClosed")}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {openedId ? (
        <section className="rounded-xl bg-surface p-5 shadow-raised">
          <h2 className="mb-3 font-bold">{t("teacher:verifyTitle")}</h2>
          <form onSubmit={onOpen} className="mb-4 flex flex-wrap gap-2">
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-control border border-border px-3 py-2" placeholder={t("teacher:passwordPlaceholder")} />
            <Button type="submit" loading={open.isPending}>{t("teacher:verify")}</Button>
          </form>
          {open.data && open.data.id === openedId ? (
            <div className="space-y-4">
              <ul className="space-y-2 text-sm">
                {open.data.questions.map((question, index) => (
                  <li key={question.id} className="rounded border border-border p-3">
                    <p className="font-bold">{index + 1}. {question.questionText}</p>
                    <p>A. {question.optionA} · B. {question.optionB} · C. {question.optionC} · D. {question.optionD}</p>
                    <p className="text-ink-muted">{t("teacher:correct")}: {question.correctOption} · {question.points}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={onQuestion} className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-bold md:col-span-2">{t("teacher:question")}<textarea name="questionText" required className={field} /></label>
                <label className="text-sm font-bold">{t("teacher:optionA")}<input name="optionA" required className={field} /></label>
                <label className="text-sm font-bold">{t("teacher:optionB")}<input name="optionB" required className={field} /></label>
                <label className="text-sm font-bold">{t("teacher:optionC")}<input name="optionC" required className={field} /></label>
                <label className="text-sm font-bold">{t("teacher:optionD")}<input name="optionD" required className={field} /></label>
                <label className="text-sm font-bold">
                  {t("teacher:correct")}
                  <select name="correctOption" className={field}>
                    {["A", "B", "C", "D"].map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold">{t("teacher:points")}<input name="points" type="number" min={1} defaultValue={1} className={field} /></label>
                <Button type="submit" loading={addQuestion.isPending}>{t("teacher:addQuestion")}</Button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
