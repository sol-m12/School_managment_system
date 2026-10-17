import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string) => ["operations", "parents", tenantId, name] as const;

export type ManagedParents = {
  parents: {
    userId: number;
    username: string;
    parentId: number | null;
    displayName: string;
    parentCode: string;
    isActive: boolean;
  }[];
  links: {
    linkId: number;
    parentId: number;
    parentCode: string;
    displayName: string;
    studentId: number;
    studentName: string;
    gradeLevel: number;
    section: string;
  }[];
};

export type ParentStudentOption = {
  id: number;
  name: string;
  gradeLevel: number;
  section: string;
};

export function useManagedParents() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "list"),
    queryFn: async () => (await api.get<ManagedParents>("/operations/parents")).data,
  });
}

export function useParentStudents() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "students"),
    queryFn: async () => (await api.get<{ rows: ParentStudentOption[] }>("/operations/parents/students")).data.rows,
  });
}

export function useCreateParent() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password: string; displayName: string }) =>
      api.post<{ userId: number; parentId: number; parentCode: string; username: string }>("/operations/parents", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "list") }),
  });
}

export function useLookupParent() {
  return useMutation({
    mutationFn: async (code: string) =>
      (await api.get<{ parentId: number; parentCode: string; displayName: string }>("/operations/parents/lookup", { params: { code } })).data,
  });
}

export function useLinkParent() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { parentCode: string; studentId: number }) =>
      api.post("/operations/parents/links", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "list") }),
  });
}

export function useUnlinkParent() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (linkId: number) => api.delete(`/operations/parents/links/${linkId}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "list") }),
  });
}
