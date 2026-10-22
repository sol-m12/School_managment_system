import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Desk = {
  pendingNotices: number;
  openTickets: number;
  appointments: number;
  draftStudents: number;
};

export type StudentRow = {
  id: number;
  fullName: string;
  gender: string;
  age: number;
  gradeLevel: number;
  section: string | null;
  academicYear: string | null;
  registrationType: string;
  username: string | null;
  submissionStatus: string;
};

export type NoticeRow = {
  id: number;
  title: string;
  content: string;
  targetRole: string;
  status: string;
  createdAt: string;
};

export type DocumentRow = {
  id: number;
  title: string;
  audience: string;
  fileNote: string;
  status: string;
  createdAt: string;
};

export type AppointmentRow = {
  id: number;
  visitorName: string;
  purpose: string;
  withRole: string;
  startsOn: string;
  startsAt: string;
  status: string;
};

export type TicketRow = {
  id: number;
  subject: string;
  details: string;
  routeTo: string;
  status: string;
  createdAt: string;
};

export type IdCard = {
  id: number;
  fullName: string;
  username: string | null;
  gradeLevel: number;
  section: string | null;
  academicYear: string | null;
  hasPhoto: boolean;
  code: string;
  qrSvg: string;
};

export type ParsedForm = {
  fullName: string;
  gender: "M" | "F" | null;
  age: number | null;
  gradeLevel: number | null;
  registrationType: string | null;
  previousSchool: string;
  kebele: string;
  gote: string;
  houseNumber: string;
};

function useBoard<T>(key: string, path: string) {
  return useQuery({
    queryKey: ["secretary", key],
    queryFn: async () => (await api.get<T>(path)).data,
  });
}

function useSend<TBody, TResult = unknown>(fn: (body: TBody) => Promise<{ data: TResult }>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: TBody) => (await fn(body)).data,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["secretary"] });
    },
  });
}

export const useSecretaryDesk = () => useBoard<Desk>("desk", "/secretary/desk");

export function useSecretaryStudents(filters: { search: string; grade: string; section: string }) {
  return useQuery({
    queryKey: ["secretary", "students", filters],
    queryFn: async () =>
      (await api.get<{ rows: StudentRow[]; year: string }>("/secretary/students", { params: filters })).data,
  });
}

export const useCleanup = () => useBoard<{ rows: { id: number; fixedCount: number; note: string; createdAt: string }[] }>("cleanup", "/secretary/cleanup");
export const useRenewals = () =>
  useBoard<{ rows: { id: number; studentId: number; student: string | null; fromYear: string; toYear: string; createdAt: string }[] }>(
    "renewals",
    "/secretary/renewals",
  );
export const useNotices = () => useBoard<{ rows: NoticeRow[] }>("notices", "/secretary/notices");
export const useDocuments = () => useBoard<{ rows: DocumentRow[] }>("documents", "/secretary/documents");
export const usePendingApprovals = () =>
  useBoard<{ notices: NoticeRow[]; documents: DocumentRow[] }>("pending", "/secretary/pending");
export const useAppointments = () => useBoard<{ rows: AppointmentRow[] }>("appointments", "/secretary/appointments");
export const useTickets = () => useBoard<{ rows: TicketRow[] }>("tickets", "/secretary/tickets");
export const useOcrScans = () =>
  useBoard<{ rows: { id: number; studentId: number | null; createdAt: string; parsed: ParsedForm }[] }>("ocr", "/secretary/ocr");

export function useIdCards(filters: { search: string; grade: string; section: string }) {
  return useQuery({
    queryKey: ["secretary", "id-cards", filters],
    queryFn: async () =>
      (await api.get<{ schoolName: string; rows: IdCard[] }>("/secretary/id-cards", { params: filters })).data,
  });
}

export const useRegisterStudent = () =>
  useSend<{
    fullName: string;
    gender: "M" | "F";
    age: number;
    gradeLevel: number;
    stream: "Common" | "Natural" | "Social" | null;
    registrationType: "አዲስ" | "ነባር" | "አቋራጭ" | "ደጋሚ" | "መልሶ ቅበላ";
    previousSchool?: string;
    kebele?: string;
    gote?: string;
    houseNumber?: string;
  }>(async (body) => api.post("/secretary/students", body));

export const useRunCleanup = () => useSend<Record<string, never>>(async () => api.post("/secretary/cleanup"));
export const useRenew = () =>
  useSend<{ studentIds?: number[]; code?: string; gradeLevel?: number; section?: string; toYear?: string }>(async (body) =>
    api.post("/secretary/renewals", body),
  );
export const useCreateNotice = () =>
  useSend<{ title: string; content: string; audienceKey: string; personId?: number }>(async (body) => api.post("/secretary/notices", body));
export const useDecideNotice = () =>
  useSend<{ id: number; decision: "approve" | "reject" }>(async (body) => api.post(`/secretary/notices/${body.id}/decide`, { decision: body.decision }));
export const useCreateDocument = () =>
  useSend<{ title: string; fileNote: string; audienceKey: string; personId?: number }>(async (body) => api.post("/secretary/documents", body));
export const useDecideDocument = () =>
  useSend<{ id: number; decision: "approve" | "reject" }>(async (body) => api.post(`/secretary/documents/${body.id}/decide`, { decision: body.decision }));
export const useCreateAppointment = () =>
  useSend<{ visitorName: string; purpose: string; withRole: string; startsOn: string; startsAt: string }>(async (body) =>
    api.post("/secretary/appointments", body),
  );
export const useAppointmentStatus = () =>
  useSend<{ id: number; status: "Scheduled" | "Done" | "Cancelled" }>(async (body) =>
    api.post(`/secretary/appointments/${body.id}/status`, { status: body.status }),
  );
export const useCreateTicket = () =>
  useSend<{ subject: string; details: string; routeTo: string }>(async (body) => api.post("/secretary/tickets", body));
export const useTicketStatus = () =>
  useSend<{ id: number; status: "Open" | "Routed" | "Closed" }>(async (body) =>
    api.post(`/secretary/tickets/${body.id}/status`, { status: body.status }),
  );
export const useScanForm = () => useSend<{ rawText: string }>(async (body) => api.post("/secretary/ocr", body));
export const useRegisterScan = () => useSend<{ scanId: number }>(async (body) => api.post("/secretary/ocr/register", body));
