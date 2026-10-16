import { type FormEvent, type ReactNode, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";

export function Panel<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  const { t } = useTranslation("errors");
  if (query.isPending) return <Spinner />;
  if (query.isError) return <Alert tone="danger">{t(toErrorKey(query.error))}</Alert>;
  return <>{children(query.data)}</>;
}

export function useNotice() {
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const view = notice ? (
    <Alert tone={notice.tone} className="mb-4">
      {notice.text}
    </Alert>
  ) : null;
  return { notice, setNotice, view };
}

export function pct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value}%`;
}

export function money(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function PassChart({ rows }: { rows: { year: string; passRate: number | null }[] }) {
  const { t } = useTranslation("principal");
  const data = rows.filter((row) => row.passRate != null);
  if (data.length === 0) return <p className="text-sm text-ink-muted">{t("noChart")}</p>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="passRate" stroke="#003366" fill="#c9d7e6" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GradeBars({ rows }: { rows: { gradeLevel: number; passRate: number | null }[] }) {
  const { t } = useTranslation("principal");
  const data = rows.filter((row) => row.passRate != null);
  if (data.length === 0) return <p className="text-sm text-ink-muted">{t("noChart")}</p>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="gradeLevel" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="passRate" fill="#0a4785" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function readForm(event: FormEvent<HTMLFormElement>): FormData {
  event.preventDefault();
  return new FormData(event.currentTarget);
}

export function textOf(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}
