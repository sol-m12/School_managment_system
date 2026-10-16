import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string) => ["teacher-office", tenantId, name] as const;

function useTenantKey() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return { tenantId, client };
}

function useOffice<T>(name: string, path: string) {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, name),
    queryFn: async () => (await api.get<T>(path)).data,
  });
}

function useOfficeSend<TBody>(name: string, send: (body: TBody) => Promise<unknown>) {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: send,
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, name) }),
  });
}

export type OfficeStudent = { id: number; name: string };
export type OfficeSubject = { id: number; name: string };

export type AttendanceGroup = {
  subjectId: number;
  subject: string;
  classLabel: string;
  students: OfficeStudent[];
};

export type SyncResult = {
  synced: number;
  conflicts: { studentId: number; subjectId: number; date: string; code: "NOT_ASSIGNED" | "ALREADY_APPROVED" }[];
};

export type SlotRow = {
  id: number;
  day: string;
  period: number;
  start: string;
  end: string;
  classLabel: string;
  subject: string;
  teacherId: number | null;
  teacherName: string;
};

export type CoverRow = {
  id: number;
  timetableId: number;
  coverDate: string;
  substituteStaffId: number;
  substituteName: string;
  reason: string;
};

export type IncidentRow = {
  id: number;
  studentId: number;
  studentName: string;
  subjectId: number;
  subject: string;
  category: "attendance" | "academic" | "behavior" | "safety";
  summary: string;
  status: "Open" | "Acknowledged" | "Closed";
  recordedBy: number;
};

export type LeaveRow = {
  id: number;
  staffId?: number;
  teacherName?: string;
  kind: "sick" | "personal" | "annual";
  startsOn: string;
  endsOn: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Withdrawn";
};

export type QuestionRow = {
  id: number;
  subjectId: number;
  subject: string;
  topic: string;
  stem: string;
  correct: "A" | "B" | "C" | "D";
  points: number;
};

export type PaperRow = {
  id: number;
  subjectId: number;
  subject: string;
  title: string;
  count: number;
  status: "Open" | "Closed";
};

export function useAttendanceBoard() {
  return useOffice<{ academicYear: string; groups: AttendanceGroup[] }>("attendance", "/teacher/office/attendance");
}

export function useSyncAttendance() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: async (marks: { studentId: number; subjectId: number; date: string; status: "P" | "A" | "T" }[]) =>
      (await api.post<SyncResult>("/teacher/office/attendance/sync", { marks })).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "attendance") }),
  });
}

export function useTimetable() {
  return useOffice<{
    academicYear: string;
    mine: SlotRow[];
    school: SlotRow[];
    substitutions: CoverRow[];
    teachers: { id: number; name: string }[];
  }>("timetable", "/teacher/office/timetable");
}

export function useSwapPeriods() {
  return useOfficeSend("timetable", (body: { leftId: number; rightId: number }) => api.post("/teacher/office/swaps", body));
}

export function useAddCover() {
  return useOfficeSend(
    "timetable",
    (body: { timetableId: number; coverDate: string; substituteStaffId: number; reason: string }) =>
      api.post("/teacher/office/substitutions", body),
  );
}

export function useCancelCover() {
  return useOfficeSend("timetable", (id: number) => api.delete(`/teacher/office/substitutions/${id}`));
}

export function useIncidents() {
  return useOffice<{ mine: IncidentRow[]; inbox: IncidentRow[] }>("incidents", "/teacher/office/incidents");
}

export function useReportIncident() {
  return useOfficeSend(
    "incidents",
    (body: { studentId: number; subjectId: number; category: IncidentRow["category"]; summary: string }) =>
      api.post("/teacher/office/incidents", body),
  );
}

export function useIncidentAction() {
  return useOfficeSend("incidents", (body: { id: number; action: "acknowledge" | "close" }) =>
    api.patch(`/teacher/office/incidents/${body.id}`, { action: body.action }),
  );
}

export function useLeave() {
  return useOffice<{ mine: LeaveRow[]; inbox: LeaveRow[] }>("leave", "/teacher/office/leave");
}

export function useRequestLeave() {
  return useOfficeSend(
    "leave",
    (body: { kind: LeaveRow["kind"]; startsOn: string; endsOn: string; reason: string }) => api.post("/teacher/office/leave", body),
  );
}

export function useLeaveAction() {
  return useOfficeSend("leave", (body: { id: number; action: "withdraw" | "approve" | "reject" }) =>
    api.patch(`/teacher/office/leave/${body.id}`, { action: body.action }),
  );
}

export function useLibrary() {
  return useOffice<{
    borrowed: { id: number; title: string; author: string; borrowDate: string | null }[];
    subjects: OfficeSubject[];
    recommendations: { id: number; subject: string; title: string; author: string; reason: string }[];
  }>("library", "/teacher/office/library");
}

export function useRecommendBook() {
  return useOfficeSend(
    "library",
    (body: { subjectId: number; title: string; author: string; reason: string }) => api.post("/teacher/office/recommendations", body),
  );
}

export function useQuestions() {
  return useOffice<{ subjects: OfficeSubject[]; questions: QuestionRow[]; papers: PaperRow[] }>("questions", "/teacher/office/questions");
}

export function useAddQuestion() {
  return useOfficeSend("questions", (body: Record<string, unknown>) => api.post("/teacher/office/questions", body));
}

export function useGeneratePaper() {
  return useOfficeSend("questions", (body: { subjectId: number; title: string; count: number }) => api.post("/teacher/office/papers", body));
}

export function useClosePaper() {
  return useOfficeSend("questions", (id: number) => api.patch(`/teacher/office/papers/${id}`));
}

export function useParticipation(subjectId: string, date: string) {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: [...key(tenantId, "participation"), subjectId, date],
    queryFn: async () => {
      const response = await api.get<{
        date: string;
        subjects: OfficeSubject[];
        students: { id: number; name: string; marked: boolean }[];
      }>("/teacher/office/participation", { params: { subjectId: subjectId || undefined, date: date || undefined } });
      return response.data;
    },
  });
}

export function useMarkParticipation() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { studentId: number; subjectId: number; markedOn: string }) => api.post("/teacher/office/participation", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "participation") }),
  });
}

export function useHomeroomList() {
  return useOffice<{ academicYear: string; students: { id: number; name: string; gradeLevel: number; section: string }[] }>(
    "student-360",
    "/teacher/office/student-360",
  );
}

export function useStudent360(studentId: number | null) {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: [...key(tenantId, "student-360-detail"), studentId],
    enabled: studentId != null,
    queryFn: async () =>
      (
        await api.get<{
          student: { id: number; name: string; gradeLevel: number; section: string };
          attendance: { present: number; absent: number; tardy: number };
          average: number | null;
          openIncidents: number;
          borrowedBooks: number;
          participation: number;
          referrals: number;
          grades: { subject: string; score: number; maxScore: number; status: string | null }[];
        }>(`/teacher/office/student-360/${studentId}`)
      ).data,
  });
}

export type PlanRow = { id: number; subject: string; week: number; topic: string; status: "Draft" | "Approved" };

export function useCurriculum() {
  return useOffice<{
    department: string;
    subjects: OfficeSubject[];
    plans: PlanRow[];
    standards: { id: number; subject: string; assessmentName: string; maxScore: number }[];
  }>("curriculum", "/teacher/office/curriculum");
}

export function useApprovePlan() {
  return useOfficeSend("curriculum", (id: number) => api.post(`/teacher/office/plans/${id}/approve`));
}

export function useSaveStandard() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { subjectId: number; assessmentName: string; maxScore: number }) => api.post("/teacher/office/standards", body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key(tenantId, "curriculum") });
    },
  });
}

export type GradeFlowRow = {
  id: number;
  student: string;
  subject: string;
  score: number;
  maxScore: number;
  assessment: string;
  status: string | null;
  review: "Approved" | "Sent" | null;
};

export function useGradeFlow() {
  return useOffice<{ department: string; rows: GradeFlowRow[] }>("grades", "/teacher/office/grades");
}

export function useApproveGrade() {
  return useOfficeSend("grades", (id: number) => api.post(`/teacher/office/grades/${id}/approve`));
}

export function useSendGrade() {
  return useOfficeSend("grades", (id: number) => api.post(`/teacher/office/grades/${id}/send`));
}

export function useRequisitions() {
  return useOffice<{
    department: string;
    rows: { id: number; itemName: string; quantity: number; purpose: string; status: "Submitted" | "Sent" }[];
  }>("requisitions", "/teacher/office/requisitions");
}

export function useAddRequisition() {
  return useOfficeSend("requisitions", (body: { itemName: string; quantity: number; purpose: string }) =>
    api.post("/teacher/office/requisitions", body),
  );
}

export function useSendRequisition() {
  return useOfficeSend("requisitions", (id: number) => api.post(`/teacher/office/requisitions/${id}/send`));
}

export function useCoverage() {
  return useOffice<{
    department: string;
    subjects: { id: number; name: string; total: number; covered: number; percent: number }[];
    topics: { id: number; subject: string; week: number; topic: string; status: "Draft" | "Approved"; covered: boolean }[];
  }>("coverage", "/teacher/office/coverage");
}

export function useMarkCovered() {
  return useOfficeSend("coverage", (body: { planDetailId: number; coveredOn: string }) => api.post("/teacher/office/coverage", body));
}

export function useEvaluations() {
  return useOffice<{
    department: string;
    criteria: { key: string; max: number }[];
    teachers: { id: number; name: string }[];
    rows: { id: number; teacher: string; term: "1" | "2"; total: number; max: number; note: string }[];
  }>("evaluations", "/teacher/office/evaluations");
}

export function useSaveEvaluation() {
  return useOfficeSend(
    "evaluations",
    (body: { staffId: number; term: "1" | "2"; note: string; scores: Record<string, number> }) =>
      api.post("/teacher/office/evaluations", body),
  );
}
