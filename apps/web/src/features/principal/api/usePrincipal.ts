import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string) => ["principal", tenantId, name] as const;

export type YearPoint = {
  year: string;
  students: number;
  male: number;
  female: number;
  femaleShare: number | null;
  graded: number;
  passRate: number | null;
  presentRate: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  registration: { type: string; count: number }[];
};

export type PolicyRow = {
  id: number;
  title: string;
  body: string;
  area: "performance" | "policy" | "compliance";
  status: "Draft" | "Active" | "Retired";
  effectiveOn: string | null;
};

export type MessageRow = {
  id: number;
  kind: "announcement" | "emergency" | "memo" | "targeted" | "bulk";
  audience: string;
  title: string;
  body: string;
  createdAt: string;
};

export type InboxItem = {
  source: "store" | "registration" | "attendance" | "staff";
  sourceId: number;
  title: string;
  detail: string;
  status: string;
  ready: boolean;
};

export type StaffKpi = {
  id: number;
  name: string;
  periods: number;
  attendanceMarks: number;
  submitted: number;
  drafts: number;
  submissionRate: number | null;
};

export type DocumentRow = {
  id: number;
  title: string;
  body: string;
  status: "Draft" | "Signed" | "Rejected";
  signerName: string | null;
  signedAt: string | null;
};

export type CorrelationRow = {
  id: number;
  teacher: string;
  subject: string;
  gradeLevel: number;
  section: string | null;
  year: string;
  students: number;
  average: number | null;
};

export type TransferRow = {
  id: number;
  studentId: number;
  studentName: string;
  gradeLevel: number;
  section: string | null;
  destination: string;
  reason: string;
  libraryClear: boolean;
  storeClear: boolean;
  financeClear: boolean;
  status: "Open" | "Cleared" | "Issued";
  certificateNo: string | null;
};

export type RiskRow = {
  id: number;
  name: string;
  gradeLevel: number;
  section: string | null;
  average: number | null;
  absenceRate: number | null;
  score: number;
  band: "high" | "medium" | "low";
};

export type Insight = {
  code: "passDrop" | "gradeBehind" | "absenceHigh" | "submissionLow" | "genderGap" | "atRiskCount";
  value: number;
  grade?: number;
};

export type MoeReport = {
  schoolName: string;
  generatedOn: string;
  passMark: number;
  latestYear: string | null;
  teachers: number;
  approvedStaff: number;
  staffTotal: number;
  years: YearPoint[];
  grades: { gradeLevel: number; students: number; graded: number; passRate: number | null }[];
};

export type TrainingRow = {
  id: number;
  title: string;
  trainer: string;
  audience: string;
  scheduledOn: string;
  seats: number;
  notes: string | null;
};

export type ReportDef = { id: number; name: string; columns: string[] };

export type IncidentRow = {
  id: number;
  title: string;
  details: string;
  severity: "low" | "medium" | "high";
  status: "Open" | "Investigating" | "Resolved";
  studentId: number | null;
  createdAt: string;
};

export type Certificate = {
  number: string;
  studentName: string;
  gradeLevel: number;
  section: string | null;
  destination: string;
  reason: string;
  academicYear: string;
  issuedOn: string;
};

function useTenantKey() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return { tenantId, client };
}

export function useExecutive() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "executive"),
    queryFn: async () =>
      (
        await api.get<{
          passMark: number;
          latestYear: string | null;
          passRate: number | null;
          presentRate: number | null;
          incomeTotal: number;
          expenseTotal: number;
          approvedStaff: number;
          staffTotal: number;
          activePolicies: number;
          policies: PolicyRow[];
        }>("/principal/executive")
      ).data,
  });
}

export function useSavePolicy() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { title: string; body: string; area: string; status: string; effectiveOn: string | null }) =>
      api.post("/principal/policies", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "executive") }),
  });
}

export function usePolicyStatus() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { id: number; status: string }) => api.patch(`/principal/policies/${body.id}`, { status: body.status }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "executive") }),
  });
}

export function useTrends() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "trends"),
    queryFn: async () =>
      (
        await api.get<{
          passMark: number;
          latestYear: string | null;
          years: YearPoint[];
          grades: { gradeLevel: number; students: number; graded: number; passRate: number | null }[];
        }>("/principal/trends")
      ).data,
  });
}

export function usePremium() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "premium"),
    queryFn: async () =>
      (
        await api.get<{
          passMark: number;
          latestYear: string | null;
          forecast: { nextYear: string | null; passRate: number | null; enough: boolean };
          benchmarks: { gradeLevel: number; passRate: number | null; gap: number | null }[];
          schoolPassRate: number | null;
          years: { year: string; passRate: number | null }[];
          audit: { id: number; username: string | null; actionType: string; description: string | null; timestamp: string }[];
        }>("/principal/premium")
      ).data,
  });
}

export type MessageAudienceOptions = {
  groups: { key: string; labelKey: string }[];
  students: { id: number; label: string }[];
  teachers: { id: number; label: string }[];
  staff: { id: number; label: string }[];
};

export function useMessages(scope: "hub" | "bulk") {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, `messages-${scope}`),
    queryFn: async () => (await api.get<{ rows: MessageRow[] }>(`/principal/messages?scope=${scope}`)).data,
  });
}

export function useMessageAudienceOptions() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "message-options"),
    queryFn: async () => (await api.get<MessageAudienceOptions>("/principal/message-options")).data,
  });
}

export function useSendMessage(scope: "hub" | "bulk") {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { kind: string; audienceKey: string; personId?: number; title: string; body: string }) =>
      api.post("/principal/messages", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, `messages-${scope}`) }),
  });
}

export function useInbox() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "inbox"),
    queryFn: async () => (await api.get<{ items: InboxItem[] }>("/principal/inbox")).data,
  });
}

export function useDecide() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { source: string; sourceId: number; action: string; note: string }) => api.post("/principal/inbox", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "inbox") }),
  });
}

export function useStaffKpis() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "kpis"),
    queryFn: async () => (await api.get<{ rows: StaffKpi[] }>("/principal/staff-kpis")).data,
  });
}

export function useDocuments() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "documents"),
    queryFn: async () => (await api.get<{ rows: DocumentRow[] }>("/principal/documents")).data,
  });
}

export function useCreateDocument() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { title: string; body: string }) => api.post("/principal/documents", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "documents") }),
  });
}

export function useSignDocument() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { id: number; signerName: string }) => api.post(`/principal/documents/${body.id}/sign`, { signerName: body.signerName }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "documents") }),
  });
}

export function useRejectDocument() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (id: number) => api.post(`/principal/documents/${id}/reject`),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "documents") }),
  });
}

export function useAnalytics() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "analytics"),
    queryFn: async () =>
      (
        await api.get<{
          passMark: number;
          latestYear: string | null;
          schoolPassRate: number | null;
          years: { year: string; passRate: number | null; students: number }[];
          grades: { gradeLevel: number; students: number; graded: number; passRate: number | null }[];
        }>("/principal/analytics")
      ).data,
  });
}

export function useCorrelation() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "correlation"),
    queryFn: async () => (await api.get<{ rows: CorrelationRow[] }>("/principal/correlation")).data,
  });
}

export function useTransfers() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "transfers"),
    queryFn: async () =>
      (
        await api.get<{
          transfers: TransferRow[];
          students: { id: number; name: string; gradeLevel: number; section: string | null; year: string }[];
        }>("/principal/transfers")
      ).data,
  });
}

function useTransferMutation<T>(mutationFn: (body: T) => Promise<unknown>) {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn,
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "transfers") }),
  });
}

export function useOpenTransfer() {
  return useTransferMutation((body: { studentId: number; destination: string; reason: string }) => api.post("/principal/transfers", body));
}

export function useLibraryCheck() {
  return useTransferMutation((id: number) => api.post(`/principal/transfers/${id}/library`));
}

export function useSaveClearance() {
  return useTransferMutation((body: { id: number; libraryClear: boolean; storeClear: boolean; financeClear: boolean }) =>
    api.post(`/principal/transfers/${body.id}/clearance`, body),
  );
}

export function useIssueCertificate() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: async (id: number) => (await api.post<Certificate>(`/principal/transfers/${id}/certificate`)).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "transfers") }),
  });
}

export function useAtRisk() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "at-risk"),
    queryFn: async () => (await api.get<{ passMark: number; latestYear: string | null; rows: RiskRow[] }>("/principal/at-risk")).data,
  });
}

export function useMoeReport() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "moe"),
    queryFn: async () => (await api.get<MoeReport>("/principal/moe-report")).data,
  });
}

export function useTraining() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "training"),
    queryFn: async () => (await api.get<{ rows: TrainingRow[] }>("/principal/training")).data,
  });
}

export function useCreateTraining() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: {
      title: string;
      trainer: string;
      audienceKey: string;
      personId?: number;
      scheduledOn: string;
      seats: number;
      notes: string;
    }) => api.post("/principal/training", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "training") }),
  });
}

export function useReportDefs() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "reports"),
    queryFn: async () => (await api.get<{ rows: ReportDef[] }>("/principal/reports")).data,
  });
}

export function useSaveReport() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { name: string; columns: string[] }) => api.post<{ id: number }>("/principal/reports", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "reports") }),
  });
}

export function useRunReport() {
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<{ columns: string[]; rows: Record<string, string | number | null>[]; limited: boolean }>(`/principal/reports/${id}/run`)).data,
  });
}

export function useDeleteReport() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/principal/reports/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "reports") }),
  });
}

export function useWarnings() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "warnings"),
    queryFn: async () => (await api.get<{ latestYear: string | null; insights: Insight[]; rows: RiskRow[] }>("/principal/warnings")).data,
  });
}

export function useIncidents() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "incidents"),
    queryFn: async () => (await api.get<{ rows: IncidentRow[] }>("/principal/incidents")).data,
  });
}

export function useCreateIncident() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { title: string; details: string; severity: string; studentId: number | null }) => api.post("/principal/incidents", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "incidents") }),
  });
}

export function useIncidentStatus() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { id: number; status: string }) => api.patch(`/principal/incidents/${body.id}`, { status: body.status }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "incidents") }),
  });
}

export function useDemographics() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "demographics"),
    queryFn: async () => (await api.get<{ latestYear: string | null; years: YearPoint[] }>("/principal/demographics")).data,
  });
}
