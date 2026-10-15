import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";

export function StudentPanel<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  const { t } = useTranslation(["errors", "common"]);
  if (query.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;
  }
  return children(query.data);
}
