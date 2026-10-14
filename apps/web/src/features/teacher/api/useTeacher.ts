import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type ScheduleSlot = {
  day: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  gradeLevel: number | null;
  section: string;
};

export type ScheduleBoard = {
  academicYear: string;
  assignments: { gradeLevel: number; section: string; subjectName: string }[];
  classSchedule: ScheduleSlot[];
  examSchedule: ScheduleSlot[];
};

export type GradeOptions = {
  academicYear: string;
  semester: string;
  teacherName: string;
  classes: { value: string; label: string }[];
  subjects: { id: number; name: string }[];
};

export type GradeSheet = {
  academicYear: string;
  semester: string;
  teacherName: string;
  classSelect: string;
  subjectId: number;
  locked: boolean;
  totalPercent: number;
  plans: { id: number; name: string; percent: number }[];
  students: {
    id: number;
    fullName: string;
    status: string;
    locked: boolean;
    scores: Record<string, number>;
    total: number;
  }[];
};

export function useTeacherSchedule() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: ["teacher", "schedule", tenantId],
    queryFn: async () => (await api.get<ScheduleBoard>("/teacher/schedule")).data,
  });
}

export function useGradeOptions() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: ["teacher", "grades", "options", tenantId],
    queryFn: async () => (await api.get<GradeOptions>("/teacher/grades/options")).data,
  });
}

export function useGradeSheet(classSelect: string, subjectId: string, enabled: boolean) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: ["teacher", "grades", "sheet", tenantId, classSelect, subjectId],
    enabled,
    queryFn: async () =>
      (
        await api.get<GradeSheet>("/teacher/grades/sheet", {
          params: { classSelect, subjectId },
        })
      ).data,
  });
}

export function useSavePlans() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { classSelect: string; subjectId: number; items: { name: string; percent: number }[] }) =>
      (await api.post<{ added: number; rejectedName: string | null }>("/teacher/grades/plans", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["teacher", "grades"] });
    },
  });
}

export function useDeletePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; classSelect: string; subjectId: number }) =>
      api.delete(`/teacher/grades/plans/${input.id}`, {
        params: { classSelect: input.classSelect, subjectId: input.subjectId },
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["teacher", "grades"] });
    },
  });
}

export function useSaveScores() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      classSelect: string;
      subjectId: number;
      finalize: boolean;
      marks: { studentId: number; weightingType: string; score: number | null }[];
    }) => api.post("/teacher/grades/scores", body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["teacher", "grades"] });
    },
  });
}
