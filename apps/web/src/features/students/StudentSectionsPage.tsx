import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { usePlacement, usePlacementAction, type PlacementRow, type PlacementSection } from "./placementApi";

const field = "mt-1 w-full rounded-md border border-[#ced4da] bg-white px-3 py-2";

function streamLabel(stream: string | null, t: (key: string) => string): string {
  if (stream === "Natural") return t("admin:streamNatural");
  if (stream === "Social") return t("admin:streamSocial");
  return "";
}

function sectionTitle(section: PlacementSection, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const stream = streamLabel(section.stream, t);
  const grade = t("admin:studentGradeCard", { grade: section.gradeLevel });
  const name = t("admin:studentSectionBadge", { section: section.section });
  return [grade, stream, name].filter(Boolean).join(" - ");
}

function genderText(row: PlacementRow, t: (key: string) => string): string {
  if (row.genderKey === "M") return t("admin:studentMale");
  if (row.genderKey === "F") return t("admin:studentFemale");
  return "-";
}

function exportGroups(rows: PlacementRow[], sections: PlacementSection[], grade: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const groups = new Map<string, { title: string; rows: PlacementRow[] }>();
  for (const row of rows) {
    const assigned = Boolean(row.section && row.section.trim());
    if (!assigned && grade !== "unassigned") continue;
    const key = assigned ? `s-${row.classId ?? row.section}` : `u-${row.gradeLevel}`;
    const title = assigned
      ? sectionTitle(
          sections.find((section) => section.id === row.classId) ?? {
            id: 0,
            gradeLevel: row.gradeLevel,
            stream: (row.stream === "Natural" || row.stream === "Social" ? row.stream : null),
            section: row.section ?? "",
            maxCapacity: 0,
            current: 0,
          },
          t,
        )
      : t("admin:placementUnassignedGroup", { grade: row.gradeLevel });
    const group = groups.get(key) ?? { title, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function pageHtml(title: string, groups: { title: string; rows: PlacementRow[] }[], year: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const pages = groups
    .map((group) => {
      const male = group.rows.filter((row) => row.genderKey === "M").length;
      const female = group.rows.filter((row) => row.genderKey === "F").length;
      const body = group.rows
        .map(
          (row, index) =>
            `<tr><td>${index + 1}</td><td style="text-align:left">${row.fullName}</td><td>${genderText(row, t)}</td><td>${row.age}</td></tr>`,
        )
        .join("");
      return `<section class="page"><h1>${title}</h1><h2>${group.title}</h2><p>${t("admin:placementYearLine", { year })}</p><table><thead><tr><th>${t("admin:placementNo")}</th><th>${t("admin:studentFullName")}</th><th>${t("admin:gender")}</th><th>${t("admin:studentAge")}</th></tr></thead><tbody>${body}</tbody></table><p>${t("admin:placementFooter", { male, female, total: group.rows.length })}</p></section>`;
    })
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t("admin:placementWordTitle")}</title><style>body{font-family:Nyala,"Noto Sans Ethiopic",serif}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:4px;text-align:center}th{background:#e9e9e9}.page{page-break-after:always}</style></head><body>${pages}</body></html>`;
}

export function StudentSectionsPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const [filters, setFilters] = useState({ year: "", rosterYear: "", grade: "", sectionId: "", search: "" });
  const [started, setStarted] = useState(false);
  const query = usePlacement(started ? filters : {});
  const action = usePlacementAction();
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const data = query.data;

  const activeFilters = useMemo(() => {
    if (!data || started) return filters;
    return { year: data.year, rosterYear: data.rosterYear, grade: "", sectionId: "", search: "" };
  }, [data, filters, started]);

  if (query.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (query.isError || !data) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;

  const rows = data.rows;
  const groups = exportGroups(rows, data.sections, activeFilters.grade, t);

  return (
    <div className="bg-[#f8fafc] px-4 py-6 sm:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0f172a]">{t("admin:studentSectionsTitle")}</h2>
          <p className="text-sm text-[#6c757d]">{t("admin:placementSubtitle", { year: data.year, roster: data.rosterYear })}</p>
        </div>
        <Link to="/academics/students" className="text-sm font-bold text-[#0d6efd] no-underline">
          {t("admin:studentBack")}
        </Link>
      </div>
      {notice ? (
        <Alert tone={notice.tone === "warning" ? "warning" : notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          [t("admin:placementTotal"), data.stats.total],
          [t("admin:placementAssigned"), data.stats.assigned],
          [t("admin:placementOpen"), data.stats.unassigned],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-[#6c757d]">{label}</p>
            <p className="text-3xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <form
        className="mb-4 grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setStarted(true);
          setFilters({
            year: String(form.get("year") ?? ""),
            rosterYear: String(form.get("rosterYear") ?? ""),
            grade: String(form.get("grade") ?? ""),
            sectionId: String(form.get("sectionId") ?? ""),
            search: String(form.get("search") ?? ""),
          });
        }}
      >
        <label className="text-sm font-bold">
          {t("admin:placementYear")}
          <select className={field} name="year" defaultValue={data.year}>
            {data.years.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("admin:placementRosterYear")}
          <select className={field} name="rosterYear" defaultValue={data.rosterYear}>
            {data.rosterYears.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("admin:studentGradeLabel")}
          <select className={field} name="grade" defaultValue="">
            <option value="">{t("admin:placementAllGrades")}</option>
            <option value="unassigned">{t("admin:placementUnassigned")}</option>
            {[9, 10, 11, 12].map((grade) => (
              <option key={grade} value={grade}>
                {t("admin:studentGradeCard", { grade })}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("admin:studentSectionLabel")}
          <select className={field} name="sectionId" defaultValue="">
            <option value="">{t("admin:placementAllSections")}</option>
            {data.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {sectionTitle(section, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("admin:studentSearchLabel")}
          <input className={field} name="search" placeholder={t("admin:placementSearch")} />
        </label>
        <div className="flex gap-2 md:col-span-5">
          <button type="submit" className="rounded-md bg-[#212529] px-4 py-2 text-sm font-bold text-white">
            {t("admin:apply")}
          </button>
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm font-bold"
            onClick={() => {
              setStarted(true);
              setFilters({ year: data.year, rosterYear: data.rosterYear, grade: "", sectionId: "", search: "" });
            }}
          >
            {t("admin:studentClear")}
          </button>
        </div>
      </form>

      <form
        className="mb-4 rounded-2xl bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!window.confirm(t("admin:placementAutoConfirm"))) return;
          const form = new FormData(event.currentTarget);
          action.mutate(
            {
              path: "/admin/placement/auto",
              body: {
                year: data.year,
                rosterYear: data.rosterYear,
                gradeLevel: Number(form.get("autoGrade")),
                stream: String(form.get("autoStream")),
                mode: String(form.get("mode")),
              },
            },
            {
              onSuccess: (result) => {
                const body = result as { placed: number; left: number; mode: string };
                const mode = body.mode === "equal" ? t("admin:placementEqual") : t("admin:placementMerit");
                const extra = body.left > 0 ? ` ${t("admin:placementLeft", { count: body.left })}` : "";
                setNotice({ tone: "success", text: t("admin:placementDone", { mode, count: body.placed }) + extra });
              },
              onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
            },
          );
        }}
      >
        <h3 className="mb-1 font-extrabold">{t("admin:placementAuto")}</h3>
        <p className="mb-3 text-sm text-[#6c757d]">{t("admin:studentSectionsHint")}</p>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-bold">
            {t("admin:studentGradeLabel")}
            <select className={field} name="autoGrade" required defaultValue="9">
              {[9, 10, 11, 12].map((grade) => (
                <option key={grade} value={grade}>
                  {t("admin:studentGradeOption", { grade })}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            {t("admin:studentStreamLabel")}
            <select className={field} name="autoStream" defaultValue="Common">
              <option value="Common">Common</option>
              <option value="Natural">{t("admin:streamNatural")}</option>
              <option value="Social">{t("admin:streamSocial")}</option>
            </select>
          </label>
          <fieldset className="text-sm font-bold">
            <legend>{t("admin:placementMode")}</legend>
            <label className="mt-2 block font-normal">
              <input type="radio" name="mode" value="merit" defaultChecked /> {t("admin:placementMerit")}
            </label>
            <label className="block font-normal">
              <input type="radio" name="mode" value="equal" /> {t("admin:placementEqual")}
            </label>
          </fieldset>
          <div className="flex items-end">
            <button type="submit" className="rounded-md bg-[#0d6efd] px-4 py-2 font-bold text-white" disabled={action.isPending}>
              {t("admin:placementRun")}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-[#6c757d]">{t("admin:placementMeritHelp")}</p>
        <p className="text-sm text-[#6c757d]">{t("admin:placementEqualHelp")}</p>
      </form>

      <section className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <strong>{t("admin:placementTable", { count: rows.length })}</strong>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-sm font-bold"
              onClick={() => {
                if (groups.length === 0) {
                  window.alert(t("admin:placementPrintEmpty"));
                  return;
                }
                const popup = window.open("", "_blank");
                if (!popup) return;
                popup.document.write(pageHtml(t("admin:placementPrintTitle"), groups, data.year, t));
                popup.document.close();
                popup.focus();
                popup.print();
              }}
            >
              {t("admin:placementPrint")}
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-sm font-bold"
              onClick={() => {
                if (groups.length === 0) {
                  window.alert(t("admin:placementWordEmpty"));
                  return;
                }
                const html = pageHtml(t("admin:placementPrintTitle"), groups, data.year, t);
                const blob = new Blob([`\uFEFF${html}`], { type: "application/msword" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `Section_Lists_${data.year.replace(/[^A-Za-z0-9_-]/g, "_")}.doc`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Word
            </button>
          </div>
        </div>
        <p className="px-4 py-2 text-sm text-[#6c757d]">{t("admin:placementPrintHint")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f8fafc] text-left">
              <tr>
                <th className="px-3 py-2">{t("admin:placementNo")}</th>
                <th className="px-3 py-2">{t("admin:studentFullName")}</th>
                <th className="px-3 py-2">{t("admin:gender")}</th>
                <th className="px-3 py-2">{t("admin:studentAge")}</th>
                <th className="px-3 py-2">{t("admin:placementAvg")}</th>
                <th className="px-3 py-2">{t("admin:grade")}</th>
                <th className="px-3 py-2">{t("admin:section")}</th>
                <th className="px-3 py-2">{t("admin:placementPick")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center font-semibold text-[#6c757d]">
                    {t("admin:placementEmpty")}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-bold">{row.fullName}</td>
                    <td className="px-3 py-2">{genderText(row, t)}</td>
                    <td className="px-3 py-2">{row.age}</td>
                    <td className="px-3 py-2">{row.avg.toFixed(2)}</td>
                    <td className="px-3 py-2">{row.gradeLevel}</td>
                    <td className="px-3 py-2">{row.section?.trim() ? row.section : t("admin:placementUnassigned")}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={picked.includes(row.id)}
                        onChange={(event) =>
                          setPicked((current) => (event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id)))
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-4 rounded-2xl bg-white p-4">
        <h3 className="mb-3 font-extrabold">{t("admin:studentSectionStatus")}</h3>
        <ul className="space-y-3">
          {data.sections.map((section) => {
            const cap = Math.max(section.maxCapacity, 0);
            const width = cap === 0 ? 0 : Math.min(100, Math.round((section.current * 100) / cap));
            return (
              <li key={section.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{sectionTitle(section, t)}</span>
                  <strong>
                    {section.current} / {section.maxCapacity}
                  </strong>
                </div>
                <div className="h-2 overflow-hidden rounded bg-[#e9ecef]">
                  <div className={`h-full ${section.current >= section.maxCapacity && section.maxCapacity > 0 ? "bg-[#198754]" : "bg-[#0d6efd]"}`} style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <form
        className="mb-4 rounded-2xl bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (picked.length === 0) {
            setNotice({ tone: "warning", text: t("admin:placementPickOne") });
            return;
          }
          const classId = Number(new FormData(event.currentTarget).get("classId"));
          if (!classId) {
            setNotice({ tone: "warning", text: t("admin:placementPickSection") });
            return;
          }
          if (!window.confirm(t("admin:placementManualConfirm"))) return;
          action.mutate(
            { path: "/admin/placement/manual", body: { year: data.year, rosterYear: data.rosterYear, classId, studentIds: picked } },
            {
              onSuccess: () => {
                setPicked([]);
                setNotice({ tone: "success", text: t("admin:placementManualDone") });
              },
              onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
            },
          );
        }}
      >
        <h3 className="font-extrabold">{t("admin:placementManual")}</h3>
        <p className="mb-2 text-sm">{t("admin:placementPicked", { count: picked.length })}</p>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-md border px-3 py-2" name="classId" defaultValue="">
            <option value="">{t("admin:placementChooseSection")}</option>
            {data.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {sectionTitle(section, t)} ({section.current}/{section.maxCapacity})
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-md bg-[#198754] px-4 py-2 font-bold text-white">
            {t("admin:placementConfirm")}
          </button>
        </div>
      </form>

      <form
        className="rounded-2xl bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!window.confirm(t("admin:placementResetConfirm"))) return;
          const form = new FormData(event.currentTarget);
          action.mutate(
            {
              path: "/admin/placement/reset",
              body: {
                year: data.year,
                scope: String(form.get("scope")),
                gradeLevel: Number(form.get("gradeLevel")) || undefined,
                classId: Number(form.get("classId")) || undefined,
              },
            },
            {
              onSuccess: (result) => setNotice({ tone: "success", text: t("admin:placementResetDone", { count: (result as { cleared: number }).cleared }) }),
              onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
            },
          );
        }}
      >
        <h3 className="mb-2 font-extrabold">{t("admin:placementReset")}</h3>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-md border px-3 py-2" name="scope" defaultValue="grade">
            <option value="grade">{t("admin:placementResetGrade")}</option>
            <option value="section">{t("admin:placementResetSection")}</option>
            <option value="all">{t("admin:placementResetAll")}</option>
          </select>
          <select className="rounded-md border px-3 py-2" name="gradeLevel" defaultValue="9">
            {[9, 10, 11, 12].map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <select className="rounded-md border px-3 py-2" name="classId" defaultValue="">
            <option value="">{t("admin:placementChooseSection")}</option>
            {data.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {sectionTitle(section, t)}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-md bg-[#dc3545] px-4 py-2 font-bold text-white">
            {t("admin:placementResetButton")}
          </button>
        </div>
      </form>
    </div>
  );
}
