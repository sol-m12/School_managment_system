import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useAnnounceElection,
  useOpenElection,
  useOverseeClubs,
  useSetCharter,
} from "./api/useClubs";

export function ClubsOverseePage() {
  const { t } = useTranslation(["clubs", "errors", "common"]);
  const board = useOverseeClubs();
  const setCharter = useSetCharter();
  const openElection = useOpenElection();
  const announce = useAnnounceElection();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [electionForm, setElectionForm] = useState({
    title: "",
    opensOn: "",
    closesOn: "",
    candidateA: 0,
    candidateB: 0,
  });

  const students = board.data?.students ?? [];
  const candidateIds = useMemo(
    () => [electionForm.candidateA, electionForm.candidateB].filter((id) => id > 0),
    [electionForm.candidateA, electionForm.candidateB],
  );

  function onOpenElection(event: FormEvent) {
    event.preventDefault();
    if (candidateIds.length < 2 || new Set(candidateIds).size < 2) {
      setNotice({ tone: "danger", text: t("needTwoCandidates") });
      return;
    }
    openElection.mutate(
      {
        title: electionForm.title,
        opensOn: electionForm.opensOn,
        closesOn: electionForm.closesOn,
        candidateStudentIds: candidateIds,
      },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("electionOpened") });
          setElectionForm({
            title: "",
            opensOn: "",
            closesOn: "",
            candidateA: 0,
            candidateB: 0,
          });
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("overseeTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}

      {board.isPending ? (
        <Spinner label={t("common:loading")} />
      ) : board.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>
      ) : (
        <>
          <Card className="mb-6">
            <CardBody>
              <h2 className="mb-3 text-base font-bold text-brand-800">{t("charters")}</h2>
              <Table
                columns={[
                  { key: "name", header: t("clubName"), render: (row) => row.name },
                  { key: "year", header: t("year"), render: (row) => row.year },
                  {
                    key: "status",
                    header: t("charter"),
                    render: (row) => t(`charter_${row.charterStatus}`),
                  },
                  {
                    key: "actions",
                    header: t("actions"),
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        {row.charterStatus === "Pending" ? (
                          <Button
                            type="button"
                            loading={setCharter.isPending}
                            onClick={() =>
                              setCharter.mutate(
                                { id: row.id, action: "Approve" },
                                {
                                  onSuccess: () =>
                                    setNotice({
                                      tone: "success",
                                      text: t("charterApproved"),
                                    }),
                                  onError: (error) =>
                                    setNotice({
                                      tone: "danger",
                                      text: t(`errors:${toErrorKey(error)}`),
                                    }),
                                },
                              )
                            }
                          >
                            {t("approveCharter")}
                          </Button>
                        ) : null}
                        {row.charterStatus === "Approved" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            loading={setCharter.isPending}
                            onClick={() =>
                              setCharter.mutate(
                                { id: row.id, action: "Suspend" },
                                {
                                  onSuccess: () =>
                                    setNotice({
                                      tone: "success",
                                      text: t("charterSuspended"),
                                    }),
                                  onError: (error) =>
                                    setNotice({
                                      tone: "danger",
                                      text: t(`errors:${toErrorKey(error)}`),
                                    }),
                                },
                              )
                            }
                          >
                            {t("suspendCharter")}
                          </Button>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                rows={board.data?.clubs ?? []}
                rowKey={(row) => row.id}
                empty={t("emptyClubs")}
              />
            </CardBody>
          </Card>

          <Card className="mb-6">
            <CardBody>
              <h2 className="mb-3 text-base font-bold text-brand-800">{t("openElection")}</h2>
              <p className="mb-3 text-sm text-ink-muted">{t("electionHelp")}</p>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={onOpenElection}>
                <Input
                  label={t("electionTitle")}
                  value={electionForm.title}
                  required
                  onChange={(event) =>
                    setElectionForm({ ...electionForm, title: event.target.value })
                  }
                />
                <Input
                  label={t("opensOn")}
                  type="date"
                  value={electionForm.opensOn}
                  required
                  onChange={(event) =>
                    setElectionForm({ ...electionForm, opensOn: event.target.value })
                  }
                />
                <Input
                  label={t("closesOn")}
                  type="date"
                  value={electionForm.closesOn}
                  required
                  onChange={(event) =>
                    setElectionForm({ ...electionForm, closesOn: event.target.value })
                  }
                />
                <Select
                  label={t("candidate1")}
                  value={electionForm.candidateA ? String(electionForm.candidateA) : ""}
                  required
                  onChange={(event) =>
                    setElectionForm({
                      ...electionForm,
                      candidateA: Number(event.target.value) || 0,
                    })
                  }
                >
                  <option value="">{t("chooseStudent")}</option>
                  {students.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label={t("candidate2")}
                  value={electionForm.candidateB ? String(electionForm.candidateB) : ""}
                  required
                  onChange={(event) =>
                    setElectionForm({
                      ...electionForm,
                      candidateB: Number(event.target.value) || 0,
                    })
                  }
                >
                  <option value="">{t("chooseStudent")}</option>
                  {students.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
                </Select>
                <div className="md:col-span-2">
                  <Button type="submit" loading={openElection.isPending}>
                    {t("openElection")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-3 text-base font-bold text-brand-800">{t("elections")}</h2>
              <Table
                columns={[
                  { key: "title", header: t("electionTitle"), render: (row) => row.title },
                  { key: "club", header: t("clubName"), render: (row) => row.clubName },
                  {
                    key: "status",
                    header: t("status"),
                    render: (row) => t(`election_${row.status}`),
                  },
                  {
                    key: "actions",
                    header: t("actions"),
                    render: (row) =>
                      row.status === "Open" || row.status === "Closed" ? (
                        <Button
                          type="button"
                          loading={announce.isPending}
                          onClick={() =>
                            announce.mutate(
                              { id: row.id, setAsPresident: true },
                              {
                                onSuccess: () =>
                                  setNotice({
                                    tone: "success",
                                    text: t("electionAnnounced"),
                                  }),
                                onError: (error) =>
                                  setNotice({
                                    tone: "danger",
                                    text: t(`errors:${toErrorKey(error)}`),
                                  }),
                              },
                            )
                          }
                        >
                          {t("announceResults")}
                        </Button>
                      ) : (
                        row.winnerStudentId ?? "—"
                      ),
                  },
                ]}
                rows={board.data?.elections ?? []}
                rowKey={(row) => row.id}
                empty={t("emptyElections")}
              />
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
