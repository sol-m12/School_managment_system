import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type LostFoundItem = {
  id: number;
  kind: "Lost" | "Found";
  title: string;
  description: string;
  locationText: string;
  contactText: string;
  status: string;
  createdAt: string;
};

function key(tenantId: number, name: string) {
  return ["lostfound", tenantId, name] as const;
}

export function useLostBoard() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "board"),
    queryFn: async () => (await api.get<{ rows: LostFoundItem[] }>("/lostfound/board")).data,
  });
}

export function useLostMine() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "mine"),
    queryFn: async () => (await api.get<{ rows: LostFoundItem[] }>("/lostfound/mine")).data,
  });
}

export function useLostQueue() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "queue"),
    queryFn: async () => (await api.get<{ rows: LostFoundItem[] }>("/lostfound/queue")).data,
  });
}

export function usePostLostItem() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: {
      kind: "Lost" | "Found";
      title: string;
      description: string;
      locationText: string;
      contactText: string;
    }) => (await api.post("/lostfound", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["lostfound", tenantId] });
    },
  });
}

export function useModerateLostItem() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (input: { id: number; action: "Approve" | "Reject" | "Resolve" }) =>
      (await api.post(`/lostfound/${input.id}/moderate`, { action: input.action })).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["lostfound", tenantId] });
    },
  });
}
