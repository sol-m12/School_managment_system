import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge, Card, CardBody } from "@/components/ui";
import { useStudentGroups } from "./api/useStudentGroups";
import { StudentPanel } from "./components/StudentPanel";

export function GroupsPage() {
  const { t } = useTranslation("student");
  const query = useStudentGroups();
  return (
    <StudentPanel query={query}>
      {(data) => (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-brand-900">{t("groupsTitle")}</h2>
            <p className="text-sm text-ink-muted">{t("groupsSubtitle")}</p>
          </div>
          {data.rows.length === 0 ? (
            <AlertInfo>{t("noGroups")}</AlertInfo>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.rows.map((row) => (
                <Card key={row.id} className="overflow-hidden">
                  <div className="bg-brand-900 px-4 py-3 text-white">
                    <h3 className="truncate font-bold">{row.subjectName}</h3>
                  </div>
                  <CardBody className="flex h-full flex-col gap-3">
                    <div>
                      <p className="text-xs text-ink-muted">{t("groupName")}</p>
                      <p className="text-lg font-bold">{row.groupName}</p>
                    </div>
                    <Badge tone={row.isLeader ? "warning" : "info"}>{t(row.isLeader ? "leader" : "member")}</Badge>
                    <Link
                      to={`/student/groups/${row.id}`}
                      className="mt-auto inline-flex min-h-tap items-center justify-center rounded-control bg-brand-700 px-4 text-sm font-semibold text-white"
                    >
                      {t("enterGroup")}
                    </Link>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </StudentPanel>
  );
}

function AlertInfo({ children }: { children: string }) {
  return <div className="rounded-card border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">{children}</div>;
}
