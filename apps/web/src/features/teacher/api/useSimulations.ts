import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type SimClass = { value: string; label: string; subjects: string[] };
export type SimItem = {
  id: number;
  gradeLevel: number | null;
  section: string;
  subjectName: string | null;
  simTitle: string | null;
  simUrl: string | null;
};

export type SimulationBoard = { academicYear: string; classes: SimClass[]; items: SimItem[] };

export const simulationKeys = {
  all: ["teacher", "simulations"] as const,
  board: (tenantId: number) => [...simulationKeys.all, tenantId] as const,
};

export function useSimulations() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: simulationKeys.board(tenantId),
    queryFn: async () => (await api.get<SimulationBoard>("/teacher/simulations")).data,
  });
}

export function useAddSimulation() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: { gradeLevel: number; section: string; subjectName: string; simTitle: string; simUrl?: string }) =>
      (await api.post("/teacher/simulations", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: simulationKeys.board(tenantId) }),
  });
}

export function useRemoveSimulation() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/teacher/simulations/${id}`)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: simulationKeys.board(tenantId) }),
  });
}
