import { useTranslation } from "react-i18next";
import { Button, Card, CardBody } from "@/components/ui";
import { shortDate } from "./api/format";
import { useStudentQuiz } from "./api/useStudentQuiz";
import { StudentPanel } from "./components/StudentPanel";

export function QuizPage() {
  const { t } = useTranslation("student");
  const query = useStudentQuiz();
  return (
    <StudentPanel query={query}>
      {(data) => {
        if (!data.inGroup) {
          return <div className="rounded-panel bg-warning/10 px-4 py-8 text-center font-semibold text-warning-strong">{t("quizNotInGroup")}</div>;
        }
        return (
          <div className="rounded-panel bg-gradient-to-br from-brand-900 via-brand-800 to-gold p-4 text-white">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="rounded-full border border-white/30 px-3 py-1 text-sm">{data.groupName}</p>
                <p className="mt-2 text-sm font-bold text-ink-strong">{t("rank")}</p>
              </div>
              <div className="text-end">
                <p className="text-3xl font-bold text-gold">0</p>
                <p className="text-xs uppercase">{t("points")}</p>
              </div>
            </div>
            <Card>
              <CardBody>
                <h3 className="mb-4 text-center text-lg font-bold">{t("activeExams")}</h3>
                {data.exams.length === 0 ? (
                  <div className="py-6 text-center">
                    <h4 className="font-bold text-ink-muted">{t("noActiveExam")}</h4>
                    <p className="text-sm text-ink-muted">{t("waitTeacher")}</p>
                    <Button variant="secondary" className="mt-3" onClick={() => void query.refetch()}>
                      {t("checkAgain")}
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {data.exams.map((exam) => (
                      <li key={exam.examId} className="flex items-center justify-between gap-3 rounded-card border-l-4 border-brand-700 bg-canvas px-4 py-3">
                        <div>
                          <p className="font-bold">{t("examId", { id: exam.examId })}</p>
                          <p className="text-xs text-ink-muted">{t("startedAt", { time: shortDate(exam.startTime) })}</p>
                        </div>
                        <button type="button" className="rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white" onClick={() => void query.refetch()}>
                          {t("start")}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        );
      }}
    </StudentPanel>
  );
}
