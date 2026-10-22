import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string) => ["operations", tenantId, name] as const;

export type MissingAccounts = {
  students: { id: number; name: string; gradeLevel: number; section: string | null }[];
  staff: { id: number; name: string; role: string }[];
};

export type YearState = {
  academicYear: string | null;
  semester: string;
  gate: "open" | "locked";
  archived: string[];
};

export type TicketRow = {
  id: number;
  title: string;
  details: string;
  category: "account" | "network" | "hardware" | "marks" | "other";
  priority: "low" | "normal" | "urgent";
  status: "Open" | "InProgress" | "Resolved" | "Closed";
  openedBy: number;
  createdAt: string;
};

export type AuditRow = {
  id: number;
  userId: number;
  username: string | null;
  actionType: string;
  description: string | null;
  timestamp: string;
};

export type Monitoring = {
  channels: { emailReady: boolean; phoneReady: boolean };
  notices: { id: number; channel: string; recipient: string; referenceNo: string; subject: string; sentOn: string }[];
  runs: { id: number; action: string; status: string; note: string | null; createdAt: string }[];
};

export type HealthSnapshot = {
  activeUsers: number;
  totalUsers: number;
  failedLogins24h: number;
  memoryMb: number;
  uptimeSeconds: number;
  load: number[];
};

export type Duties = {
  academicYear: string;
  departments: string[];
  classes: { id: number; gradeLevel: number; section: string; stream: string | null; staffId: number | null; teacherName: string | null }[];
  heads: { id: number; department: string; staffId: number; teacherName: string }[];
  teachers: { id: number; name: string }[];
};

export function useMissingAccounts() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "identities"),
    queryFn: async () => (await api.get<MissingAccounts>("/operations/identities")).data,
  });
}

export function useProvisionAccount() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: "student" | "staff"; id: number }) =>
      api.post<{ username: string }>("/operations/identities", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "identities") }),
  });
}

export function useResetToId() {
  return useMutation({
    mutationFn: (userId: number) => api.post("/operations/passwords/default", { userId }),
  });
}

export function useYearAction() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: "lock" | "archive" | "rollover") => api.post<YearState>(`/operations/academic-year/${action}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", tenantId, "year"] });
    },
  });
}

export function useGradeProtocol() {
  return useMutation({
    mutationFn: (body: {
      action: "lock" | "unlock";
      studentId: number | null;
      subjectId: number;
      academicYear: string;
      semester: "1" | "2";
      reason: string;
    }) => api.post<{ updated: number }>("/operations/grades", body),
  });
}

export function useTickets() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "tickets"),
    queryFn: async () => (await api.get<{ rows: TicketRow[] }>("/operations/tickets")).data,
  });
}

export function useOpenTicket() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; details: string; category: TicketRow["category"]; priority: TicketRow["priority"] }) =>
      api.post("/operations/tickets", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "tickets") }),
  });
}

export function useTicketStatus() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: number; status: TicketRow["status"] }) =>
      api.patch(`/operations/tickets/${body.id}`, { status: body.status }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "tickets") }),
  });
}

export function useAudit() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "audit"),
    queryFn: async () => (await api.get<{ rows: AuditRow[] }>("/operations/audit")).data,
  });
}

export function useMonitoring() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "monitoring"),
    queryFn: async () => (await api.get<Monitoring>("/operations/monitoring")).data,
  });
}

export function useRecordNotice() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { channel: "letter" | "phone" | "email"; recipient: string; referenceNo: string; subject: string; sentOn: string }) =>
      api.post("/operations/notices", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "monitoring") }),
  });
}

export function useBackupCheck() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: "backup" | "restore") => api.post("/operations/backup-checks", { action }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "monitoring") }),
  });
}

/** Downloads SQL for the signed-in school only (tenant from JWT). */
export function useDownloadSchoolBackup() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.get<Blob>("/operations/backup/export", {
        responseType: "blob",
      });
      const contentType = String(response.headers["content-type"] ?? "");
      if (contentType.includes("application/json")) {
        const text = await response.data.text();
        let code = "INTERNAL_ERROR";
        try {
          const parsed = JSON.parse(text) as { code?: string };
          if (parsed.code) code = parsed.code;
        } catch {
          // keep default
        }
        throw Object.assign(new Error(code), { response: { data: { code } } });
      }
      const header = response.headers["content-disposition"];
      const match = typeof header === "string" ? /filename="([^"]+)"/i.exec(header) : null;
      const filename = match?.[1] ?? `school-tenant-${tenantId}-backup.sql`;
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "monitoring") }),
  });
}

export function useImportAccounts() {
  return useMutation({
    mutationFn: (csv: string) =>
      api.post<{ created: { line: number; username: string }[]; failed: { line: number; code: string }[] }>("/operations/import", { csv }),
  });
}

export function useHealth() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "health"),
    queryFn: async () => (await api.get<HealthSnapshot>("/operations/health")).data,
  });
}

export function useDuties() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "duties"),
    queryFn: async () => (await api.get<Duties>("/operations/duties")).data,
  });
}

export function useAssignHomeroom() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { classId: number; staffId: number }) => api.post("/operations/duties/homeroom", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "duties") }),
  });
}

export function useAssignHead() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { department: string; staffId: number }) => api.post("/operations/duties/department", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "duties") }),
  });
}
