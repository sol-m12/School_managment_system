import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import type { LabRow } from "./types";

export const virtualLabKeys = {
  all: ["student", "labs"] as const,
  byTenant: (tenantId: number) => [...virtualLabKeys.all, tenantId] as const,
};

export function useVirtualLabs() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: virtualLabKeys.byTenant(tenantId),
    queryFn: async () => (await api.get<{ labs: LabRow[] }>("/student/labs")).data,
  });
}
