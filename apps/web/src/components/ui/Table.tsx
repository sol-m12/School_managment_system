import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";
import { Spinner } from "./Spinner";

export type TableColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
};

export type TablePagination = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  caption?: string;
  loading?: boolean;
  empty?: ReactNode;
  pagination?: TablePagination;
};

export function Table<T>({ columns, rows, rowKey, caption, loading = false, empty, pagination }: TableProps<T>) {
  const { t } = useTranslation("common");

  return (
    <div className="min-w-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="bg-brand-900 text-left text-white">
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn("px-4 py-3 font-semibold whitespace-nowrap", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-brand-700">
                  <Spinner label={t("loading")} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>{empty}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-border last:border-b-0 hover:bg-canvas">
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-3 align-middle", column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination ? <Pagination {...pagination} /> : null}
    </div>
  );
}

function Pagination({ page, pageSize, total, onPageChange }: TablePagination) {
  const { t } = useTranslation("common");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={t("pagination.label")}
      className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-sm text-ink-muted"
    >
      <span>{t("pagination.range", { from, to, total })}</span>
      <div className="flex items-center gap-1">
        <IconButton
          label={t("pagination.previous")}
          icon={<ChevronLeft className="size-4" />}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="disabled:opacity-40"
        />
        <span className="px-2 whitespace-nowrap">{t("pagination.page", { page, pageCount })}</span>
        <IconButton
          label={t("pagination.next")}
          icon={<ChevronRight className="size-4" />}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="disabled:opacity-40"
        />
      </div>
    </nav>
  );
}
