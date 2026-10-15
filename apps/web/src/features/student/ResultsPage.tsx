import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { points, shortDate } from "./api/format";
import type { SubjectBlock } from "./api/types";
import { useStudentResults } from "./api/useStudentResults";
import { StudentPanel } from "./components/StudentPanel";

const INSIGHTS = {
  draftHigh: ["draftHighTitle", "draftHighBody"],
  draftMid: ["draftMidTitle", "draftMidBody"],
  draftLow: ["draftLowTitle", "draftLowBody"],
  finalExcellent: ["finalExcellentTitle", "finalExcellentBody"],
  finalVeryGood: ["finalVeryGoodTitle", "finalVeryGoodBody"],
  finalPass: ["finalPassTitle", "finalPassBody"],
  finalFail: ["finalFailTitle", "finalFailBody"],
} as const;

type InsightName = keyof typeof INSIGHTS;

function insightName(earned: number, max: number, locked: boolean): InsightName | "noWeight" {
  if (max === 0) return "noWeight";
  const percent = (earned / max) * 100;
  if (!locked) {
    if (percent >= 85) return "draftHigh";
    if (percent >= 50) return "draftMid";
    return "draftLow";
  }
  if (percent >= 90) return "finalExcellent";
  if (percent >= 75) return "finalVeryGood";
  if (percent >= 50) return "finalPass";
  return "finalFail";
}

function SubjectCards({ blocks, locked }: { blocks: SubjectBlock[]; locked: boolean }) {
  const { t } = useTranslation("student");
  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        const key = insightName(block.earned, block.maxScore, locked);
        return (
          <Card key={block.subject}>
            <div className="flex items-center justify-between gap-3 border-b border-border bg-canvas px-4 py-3">
              <span className="font-bold">{block.subject}</span>
              <Badge tone={locked ? "success" : "warning"}>{t(locked ? "lockedBadge" : "draftBadge")}</Badge>
            </div>
            <ul>
              {block.items.map((item) => (
                <li key={`${block.subject}-${item.label}`} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-ink-muted">{t("weightOf", { max: Math.round(item.maxScore) })}</p>
                  </div>
                  <div className="text-end">
                    <p className={`text-lg font-bold ${locked ? "text-success" : "text-warning-strong"}`}>{points(item.score)}</p>
                    <p className="text-xs text-ink-muted">{t("outOf", { max: Math.round(item.maxScore) })}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border bg-brand-50 px-4 py-3 text-sm text-ink">
              <p className="font-bold">{t(locked ? "lockedNote" : "insightLabel")}</p>
              {key === "noWeight" ? (
                <p>{t("noWeight")}</p>
              ) : (
                <p>
                  <span className="font-bold">{t(INSIGHTS[key][0])} </span>
                  {t(INSIGHTS[key][1])}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function ResultsPage() {
  const { t } = useTranslation("student");
  const query = useStudentResults();
  const [showAll, setShowAll] = useState(false);
  return (
    <StudentPanel query={query}>
      {(data) => {
        const history = showAll ? data.attendance.history : data.attendance.history.slice(0, 5);
        const rank = (value: number | null, hidden: boolean) =>
          hidden || value == null ? t("blank") : t("rankNth", { rank: value });
        return (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">{t("resultsHello", { name: data.fullName })}</h2>
                <p className="text-sm text-ink-muted">{t("resultsSubtitle")}</p>
              </div>
              <span className="w-fit rounded-card border border-border bg-surface px-3 py-2 text-sm font-bold">
                {t("termBadge", { semester: data.semester, year: data.academicYear })}
              </span>
            </div>

            {data.rosterReady ? (
              <section className="rounded-panel bg-shell p-6 text-white shadow-panel">
                <Badge tone="success">{t("rosterReady")}</Badge>
                <h3 className="mt-3 text-xl font-bold">{t("rosterLocked")}</h3>
                <p className="mt-1 max-w-xl text-sm text-white/70">{t("rosterLockedBody")}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label={t("semAverage")} value={data.semesterAverage == null ? t("blank") : `${points(data.semesterAverage)}%`} />
                  <Metric label={t("semRank")} value={rank(data.semesterRank, data.hideSemesterRank)} />
                  <Metric label={t("yearAverage")} value={data.yearlyAverage == null ? t("blank") : `${points(data.yearlyAverage)}%`} />
                  <Metric label={t("yearRank")} value={rank(data.yearlyRank, false)} />
                </div>
              </section>
            ) : (
              <section className="rounded-panel bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
                <h3 className="font-bold">{t("rosterPending")}</h3>
                <p className="mt-1 text-sm text-white/80">{t("rosterPendingBody")}</p>
                <p className="mt-3 text-sm font-semibold">{t("completedOf", { done: data.completedCount, total: data.expectedCount })}</p>
              </section>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-4">
                <h3 className="font-bold">{t("tracking")}</h3>
                <Card>
                  <CardBody>
                    <h4 className="mb-3 text-sm font-bold">{t("chartTitle")}</h4>
                    <ul className="space-y-2">
                      {data.chart.map((row) => (
                        <li key={row.subject}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="truncate">{row.subject}</span>
                            <span>{points(row.total, 1)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-brand-50">
                            <div className="h-2 rounded-full bg-brand-700" style={{ width: `${Math.max(0, Math.min(100, row.total))}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
                <h4 className="font-bold text-danger">{t("draftHeading")}</h4>
                {data.draft.length === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="text-center font-semibold text-success">{t("draftEmpty")}</p>
                    </CardBody>
                  </Card>
                ) : (
                  <SubjectCards blocks={data.draft} locked={false} />
                )}
                <h4 className="font-bold text-success">{t("lockedHeading")}</h4>
                {data.locked.length === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-ink-muted">{t("lockedEmpty")}</p>
                    </CardBody>
                  </Card>
                ) : (
                  <SubjectCards blocks={data.locked} locked />
                )}
              </div>

              <aside className="space-y-4">
                <h3 className="font-bold">{t("attendanceTitle")}</h3>
                <Card>
                  <CardBody className="text-center">
                    <p className="text-xs font-bold tracking-wide text-ink-muted uppercase">{t("attendancePercent")}</p>
                    <p className="my-2 text-3xl font-bold text-brand-700">{points(data.attendance.percent, 1)}%</p>
                    <div className="mb-3 h-2 rounded-full bg-brand-50">
                      <div className="h-2 rounded-full bg-brand-700" style={{ width: `${Math.max(0, Math.min(100, data.attendance.percent))}%` }} />
                    </div>
                    <div className="grid grid-cols-2 border-t border-border pt-3 text-sm">
                      <div>
                        <p className="text-ink-muted">{t("presentDays")}</p>
                        <p className="font-bold text-success">{t("dayUnit", { count: data.attendance.present })}</p>
                      </div>
                      <div>
                        <p className="text-ink-muted">{t("absentDays")}</p>
                        <p className="font-bold text-danger">{t("dayUnit", { count: data.attendance.absent })}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
                <h3 className="font-bold">{t("historyTitle")}</h3>
                <Card>
                  <CardBody>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-ink-muted">
                          <th className="pb-2 font-medium">{t("date")}</th>
                          <th className="pb-2 font-medium">{t("subject")}</th>
                          <th className="pb-2 text-end font-medium">{t("status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row) => (
                          <tr key={`${row.date}-${row.subjectName ?? ""}-${row.status}`} className="border-b border-border last:border-b-0">
                            <td className="py-2">{shortDate(row.date)}</td>
                            <td className="max-w-24 truncate py-2">{row.subjectName ?? t("generalPeriod")}</td>
                            <td className="py-2 text-end">
                              <Badge tone={row.status === "P" ? "success" : row.status === "A" ? "danger" : "neutral"}>
                                {t(row.status === "P" ? "present" : row.status === "A" ? "absent" : "late")}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Button variant="secondary" fullWidth className="mt-3" onClick={() => setShowAll((open) => !open)}>
                      {t("fullHistory")}
                    </Button>
                  </CardBody>
                </Card>
              </aside>
            </div>
          </div>
        );
      }}
    </StudentPanel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-white/10 bg-white/5 px-3 py-3 text-center">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-1 text-lg font-bold text-gold">{value}</p>
    </div>
  );
}
