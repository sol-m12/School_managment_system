import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import type { ExamView } from "./types";

export const studentExamKeys = {
  all: ["student", "exams"] as const,
  byTenant: (tenantId: number) => [...studentExamKeys.all, tenantId] as const,
};

export function useStudentExams() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: studentExamKeys.byTenant(tenantId),
    queryFn: async () => (await api.get<ExamView>("/student/exams")).data,
  });
}
