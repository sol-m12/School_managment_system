import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type ClassStream = "Natural" | "Social" | null;

export type ClassRecommendation = {
  staffId: number;
  teacherName: string;
  totalYearAssignments: number;
  totalYearCredits: number;
  matchingSubjectCount: number;
  matchingSubjects: string;
};

export type ClassRow = {
  id: number;
  gradeLevel: number;
  section: string;
  stream: ClassStream;
  classTeacherId: number | null;
  teacherName: string;
  maxCapacity: number;
  studentCount: number;
  yearAssignmentCount: number;
  yearTotalCredits: number;
  recommendations: ClassRecommendation[];
};

export type ClassTeacher = { id: number; name: string };

export type ClassList = {
  academicYear: string;
  teachers: ClassTeacher[];
  rows: ClassRow[];
};

export type ClassBody = {
  gradeLevel: number;
  section: string;
  stream: ClassStream;
  classTeacherId: number | null;
  maxCapacity: number;
};

const classKeys = {
  all: (tenantId: number) => ["classes", tenantId] as const,
};

export function useClasses() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: classKeys.all(tenantId),
    queryFn: async () => (await api.get<ClassList>("/admin/classes")).data,
  });
}

function useRefreshClasses() {
  const { tenantId } = useSessionUser();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: classKeys.all(tenantId) });
}

export function useCreateBaseClass() {
  const refresh = useRefreshClasses();
  return useMutation({
    mutationFn: async (body: { gradeLevel: number; section: string }) =>
      (await api.post<{ id: number }>("/admin/classes/base", body)).data,
    onSuccess: refresh,
  });
}

export function useCreateClass() {
  const refresh = useRefreshClasses();
  return useMutation({
    mutationFn: async (body: ClassBody) => (await api.post<{ id: number }>("/admin/classes", body)).data,
    onSuccess: refresh,
  });
}

export function useUpdateClass() {
  const refresh = useRefreshClasses();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: ClassBody }) =>
      (await api.put<{ ok: true }>(`/admin/classes/${id}`, body)).data,
    onSuccess: refresh,
  });
}

export function useDeleteClass() {
  const refresh = useRefreshClasses();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete<{ ok: true }>(`/admin/classes/${id}`)).data,
    onSuccess: refresh,
  });
}

export function useAssignHomeroom() {
  const refresh = useRefreshClasses();
  return useMutation({
    mutationFn: async ({ id, teacherId }: { id: number; teacherId: number | null }) =>
      (await api.post<{ ok: true }>(`/admin/classes/${id}/homeroom`, { teacherId })).data,
    onSuccess: refresh,
  });
}
