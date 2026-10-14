import { useEffect, useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { toErrorKey } from "@/lib/apiError";
import { useStudentIds, type StudentIdCard } from "./api/useTechnician";

const GRADES = ["9", "10", "11", "12"] as const;

function CircularStamp({ label }: { label: string }) {
  const rawId = useId().replace(/:/g, "");
  const pathId = `stamp-${rawId}`;
  const ring = `${label}  •  ${label}  •  `;

  return (
    <div className="relative size-[104px] shrink-0" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="size-full text-[#1e3c72]">
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <defs>
          <path id={pathId} d="M50,50 m-34,0 a34,34 0 1,1 68,0 a34,34 0 1,1 -68,0" />
        </defs>
        <text fill="currentColor" fontSize="6.4" fontWeight="700" fontFamily="Segoe UI, Noto Sans Ethiopic, sans-serif">
          <textPath href={`#${pathId}`}>{ring}</textPath>
        </text>
        <text x="50" y="53" textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor">
          ★
        </text>
      </svg>
    </div>
  );
}

function IdPhoto({ card }: { card: StudentIdCard }) {
  const { t } = useTranslation("technician");
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!card.hasPhoto) return;
    let objectUrl = "";
    let cancel = false;
    void api
      .get(`/technician/student-ids/${card.id}/photo`, { responseType: "blob" })
      .then((response) => {
        if (cancel) return;
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));
    return () => {
      cancel = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [card.hasPhoto, card.id]);

  if (!url) {
    return <span className="px-2">{t("noPhoto")}</span>;
  }
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}

export function StudentIdPage() {
  const { t } = useTranslation(["technician", "errors", "common"]);
  const [draft, setDraft] = useState({ search: "", grade: "", section: "" });
  const [filters, setFilters] = useState(draft);
  const query = useStudentIds(filters);
  const schoolName = query.data?.schoolName || t("cardSchoolFallback");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(draft);
  }

  return (
    <div className="print:bg-white">
      <Card className="mb-4 print:hidden">
        <CardBody>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink-strong">{t("idTitle")}</h1>
            <div className="flex gap-2">
              <Link to="/dashboard" className="inline-flex min-h-tap items-center rounded-control border border-border bg-surface px-3 text-sm">
                {t("home")}
              </Link>
              <Button type="button" onClick={() => window.print()}>
                {t("printAll")}
              </Button>
            </div>
          </div>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
            <Input
              label={t("searchLabel")}
              placeholder={t("searchPlaceholder")}
              value={draft.search}
              onChange={(event) => setDraft({ ...draft, search: event.target.value })}
            />
            <Select
              label={t("grade")}
              value={draft.grade}
              placeholder={t("allGrades")}
              options={GRADES.map((grade) => ({ value: grade, label: t("gradeN", { grade }) }))}
              onChange={(event) => setDraft({ ...draft, grade: event.target.value })}
            />
            <Input
              label={t("section")}
              value={draft.section}
              onChange={(event) => setDraft({ ...draft, section: event.target.value })}
            />
            <div className="flex items-end">
              <Button type="submit">{t("search")}</Button>
            </div>
          </form>
        </CardBody>
      </Card>
      {query.isPending ? (
        <div className="flex justify-center py-8 print:hidden">
          <Spinner label={t("common:loading")} />
        </div>
      ) : query.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {query.data.rows.map((card) => (
            <article key={card.id} className="relative flex h-[320px] flex-col overflow-hidden rounded-[15px] border-2 border-[#1e3c72] bg-white shadow-[0_10px_20px_rgba(0,0,0,0.1)]">
              <div className="absolute inset-y-0 left-0 flex w-10 items-center justify-center bg-[#1e3c72]">
                <span className="-rotate-90 whitespace-nowrap text-[0.7rem] font-bold tracking-[2px] text-white uppercase">
                  {t("cardSystem")}
                </span>
              </div>
              <div className="ml-10 flex min-h-0 flex-1 flex-col">
                <header className="border-b-2 border-[#1e3c72] bg-[#f8f9fa] px-3 py-3 text-center">
                  <h2 className="text-[1.1rem] font-black text-[#1e3c72]">{schoolName}</h2>
                  <span className="text-[0.7rem] font-semibold text-[#555] uppercase">{t("cardKind")}</span>
                  <div className="text-[0.7rem] font-bold text-[#1e3c72]">{t("cardKindLabel")}</div>
                </header>
                <div className="flex flex-1 items-center gap-5 px-4 py-3">
                  <div className="flex h-[145px] w-[125px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-[#1e3c72] bg-[#fdfdfd] text-center text-[0.7rem] font-bold text-[#1e3c72]">
                    <IdPhoto card={card} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-3 border-b border-[#ddd] text-[1.4rem] font-extrabold text-black">{card.fullName}</h3>
                    <p className="text-[0.8rem] font-bold text-[#1e3c72]">
                      {t("idNo")} <span className="text-black">{card.id}</span>
                    </p>
                    <p className="text-[0.8rem] font-bold text-[#1e3c72]">
                      {t("systemUsername")} <span className="text-black">{card.username ?? ""}</span>
                    </p>
                  </div>
                  <CircularStamp label={schoolName} />
                </div>
                <p className="px-4 pb-3 text-center text-[0.7rem] text-[#555]">{t("cardNote")}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
