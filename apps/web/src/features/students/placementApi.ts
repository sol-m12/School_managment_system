import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type PlacementRow = {
  id: number;
  fullName: string;
  gender: "M" | "F";
  genderKey: "M" | "F" | "O";
  age: number;
  gradeLevel: number;
  stream: string | null;
  section: string | null;
  avg: number;
  classId: number | null;
};

export type PlacementSection = {
  id: number;
  gradeLevel: number;
  stream: "Natural" | "Social" | null;
  section: string;
  maxCapacity: number;
  current: number;
};

export type PlacementPage = {
  year: string;
  rosterYear: string;
  years: string[];
  rosterYears: string[];
  stats: { total: number; assigned: number; unassigned: number };
  sections: PlacementSection[];
  rows: PlacementRow[];
};

export type PlacementFilters = {
  year?: string;
  rosterYear?: string;
  grade?: string;
  sectionId?: string;
  search?: string;
};

export function usePlacement(filters: PlacementFilters) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: ["admin", tenantId, "placement", filters],
    queryFn: async () => (await api.get<PlacementPage>("/admin/placement", { params: filters })).data,
  });
}

export function usePlacementAction() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (action: { path: string; body: unknown }) => (await api.post(action.path, action.body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin", tenantId, "placement"] });
      await client.invalidateQueries({ queryKey: ["admin", tenantId, "students"] });
    },
  });
}
