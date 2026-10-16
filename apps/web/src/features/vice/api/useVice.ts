import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string) => ["vice", tenantId, name] as const;

export type StudentOption = {
  id: number;
  name: string;
  gradeLevel: number;
  section: string | null;
};

export type ProgramRow = {
  id: number;
  name: string;
  trade: string;
  gradeLevel: number | null;
  capacity: number;
  status: "Open" | "Closed";
  description: string;
  filled: number;
};

export type PlacementRow = {
  id: number;
  programId: number;
  programName: string;
  studentId: number;
  studentName: string;
  status: "Applied" | "Placed" | "Completed" | "Withdrawn";
  note: string;
};

export type HearingRow = {
  id: number;
  heldOn: string;
  committee: string;
  outcome: "Pending" | "Upheld" | "Dismissed" | "Reduced";
  minutes: string;
};

export type PenaltyRow = {
  id: number;
  kind: "warning" | "detention" | "suspension" | "community";
  days: number;
  startsOn: string;
  note: string;
};

export type ReferralRow = {
  id: number;
  studentId: number;
  studentName: string;
  gradeLevel: number | null;
  section: string | null;
  category: "attendance" | "misconduct" | "academic" | "safety";
  severity: "low" | "medium" | "high";
  summary: string;
  status: "Escalated" | "Hearing" | "Decided" | "Closed";
  hearings: HearingRow[];
  penalties: PenaltyRow[];
};

export type DutyRow = {
  id: number;
  staffId: number;
  name: string;
  duty: "lead" | "assistant";
  source: "auto" | "manual";
};

export type SessionRow = {
  id: number;
  title: string;
  room: string;
  examDate: string;
  startTime: string;
  endTime: string;
  gradeLevel: number;
  section: string;
  needed: number;
  duties: DutyRow[];
};

export type AssignResult = {
  assigned: number;
  gaps: { sessionId: number; missing: number }[];
};

function useTenantKey() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return { tenantId, client };
}

export function useVocational() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "vocational"),
    queryFn: async () => {
      const response = await api.get<{ students: StudentOption[]; programs: ProgramRow[]; placements: PlacementRow[] }>("/vice/vocational");
      return response.data;
    },
  });
}

export function useSaveProgram() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { name: string; trade: string; gradeLevel: number | null; capacity: number; description: string }) =>
      api.post("/vice/programs", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "vocational") }),
  });
}

export function useProgramStatus() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { id: number; status: "Open" | "Closed" }) => api.patch(`/vice/programs/${body.id}`, { status: body.status }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "vocational") }),
  });
}

export function usePlaceStudent() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { programId: number; studentId: number; note: string }) => api.post("/vice/placements", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "vocational") }),
  });
}

export function usePlacementStatus() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { id: number; status: PlacementRow["status"] }) => api.patch(`/vice/placements/${body.id}`, { status: body.status }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "vocational") }),
  });
}

export function useBehavior() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "behavior"),
    queryFn: async () => {
      const response = await api.get<{ students: StudentOption[]; openCount: number; referrals: ReferralRow[] }>("/vice/behavior");
      return response.data;
    },
  });
}

export function useSaveReferral() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { studentId: number; category: ReferralRow["category"]; severity: ReferralRow["severity"]; summary: string }) =>
      api.post("/vice/referrals", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "behavior") }),
  });
}

export function useScheduleHearing() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { referralId: number; heldOn: string; committee: string; minutes: string }) =>
      api.post(`/vice/referrals/${body.referralId}/hearings`, { heldOn: body.heldOn, committee: body.committee, minutes: body.minutes }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "behavior") }),
  });
}

export function useHearingOutcome() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { id: number; outcome: HearingRow["outcome"]; minutes: string }) =>
      api.patch(`/vice/hearings/${body.id}`, { outcome: body.outcome, minutes: body.minutes }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "behavior") }),
  });
}

export function useSavePenalty() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { referralId: number; kind: PenaltyRow["kind"]; days: number; startsOn: string; note: string }) =>
      api.post(`/vice/referrals/${body.referralId}/penalties`, {
        kind: body.kind,
        days: body.days,
        startsOn: body.startsOn,
        note: body.note,
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "behavior") }),
  });
}

export function useCloseReferral() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (id: number) => api.post(`/vice/referrals/${id}/close`),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "behavior") }),
  });
}

export function useInvigilation() {
  const { tenantId } = useTenantKey();
  return useQuery({
    queryKey: key(tenantId, "invigilation"),
    queryFn: async () => {
      const response = await api.get<{ teachers: { id: number; name: string }[]; sessions: SessionRow[] }>("/vice/invigilation");
      return response.data;
    },
  });
}

export function useSaveSession() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      room: string;
      examDate: string;
      startTime: string;
      endTime: string;
      gradeLevel: number;
      section: string;
      needed: number;
    }) => {
      const response = await api.post<AssignResult & { id: number }>("/vice/sessions", body);
      return response.data;
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "invigilation") }),
  });
}

export function usePrepareDay() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: async (examDate: string) => {
      const response = await api.post<AssignResult & { created: number; sittings: number; weekday: string }>("/vice/invigilation/day", { examDate });
      return response.data;
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "invigilation") }),
  });
}

export function useAutoAssign() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<AssignResult>("/vice/invigilation/assign");
      return response.data;
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "invigilation") }),
  });
}

export function useManualDuty() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (body: { sessionId: number; staffId: number }) => api.post(`/vice/sessions/${body.sessionId}/invigilators`, { staffId: body.staffId }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "invigilation") }),
  });
}

export function useRemoveDuty() {
  const { tenantId, client } = useTenantKey();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/vice/invigilators/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "invigilation") }),
  });
}
