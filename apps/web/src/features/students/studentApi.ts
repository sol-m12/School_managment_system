import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type StudentDetail = {
  id: number;
  fullName: string;
  gender: "M" | "F";
  age: number;
  gradeLevel: number;
  stream: string | null;
  section: string | null;
  academicYear: string;
  registrationType: string | null;
  previousSchool: string | null;
  kebele: string | null;
  gote: string | null;
  houseNumber: string | null;
  isTransfer: boolean;
  submissionStatus: string | null;
  isApproved: boolean;
  photo: string | null;
  username: string | null;
  isActive: boolean;
  parentName: string;
  parentPhone: string | null;
  parentEmail: string | null;
};

export type StudentFormBody = {
  fullName: string;
  gender: "M" | "F";
  age: number;
  gradeLevel: number;
  stream: "Common" | "Natural" | "Social" | null;
  registrationType: "አዲስ" | "ነባር" | "አቋራጭ" | "ደጋሚ" | "መልሶ ቅበላ";
  previousSchool?: string;
  kebele?: string;
  gote?: string;
  houseNumber?: string;
  isTransfer?: boolean;
  academicYear?: string;
};

const studentsKey = (tenantId: number) => ["admin", tenantId, "students"] as const;

export function useStudentDetail(id: number | null) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: ["admin", tenantId, "student", id],
    enabled: id != null && id > 0,
    queryFn: async () => (await api.get<{ student: StudentDetail }>(`/admin/students/${id}`)).data.student,
  });
}

export function useSaveStudent(id: number | null) {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: StudentFormBody) => {
      if (id) return (await api.put<{ student: StudentDetail }>(`/admin/students/${id}`, body)).data.student;
      return (await api.post<{ student: StudentDetail }>("/admin/students", body)).data.student;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: studentsKey(tenantId) });
    },
  });
}

export function useDeleteStudent() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/students/${id}`),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: studentsKey(tenantId) });
    },
  });
}

export const REGISTRATION_TYPES = ["አዲስ", "ነባር", "አቋራጭ", "ደጋሚ", "መልሶ ቅበላ"] as const;
