import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string, extra = "") =>
  ["scholarships", tenantId, name, extra] as const;

export function useScholarshipSettings() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "settings"),
    queryFn: async () =>
      (await api.get<{ rows?: Array<{ academicYear: string; cutoffScore: number }> }>(
        "/scholarships/records/settings",
      )).data,
  });
}

export function useSaveScholarshipSettings() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { academicYear: string; cutoffScore: number }) =>
      (await api.put("/scholarships/records/settings", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["scholarships", tenantId] });
    },
  });
}

export function useScholarshipStudents() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "students"),
    queryFn: async () =>
      (await api.get<{ students: Array<{ id: number; name: string; label: string }> }>(
        "/scholarships/records/students",
      )).data,
  });
}

export function useImportScores() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      academicYear: string;
      rows: Array<{ studentId: number; nationalScore: number; transcriptRef: string }>;
    }) => (await api.post("/scholarships/records/scores", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["scholarships", tenantId] });
    },
  });
}

export function useStudentScholarships() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "student"),
    queryFn: async () =>
      (
        await api.get<{
          unlocked: boolean;
          score: number | null;
          cutoff: number | null;
          opportunities: Array<{ id: number; title: string; url: string; guidelines: string }>;
          applications: Array<{ id: number; opportunityId: number; status: string; title: string }>;
        }>("/scholarships/student")
      ).data,
  });
}

export function useApplyScholarship() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { opportunityId: number; note: string }) =>
      (await api.post("/scholarships/student/apply", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "student") });
    },
  });
}

export function useRequestLetter() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: number) =>
      (await api.post("/scholarships/student/request-letter", { applicationId })).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "student") });
    },
  });
}

export function useScholarshipOpportunities() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "opps"),
    queryFn: async () =>
      (
        await api.get<{
          rows: Array<{ id: number; title: string; url: string; guidelines: string; isActive: boolean }>;
        }>("/scholarships/opportunities")
      ).data,
  });
}

export function useSaveOpportunity() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      url: string;
      guidelines: string;
      isActive: boolean;
    }) => (await api.post("/scholarships/opportunities", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "opps") });
    },
  });
}

export function useRecommendQueue() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "queue"),
    queryFn: async () =>
      (
        await api.get<{
          rows: Array<{ id: number; studentName: string; title: string; note: string }>;
        }>("/scholarships/recommend/queue")
      ).data,
  });
}

export function useDraftRecommendation() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { applicationId: number; body: string }) =>
      (await api.post<{ id: number }>("/scholarships/recommend", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["scholarships", tenantId] });
    },
  });
}

export function useSignRecommendation() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post(`/scholarships/recommend/${id}/sign`)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["scholarships", tenantId] });
    },
  });
}
