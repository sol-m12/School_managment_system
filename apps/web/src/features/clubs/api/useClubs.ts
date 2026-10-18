import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string, extra?: string) =>
  ["clubs", tenantId, name, extra ?? ""] as const;

export type ClubRow = {
  id: number;
  name: string;
  description: string;
  year: string;
  isActive: boolean;
  charterStatus: "Draft" | "Pending" | "Approved" | "Suspended";
  isStudentCouncil: boolean;
  patronStaffId: number | null;
  presidentStudentId: number | null;
  patronName: string;
  presidentName: string;
};

export type ClubBody = {
  name: string;
  description?: string;
  year: string;
  patronStaffId: number;
  presidentStudentId: number;
  isStudentCouncil?: boolean;
  isActive?: boolean;
};

export type ClubOptions = {
  teachers: { id: number; name: string }[];
  students: { id: number; name: string; label: string }[];
};

export function useClubOptions() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "options"),
    queryFn: async () => (await api.get<ClubOptions>("/clubs/options")).data,
  });
}

export function useManageClubs() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "manage"),
    queryFn: async () => (await api.get<{ rows: ClubRow[] }>("/clubs")).data,
  });
}

export function useSaveClub() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: number; body: ClubBody }) => {
      if (input.id) {
        return (await api.put<ClubRow>(`/clubs/${input.id}`, input.body)).data;
      }
      return (await api.post<ClubRow>("/clubs", input.body)).data;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "manage") });
    },
  });
}

export function useSubmitCharter() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<ClubRow>(`/clubs/${id}/submit-charter`)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "manage") });
    },
  });
}

export function useClubCatalog(q: string) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "catalog", q),
    queryFn: async () =>
      (await api.get<{ rows: ClubRow[] }>("/clubs/catalog", { params: { q } })).data,
  });
}

export function useMyClubs() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "mine"),
    queryFn: async () =>
      (
        await api.get<{
          memberships: {
            memberId: number;
            clubId: number;
            name: string;
            year: string;
            role: string;
            status: string;
            charterStatus: string;
          }[];
          meetings: {
            id: number;
            clubId: number;
            title: string;
            meetsOn: string;
            location: string;
          }[];
        }>("/clubs/mine")
      ).data,
  });
}

export function useJoinClub() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post(`/clubs/${id}/join`)).data,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: key(tenantId, "mine") }),
        client.invalidateQueries({ queryKey: key(tenantId, "catalog") }),
      ]);
    },
  });
}

export function useWithdrawClub() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/clubs/${id}/membership`)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "mine") });
    },
  });
}

export function useStudentElections() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "elections"),
    queryFn: async () =>
      (
        await api.get<{
          rows: {
            id: number;
            title: string;
            status: string;
            opensOn: string;
            closesOn: string;
            clubName: string;
            winnerStudentId: number | null;
            hasVoted: boolean;
            myCandidateStudentId: number | null;
            candidates: { studentId: number; name: string }[];
          }[];
        }>("/clubs/elections")
      ).data,
  });
}

export function useCastVote() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { electionId: number; candidateStudentId: number }) =>
      (
        await api.post(`/clubs/elections/${input.electionId}/vote`, {
          candidateStudentId: input.candidateStudentId,
        })
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "elections") });
    },
  });
}

export function usePatronClubs() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "patron"),
    queryFn: async () =>
      (
        await api.get<{
          rows: (ClubRow & {
            members: {
              memberId: number;
              studentId: number | null;
              name: string;
              role: string;
              status: string;
            }[];
            meetings: { id: number; title: string; meetsOn: string; location: string }[];
            reports: { id: number; title: string; reportDate: string }[];
          })[];
        }>("/clubs/patron")
      ).data,
  });
}

export function useDecideMember() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      clubId: number;
      memberId: number;
      action: "Approve" | "Reject";
    }) =>
      (
        await api.post(`/clubs/${input.clubId}/members/${input.memberId}/decide`, {
          action: input.action,
        })
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "patron") });
    },
  });
}

export function useAddMeeting() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      clubId: number;
      title: string;
      meetsOn: string;
      location?: string;
      notes?: string;
    }) =>
      (
        await api.post(`/clubs/${input.clubId}/meetings`, {
          title: input.title,
          meetsOn: input.meetsOn,
          location: input.location ?? "",
          notes: input.notes ?? "",
        })
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "patron") });
    },
  });
}

export function useAddReport() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      clubId: number;
      title: string;
      body: string;
      reportDate: string;
    }) =>
      (
        await api.post(`/clubs/${input.clubId}/reports`, {
          title: input.title,
          body: input.body,
          reportDate: input.reportDate,
        })
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "patron") });
    },
  });
}

export function useOverseeClubs() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "oversee"),
    queryFn: async () =>
      (
        await api.get<{
          clubs: ClubRow[];
          elections: {
            id: number;
            clubId: number;
            clubName: string;
            title: string;
            status: string;
            opensOn: string;
            closesOn: string;
            winnerStudentId: number | null;
          }[];
          students: { id: number; name: string; label: string }[];
        }>("/clubs/oversee")
      ).data,
  });
}

export function useSetCharter() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      action: "Approve" | "Suspend" | "Draft" | "Pending";
    }) =>
      (await api.post(`/clubs/${input.id}/charter`, { action: input.action })).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "oversee") });
    },
  });
}

export function useOpenElection() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      opensOn: string;
      closesOn: string;
      candidateStudentIds: number[];
    }) => (await api.post("/clubs/elections", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "oversee") });
    },
  });
}

export function useAnnounceElection() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; setAsPresident?: boolean }) =>
      (
        await api.post(`/clubs/elections/${input.id}/announce`, {
          setAsPresident: input.setAsPresident ?? true,
        })
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "oversee") });
    },
  });
}
