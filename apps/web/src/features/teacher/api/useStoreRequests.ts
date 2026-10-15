import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type StoreBoard = {
  teacherName: string;
  available: boolean;
  stats: { total: number; pending: number; approved: number; holdings: number };
  items: { id: number; label: string; unitCost: number }[];
  requests: { ref: string; name: string; quantity: string; requestedAt: string; status: string }[];
  holdings: { code: string; name: string; kind: string; quantity: string; issuedAt: string; status: string }[];
};

export const storeRequestKeys = {
  all: ["teacher", "store"] as const,
  board: (tenantId: number) => [...storeRequestKeys.all, tenantId] as const,
};

export function useStoreBoard() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: storeRequestKeys.board(tenantId),
    queryFn: async () => (await api.get<StoreBoard>("/teacher/store-requests")).data,
  });
}

export function useStoreRequest() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: {
      itemId: number;
      customItemName?: string;
      estimatedUnitPrice?: number;
      quantity: number;
      purpose: string;
    }) => (await api.post<StoreBoard>("/teacher/store-requests", body)).data,
    onSuccess: (data) => client.setQueryData(storeRequestKeys.board(tenantId), data),
  });
}
