import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type TeacherGender = "Male" | "Female";

export type TeacherRow = {
  id: number;
  firstName: string;
  lastName: string;
  gender: string | null;
  jobTitle: string;
  phoneNumber: string | null;
  salary: number;
  experienceYears: number;
  subjects: string;
  loadHours: number;
  homeroom: string | null;
  isHomeroomAssigned: boolean;
  isApproved: boolean;
  isActive: boolean;
};

export type TeacherList = { academicYear: string; total: number; rows: TeacherRow[] };

export type TeacherUpdateBody = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  gender: TeacherGender | null;
  jobTitle: string;
  salary: number;
  experienceYears: number;
};

export const teacherKeys = {
  all: (tenantId: number) => ["teachers", tenantId] as const,
  list: (tenantId: number) => ["teachers", tenantId, "list"] as const,
};

export function useTeachers() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKeys.list(tenantId),
    queryFn: async () => (await api.get<TeacherList>("/admin/teachers")).data,
  });
}

export function useUpdateTeacher() {
  const { tenantId } = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: TeacherUpdateBody }) =>
      (await api.put<{ firstName: string }>(`/admin/teachers/${id}`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherKeys.all(tenantId) }),
  });
}

export function useToggleTeacherStatus() {
  const { tenantId } = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (
        await api.post<{ firstName: string; isActive: boolean }>(`/admin/teachers/${id}/toggle-status`, {
          currentStatus: isActive ? 1 : 0,
        })
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherKeys.all(tenantId) }),
  });
}

export function useDeleteTeacher() {
  const { tenantId } = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete<{ name: string }>(`/admin/teachers/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherKeys.all(tenantId) }),
  });
}
