import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useAddMeeting,
  useAddReport,
  useDecideMember,
  usePatronClubs,
} from "./api/useClubs";

export function ClubsPatronPage() {
  const { t } = useTranslation(["clubs", "errors", "common"]);
  const board = usePatronClubs();
  const decide = useDecideMember();
  const addMeeting = useAddMeeting();
  const addReport = useAddReport();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    clubId: 0,
    title: "",
    meetsOn: "",
    location: "",
  });
  const [reportForm, setReportForm] = useState({
    clubId: 0,
    title: "",
    body: "",
    reportDate: "",
  });

  function onMeeting(event: FormEvent) {
    event.preventDefault();
    if (!meetingForm.clubId) return;
    addMeeting.mutate(
      {
        clubId: meetingForm.clubId,
        title: meetingForm.title,
        meetsOn: meetingForm.meetsOn,
        location: meetingForm.location,
      },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("meetingSaved") });
          setMeetingForm({ clubId: meetingForm.clubId, title: "", meetsOn: "", location: "" });
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  function onReport(event: FormEvent) {
    event.preventDefault();
    if (!reportForm.clubId) return;
    addReport.mutate(
      {
        clubId: reportForm.clubId,
        title: reportForm.title,
        body: reportForm.body,
        reportDate: reportForm.reportDate,
      },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("reportSaved") });
          setReportForm({
            clubId: reportForm.clubId,
            title: "",
            body: "",
            reportDate: "",
          });
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("patronTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      {board.isPending ? (
        <Spinner label={t("common:loading")} />
      ) : board.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>
      ) : (board.data?.rows.length ?? 0) === 0 ? (
        <Alert tone="info">{t("emptyPatron")}</Alert>
      ) : (
        <div className="space-y-6">
          {board.data?.rows.map((club) => (
            <Card key={club.id}>
              <CardBody className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-brand-800">{club.name}</h2>
                  <p className="text-sm text-ink-muted">
                    {club.year} · {t(`charter_${club.charterStatus}`)}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">{t("pendingMembers")}</h3>
                  {club.members.filter((m) => m.status === "Pending").length === 0 ? (
                    <p className="text-sm text-ink-muted">{t("noPending")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {club.members
                        .filter((m) => m.status === "Pending")
                        .map((member) => (
                          <li
                            key={member.memberId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                          >
                            <span>{member.name}</span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                loading={decide.isPending}
                                onClick={() =>
                                  decide.mutate(
                                    {
                                      clubId: club.id,
                                      memberId: member.memberId,
                                      action: "Approve",
                                    },
                                    {
                                      onSuccess: () =>
                                        setNotice({
                                          tone: "success",
                                          text: t("memberApproved"),
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
                                {t("approve")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                loading={decide.isPending}
                                onClick={() =>
                                  decide.mutate(
                                    {
                                      clubId: club.id,
                                      memberId: member.memberId,
                                      action: "Reject",
                                    },
                                    {
                                      onSuccess: () =>
                                        setNotice({
                                          tone: "success",
                                          text: t("memberRejected"),
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
                                {t("reject")}
                              </Button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <form className="grid gap-3 md:grid-cols-2" onSubmit={onMeeting}>
                  <h3 className="md:col-span-2 font-semibold">{t("scheduleMeeting")}</h3>
                  <Input
                    label={t("meetingTitle")}
                    value={meetingForm.clubId === club.id ? meetingForm.title : ""}
                    required
                    onFocus={() => setMeetingForm((f) => ({ ...f, clubId: club.id }))}
                    onChange={(event) =>
                      setMeetingForm({
                        ...meetingForm,
                        clubId: club.id,
                        title: event.target.value,
                      })
                    }
                  />
                  <Input
                    label={t("meetsOn")}
                    type="datetime-local"
                    value={meetingForm.clubId === club.id ? meetingForm.meetsOn : ""}
                    required
                    onFocus={() => setMeetingForm((f) => ({ ...f, clubId: club.id }))}
                    onChange={(event) =>
                      setMeetingForm({
                        ...meetingForm,
                        clubId: club.id,
                        meetsOn: event.target.value,
                      })
                    }
                  />
                  <Input
                    label={t("location")}
                    value={meetingForm.clubId === club.id ? meetingForm.location : ""}
                    onFocus={() => setMeetingForm((f) => ({ ...f, clubId: club.id }))}
                    onChange={(event) =>
                      setMeetingForm({
                        ...meetingForm,
                        clubId: club.id,
                        location: event.target.value,
                      })
                    }
                  />
                  <div className="self-end">
                    <Button type="submit" loading={addMeeting.isPending}>
                      {t("saveMeeting")}
                    </Button>
                  </div>
                </form>

                <form className="grid gap-3 md:grid-cols-2" onSubmit={onReport}>
                  <h3 className="md:col-span-2 font-semibold">{t("activityReport")}</h3>
                  <Input
                    label={t("reportTitle")}
                    value={reportForm.clubId === club.id ? reportForm.title : ""}
                    required
                    onFocus={() => setReportForm((f) => ({ ...f, clubId: club.id }))}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        clubId: club.id,
                        title: event.target.value,
                      })
                    }
                  />
                  <Input
                    label={t("reportDate")}
                    type="date"
                    value={reportForm.clubId === club.id ? reportForm.reportDate : ""}
                    required
                    onFocus={() => setReportForm((f) => ({ ...f, clubId: club.id }))}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        clubId: club.id,
                        reportDate: event.target.value,
                      })
                    }
                  />
                  <Input
                    label={t("reportBody")}
                    value={reportForm.clubId === club.id ? reportForm.body : ""}
                    required
                    onFocus={() => setReportForm((f) => ({ ...f, clubId: club.id }))}
                    onChange={(event) =>
                      setReportForm({
                        ...reportForm,
                        clubId: club.id,
                        body: event.target.value,
                      })
                    }
                  />
                  <div className="self-end">
                    <Button type="submit" loading={addReport.isPending}>
                      {t("saveReport")}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
