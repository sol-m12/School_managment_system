import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, CardBody, EmptyState } from "@/components/ui";
import { shortDate, useGroupHub, useSendGroupMessage, useStudentGroups } from "./studentApi";
import { StudentPanel } from "./StudentPanel";

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

export function GroupHubPage() {
  const { t } = useTranslation("student");
  const params = useParams();
  const groupId = Number(params.groupId);
  const query = useGroupHub(Number.isFinite(groupId) ? groupId : 0);
  const send = useSendGroupMessage(Number.isFinite(groupId) ? groupId : 0);
  const [text, setText] = useState("");
  return (
    <StudentPanel query={query}>
      {(data) => (
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <Card>
            <CardBody className="space-y-4">
              <h3 className="border-b border-border pb-2 font-bold">{t("members")}</h3>
              <ul className="space-y-2 text-sm">
                {data.members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-2">
                    <span>{member.fullName}</span>
                    {member.isLeader ? <Badge tone="warning">{t("leader")}</Badge> : null}
                  </li>
                ))}
              </ul>
              <h3 className="font-bold text-success">{t("receivedScores")}</h3>
              {data.scores.length === 0 ? (
                <p className="text-xs text-ink-muted">{t("notGraded")}</p>
              ) : (
                <ul className="space-y-2">
                  {data.scores.map((score) => (
                    <li key={score.id} className="rounded-control border-l-4 border-success bg-canvas px-2 py-2 text-sm">
                      <div className="flex justify-between gap-2 font-bold">
                        <span>{score.title}</span>
                        <span>{score.points}</span>
                      </div>
                      {score.feedback ? <p className="text-xs text-ink-muted">{score.feedback}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
              <h3 className="font-bold text-ink-muted">{t("assignedTasks")}</h3>
              {data.tasks.length === 0 ? (
                <p className="text-sm text-ink-muted">{t("noTasks")}</p>
              ) : (
                <ul className="space-y-2">
                  {data.tasks.map((task) => (
                    <li key={task.id} className="rounded-control border-l-4 border-brand-900 bg-surface px-2 py-2 text-sm shadow-soft">
                      <p className="font-bold">{task.title}</p>
                      <p className="text-xs text-ink-muted">
                        {t("maxScore", { score: task.maxScore })} · {shortDate(task.deadline)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card className="flex min-h-96 flex-col">
            <div className="rounded-t-card bg-brand-900 px-4 py-3 text-white">
              <h3 className="font-bold">
                {data.subjectName} - {data.groupName}
              </h3>
            </div>
            <div className="flex flex-1 flex-col gap-2 bg-brand-50 p-4">
              {data.messages.length === 0 ? <EmptyState title={t("writeMessage")} /> : null}
              {data.messages.map((message) => (
                <div key={message.id} className="max-w-[80%] rounded-card bg-surface px-3 py-2 text-sm shadow-soft">
                  <p className="text-xs font-bold text-brand-700">{message.sender}</p>
                  <p className="break-words">{message.text}</p>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-border p-3"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                const next = text.trim();
                if (!next) return;
                send.mutate(next, { onSuccess: () => setText("") });
              }}
            >
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t("writeMessage")}
                className="min-h-tap flex-1 rounded-full border border-border px-4"
              />
              <Button type="submit" loading={send.isPending}>
                {t("send")}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </StudentPanel>
  );
}

function AlertInfo({ children }: { children: string }) {
  return <div className="rounded-card border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">{children}</div>;
}
