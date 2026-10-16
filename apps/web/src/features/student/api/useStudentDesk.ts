import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string) => ["student-desk", tenantId, name] as const;

function useTenantKey() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return { tenantId, client };
}

function useDesk<T>(name: string, path: string) {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, name),
    queryFn: async () => (await api.get<T>(path)).data,
  });
}

export type AttendanceDesk = {
  present: number;
  absent: number;
  tardy: number;
  rows: { id: number; date: string; status: "P" | "A" | "T"; approval: string; subject: string }[];
};

export type DisciplineDesk = {
  warnings: { id: number; text: string; startsOn: string }[];
  penalties: { id: number; kind: string; days: number; startsOn: string; note: string }[];
  commendations: { id: number; note: string; createdAt: string }[];
};

export type TimetableDesk = {
  gradeLevel: number;
  section: string;
  rows: { id: number; day: string; period: number; start: string; end: string; type: string; subject: string; teacher: string }[];
};

export type NoticeDesk = { rows: { id: number; title: string; content: string; urgent: boolean; startDate: string }[] };

export type AssignmentDesk = {
  notes: { id: number; title: string; hasFile: boolean }[];
  tasks: { id: number; title: string; subject: string; deadline: string | null; submitted: boolean }[];
};

export type VocationalDesk = {
  band: "none" | "explore" | "choose" | "continue";
  gradeLevel: number;
  canChoose: boolean;
  currentSkill: string | null;
  subjects: { id: number; name: string }[];
  programs: { id: number; name: string; trade: string; status: string; capacity: number; filled: number; mine: boolean }[];
};

export type LibraryDesk = {
  points: number;
  rank: "reader" | "member" | "scholar";
  borrowed: number;
  visits: number;
  loans: { id: number; title: string; status: string; borrowDate: string | null; returnDate: string | null; late: boolean }[];
  usage: { id: number; date: string | null; shift: string | null; bookTitle: string }[];
};

export type DocumentDesk = {
  gradeLevel: number;
  canRequest: boolean;
  rows: { id: number; kind: "transcript" | "document"; purpose: string; status: "Submitted" | "Reviewing" | "Ready" | "Collected"; createdAt: string }[];
};

export type HelpdeskDesk = {
  rows: { id: number; title: string; details: string; category: string; status: string; createdAt: string }[];
};

export type PlannerDesk = { items: { subject: string; reason: "weak" | "absent"; minutes: number }[] };

export type IdDesk = {
  code: string;
  qrSvg: string;
  fullName: string;
  username: string;
  gender: "M" | "F";
  age: number;
  gradeLevel: number;
  section: string;
  academicYear: string;
  photo: string | null;
};

export const useAttendanceDesk = () => useDesk<AttendanceDesk>("attendance", "/student/desk/attendance");
export const useDisciplineDesk = () => useDesk<DisciplineDesk>("discipline", "/student/desk/discipline");
export const useTimetableDesk = () => useDesk<TimetableDesk>("timetable", "/student/desk/timetable");
export const useNoticeDesk = () => useDesk<NoticeDesk>("notices", "/student/desk/notifications");
export const useAssignmentDesk = () => useDesk<AssignmentDesk>("assignments", "/student/desk/assignments");
export const useVocationalDesk = () => useDesk<VocationalDesk>("vocational", "/student/desk/vocational");
export const useLibraryDesk = () => useDesk<LibraryDesk>("library", "/student/desk/library");
export const useDocumentDesk = () => useDesk<DocumentDesk>("documents", "/student/desk/documents");
export const useHelpdeskDesk = () => useDesk<HelpdeskDesk>("helpdesk", "/student/desk/helpdesk");
export const usePlannerDesk = () => useDesk<PlannerDesk>("planner", "/student/desk/planner");
export const useIdDesk = () => useDesk<IdDesk>("id", "/student/desk/id");

export function useDeskSend<TBody>(name: string, send: (body: TBody) => Promise<unknown>) {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: send,
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, name) }),
  });
}

export const useChooseSkill = () =>
  useDeskSend<{ subjectId: number }>("vocational", (body) => api.post("/student/desk/vocational/choice", body));

export const useApplyProgram = () =>
  useDeskSend<{ programId: number; note: string }>("vocational", (body) => api.post("/student/desk/vocational/apply", body));

export const useSubmitWork = () =>
  useDeskSend<{ taskId: number; body: string }>("assignments", (body) => api.post(`/student/desk/assignments/${body.taskId}`, { body: body.body }));

export const useRequestDocument = () =>
  useDeskSend<{ kind: "transcript" | "document"; purpose: string }>("documents", (body) => api.post("/student/desk/documents", body));

export const useOpenQuery = () =>
  useDeskSend<{ title: string; details: string; category: string }>("helpdesk", (body) => api.post("/student/desk/helpdesk", body));

export function useCloseQuery() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (id: number) => api.post(`/student/desk/helpdesk/${id}/close`),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "helpdesk") }),
  });
}
