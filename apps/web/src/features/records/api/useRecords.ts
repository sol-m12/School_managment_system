import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const root = ["records"] as const;

function useBoard<T>(name: string, path: string, enabled = true) {
  return useQuery({
    queryKey: [...root, name],
    queryFn: async () => (await api.get<T>(path)).data,
    enabled,
  });
}

function useRefresh() {
  const client = useQueryClient();
  return async () => {
    await client.invalidateQueries({ queryKey: root });
  };
}

export type Desk = { queue: number; waiting: number; locks: number; alumni: number; documents: number };

export type StudentOption = { id: number; fullName: string; gradeLevel: number; section: string; academicYear: string };

export type InboxRow = {
  id: number;
  student: string;
  subject: string;
  score: number;
  maxScore: number;
  year: string;
  gradeLevel: number;
  section: string;
};

export type QueueRow = {
  id: number;
  studentId: number;
  student: string;
  kind: "transcript" | "document";
  purpose: string;
  status: "Submitted" | "Reviewing" | "Ready" | "Collected";
  createdAt: string;
};

export type TranscriptRow = {
  id: number;
  student: string;
  kind: "transcript" | "cumulative";
  academicYear: string;
  verifyCode: string;
  summary: string;
  createdAt: string;
  qrSvg: string;
};

export type ArchiveBoard = {
  archives: { id: number; academicYear: string; gradeLevel: number; section: string; rowCount: number; createdAt: string }[];
  locks: { id: number; academicYear: string; gradeLevel: number; section: string; status: "Locked" | "Unlocked" }[];
};

export type RequestRow = {
  id: number;
  kind: "correction" | "unlock";
  gradeEntryId: number | null;
  academicYear: string;
  gradeLevel: number;
  section: string;
  proposedScore: number | null;
  reason: string;
  status: "Pending" | "Granted" | "Applied" | "Refused";
  principalNote: string;
  createdAt: string;
};

export type AcceptedMark = { id: number; student: string; subject: string; score: number; year: string };

export type RequestBoard = { rows: RequestRow[]; accepted?: AcceptedMark[] };

export type StaffBoard = {
  staff: { id: number; firstName: string; lastName: string; role: string; jobTitle: string }[];
  records: { id: number; staffId: number; kind: "credential" | "work" | "file"; title: string; body: string; createdAt: string }[];
};

export type FileRow = { id: number; studentId: number; student: string; title: string; createdAt: string };

export type AlumniRow = {
  id: number;
  studentId: number;
  fullName: string;
  gender: "M" | "F";
  section: string;
  graduationYear: string;
  note: string;
};

export type ExportBoard = {
  csv: string;
  rows: Record<string, string | number>[];
};

export type AccessRow = { id: number; actionType: string; targetCode: string; description: string; createdAt: string };

export type VerifyResult = {
  valid: boolean;
  student: string;
  kind: "transcript" | "cumulative";
  academicYear: string;
  issuedOn: string;
  school: string;
};

export const useRecordsDesk = () => useBoard<Desk>("desk", "/records/desk");
export const useRecordStudents = () => useBoard<{ rows: StudentOption[] }>("students", "/records/students");
export const useRecordInbox = () => useBoard<{ rows: InboxRow[] }>("inbox", "/records/inbox");
export const useRecordQueue = () => useBoard<{ rows: QueueRow[] }>("queue", "/records/queue");
export const useTranscripts = () => useBoard<{ rows: TranscriptRow[] }>("transcripts", "/records/transcripts");
export const useArchives = () => useBoard<ArchiveBoard>("archives", "/records/archives");
export const useRecordRequests = () => useBoard<RequestBoard>("requests", "/records/requests");
export const useRecordOverrides = () => useBoard<RequestBoard>("overrides", "/records/overrides");
export const useRecordStaff = () => useBoard<StaffBoard>("staff", "/records/staff");
export const useRecordFiles = () => useBoard<{ rows: FileRow[] }>("files", "/records/files");
export const useAccessLog = () => useBoard<{ rows: AccessRow[] }>("access", "/records/access");

export function useAlumni(filter: { q: string; year: string; gender: string }) {
  return useQuery({
    queryKey: [...root, "alumni", filter],
    queryFn: async () =>
      (
        await api.get<{ rows: AlumniRow[] }>("/records/alumni", {
          params: filter,
        })
      ).data,
  });
}

export function useMinistryExport(kind: "marks" | "alumni", year: string, enabled: boolean) {
  return useQuery({
    queryKey: [...root, "export", kind, year],
    queryFn: async () => (await api.get<ExportBoard>("/records/export", { params: { kind, year } })).data,
    enabled,
  });
}

export function useVerifyCode(code: string) {
  return useQuery({
    queryKey: ["verify", code],
    queryFn: async () => (await api.get<VerifyResult>("/public/verify", { params: { code } })).data,
    enabled: code.length >= 4,
    retry: false,
  });
}

function useSend<T>(path: (body: T) => Promise<unknown>) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: path,
    onSuccess: () => void refresh(),
  });
}

export const useAcceptMark = () => useSend((id: number) => api.post(`/records/inbox/${id}/accept`));
export const useAdvanceQueue = () => useSend((id: number) => api.post(`/records/queue/${id}/advance`));
export const useCreateTranscript = () =>
  useSend((body: { studentId: number; kind: "transcript" | "cumulative" }) => api.post("/records/transcripts", body));
export const useArchiveRoster = () =>
  useSend((body: { academicYear: string; gradeLevel: number; section: string }) => api.post("/records/archives", body));
export const useAskCorrection = () =>
  useSend((body: { gradeEntryId: number; proposedScore: number; reason: string }) => api.post("/records/corrections", body));
export const useApplyCorrection = () => useSend((id: number) => api.post(`/records/corrections/${id}/apply`));
export const useAskUnlock = () =>
  useSend((body: { academicYear: string; gradeLevel: number; section: string; reason: string }) => api.post("/records/unlocks", body));
export const useApplyUnlock = () => useSend((id: number) => api.post(`/records/unlocks/${id}/apply`));
export const useDecideOverride = () =>
  useSend((body: { id: number; action: "grant" | "refuse"; note: string }) =>
    api.post(`/records/overrides/${body.id}/decide`, { action: body.action, note: body.note }),
  );
export const useImportStudents = () =>
  useSend((body: { kind: "csv" | "structured" | "excel" | "pdf"; text: string }) => api.post("/records/imports", body));
export const useAddStaffRecord = () =>
  useSend((body: { staffId: number; kind: "credential" | "work" | "file"; title: string; body: string }) => api.post("/records/staff", body));
export const useAddAlumni = () =>
  useSend((body: { studentId: number; graduationYear: string; note: string }) => api.post("/records/alumni", body));

export function useSaveFile() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: FormData) => api.post("/records/files", body, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => void refresh(),
  });
}

export async function downloadRecordFile(id: number, title: string) {
  const response = await api.get<Blob>(`/records/files/${id}`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
