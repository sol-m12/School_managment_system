import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useCastVote,
  useClubCatalog,
  useJoinClub,
  useMyClubs,
  useStudentElections,
  useWithdrawClub,
} from "./api/useClubs";

export function ClubsStudentPage() {
  const { t } = useTranslation(["clubs", "errors", "common"]);
  const [q, setQ] = useState("");
  const catalog = useClubCatalog(q);
  const mine = useMyClubs();
  const elections = useStudentElections();
  const join = useJoinClub();
  const withdraw = useWithdrawClub();
  const vote = useCastVote();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  return (
    <>
      <PageHeader title={t("studentTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardBody className="grid gap-4">
          <Input
            label={t("searchClubs")}
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          {catalog.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : catalog.isError ? (
            <Alert tone="danger">{t(`errors:${toErrorKey(catalog.error)}`)}</Alert>
          ) : (
            <Table
              columns={[
                { key: "name", header: t("clubName"), render: (row) => row.name },
                { key: "year", header: t("year"), render: (row) => row.year },
                { key: "patron", header: t("patron"), render: (row) => row.patronName || "—" },
                {
                  key: "president",
                  header: t("president"),
                  render: (row) => row.presidentName || "—",
                },
                {
                  key: "actions",
                  header: t("actions"),
                  render: (row) => (
                    <Button
                      type="button"
                      loading={join.isPending}
                      onClick={() =>
                        join.mutate(row.id, {
                          onSuccess: () =>
                            setNotice({ tone: "success", text: t("joinRequested") }),
                          onError: (error) =>
                            setNotice({
                              tone: "danger",
                              text: t(`errors:${toErrorKey(error)}`),
                            }),
                        })
                      }
                    >
                      {t("joinClub")}
                    </Button>
                  ),
                },
              ]}
              rows={catalog.data?.rows ?? []}
              rowKey={(row) => row.id}
              empty={t("emptyCatalog")}
            />
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-3 text-base font-bold text-brand-800">{t("myClubs")}</h2>
          {mine.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : (
            <Table
              columns={[
                { key: "name", header: t("clubName"), render: (row) => row.name },
                { key: "role", header: t("role"), render: (row) => row.role },
                { key: "status", header: t("status"), render: (row) => t(`member_${row.status}`) },
                {
                  key: "actions",
                  header: t("actions"),
                  render: (row) =>
                    row.status === "Pending" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        loading={withdraw.isPending}
                        onClick={() =>
                          withdraw.mutate(row.clubId, {
                            onSuccess: () =>
                              setNotice({ tone: "success", text: t("withdrawn") }),
                            onError: (error) =>
                              setNotice({
                                tone: "danger",
                                text: t(`errors:${toErrorKey(error)}`),
                              }),
                          })
                        }
                      >
                        {t("withdraw")}
                      </Button>
                    ) : null,
                },
              ]}
              rows={mine.data?.memberships ?? []}
              rowKey={(row) => row.memberId}
              empty={t("emptyMine")}
            />
          )}
          {(mine.data?.meetings.length ?? 0) > 0 ? (
            <div className="mt-4">
              <h3 className="mb-2 font-semibold">{t("upcomingMeetings")}</h3>
              <ul className="space-y-2 text-sm">
                {mine.data?.meetings.map((meeting) => (
                  <li key={meeting.id} className="rounded-lg border border-border bg-canvas px-3 py-2">
                    <strong>{meeting.title}</strong>
                    <div className="text-ink-muted">
                      {meeting.meetsOn}
                      {meeting.location ? ` · ${meeting.location}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-3 text-base font-bold text-brand-800">{t("elections")}</h2>
          {elections.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : (elections.data?.rows.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-muted">{t("emptyElections")}</p>
          ) : (
            <div className="space-y-4">
              {elections.data?.rows.map((election) => (
                <div key={election.id} className="rounded-lg border border-border p-4">
                  <div className="font-bold">
                    {election.title} · {election.clubName}
                  </div>
                  <div className="mb-2 text-sm text-ink-muted">
                    {election.opensOn} – {election.closesOn} · {t(`election_${election.status}`)}
                  </div>
                  {election.status === "Open" && !election.hasVoted ? (
                    <div className="flex flex-wrap gap-2">
                      {election.candidates.map((candidate) => (
                        <Button
                          key={candidate.studentId}
                          type="button"
                          variant="secondary"
                          loading={vote.isPending}
                          onClick={() =>
                            vote.mutate(
                              {
                                electionId: election.id,
                                candidateStudentId: candidate.studentId,
                              },
                              {
                                onSuccess: () =>
                                  setNotice({ tone: "success", text: t("voteCast") }),
                                onError: (error) =>
                                  setNotice({
                                    tone: "danger",
                                    text: t(`errors:${toErrorKey(error)}`),
                                  }),
                              },
                            )
                          }
                        >
                          {t("voteFor", { name: candidate.name })}
                        </Button>
                      ))}
                    </div>
                  ) : election.hasVoted ? (
                    <p className="text-sm text-success">{t("alreadyVoted")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
