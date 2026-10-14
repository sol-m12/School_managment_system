import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type AttendanceMark = "" | "X" | "A" | "P" | "L";

export type HomeroomSheet = {
  academicYear: string;
  date: string;
  classes: { id: number; gradeLevel: number; section: string; label: string }[];
  classId: number | null;
  gradeLevel?: number;
  section?: string;
  students: {
    id: number;
    fullName: string;
    gender: "M" | "F";
    age: number;
    kebele: string | null;
    gote: string | null;
    houseNumber: string | null;
    mark: AttendanceMark;
  }[];
};

export type SubjectSheet = {
  academicYear: string;
  semester: string;
  date: string;
  classes: { value: string; label: string }[];
  subjects: { id: number; name: string }[];
  classSelect?: string;
  subjectId?: number | null;
  students: { id: number; fullName: string; gender: "M" | "F"; mark: AttendanceMark }[];
};

export type ExamRow = {
  id: number;
  title: string;
  status: "Draft" | "Published" | "Closed";
  durationMinutes: number;
  subjectName: string;
  gradeLevel: number | null;
  section: string | null;
  vocational: boolean;
  studentCount: number;
};

const teacherKey = (tenantId: number, parts: unknown[]) => ["teacher", tenantId, ...parts];

export function useHomeroomAttendance(date: string, classId: string) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["attendance", "homeroom", date, classId]),
    queryFn: async () =>
      (
        await api.get<HomeroomSheet>("/teacher/attendance/homeroom", {
          params: { date, classId: classId || undefined },
        })
      ).data,
  });
}

export function useSaveHomeroomAttendance() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: { classId: number; date: string; marks: { studentId: number; mark: Exclude<AttendanceMark, ""> }[] }) =>
      (await api.post("/teacher/attendance/homeroom", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: teacherKey(tenantId, ["attendance"]) }),
  });
}

export function useSubjectAttendance(date: string, classSelect: string, subjectId: string) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["attendance", "subject", date, classSelect, subjectId]),
    queryFn: async () =>
      (
        await api.get<SubjectSheet>("/teacher/attendance/subject", {
          params: { date, classSelect: classSelect || undefined, subjectId: subjectId || undefined },
        })
      ).data,
  });
}

export function useSaveSubjectAttendance() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: {
      classSelect: string;
      subjectId: number;
      date: string;
      marks: { studentId: number; mark: Exclude<AttendanceMark, ""> }[];
    }) => (await api.post("/teacher/attendance/subject", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: teacherKey(tenantId, ["attendance"]) }),
  });
}

export function useExamOptions(grade: string) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["exams", "options", grade]),
    queryFn: async () =>
      (
        await api.get<{
          academicYear: string;
          semester: string;
          grades: number[];
          grade: number | null;
          subjects: { id: number; name: string }[];
          sections: string[];
        }>("/teacher/exams/options", { params: { grade: grade || undefined } })
      ).data,
  });
}

export function useExamList() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["exams", "list"]),
    queryFn: async () => (await api.get<{ exams: ExamRow[] }>("/teacher/exams")).data,
  });
}

export function useCreateExam() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: {
      examTitle: string;
      gradeLevel: number;
      subjectId: number;
      section: string;
      examPassword: string;
      durationMinutes: number;
      isOfficial: boolean;
      weightingPercent?: number;
    }) => (await api.post<{ id: number }>("/teacher/exams", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: teacherKey(tenantId, ["exams"]) }),
  });
}

export function useExamStatus() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: { id: number; status: ExamRow["status"] }) =>
      (await api.post(`/teacher/exams/${body.id}/status`, { status: body.status })).data,
    onSuccess: () => client.invalidateQueries({ queryKey: teacherKey(tenantId, ["exams"]) }),
  });
}

export function useOpenExam() {
  return useMutation({
    mutationFn: async (body: { id: number; password: string }) =>
      (
        await api.post<{
          id: number;
          title: string;
          questions: {
            id: number;
            questionText: string | null;
            optionA: string | null;
            optionB: string | null;
            optionC: string | null;
            optionD: string | null;
            correctOption: "A" | "B" | "C" | "D";
            points: number;
          }[];
        }>(`/teacher/exams/${body.id}/open`, { password: body.password })
      ).data,
  });
}

export function useAddQuestion() {
  return useMutation({
    mutationFn: async (body: {
      examId: number;
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: "A" | "B" | "C" | "D";
      points: number;
    }) => {
      const { examId, ...rest } = body;
      return (await api.post(`/teacher/exams/${examId}/questions`, rest)).data;
    },
  });
}

export function useResultList() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["exam-results", "list"]),
    queryFn: async () => (await api.get<{ exams: ExamRow[] }>("/teacher/exam-results")).data,
  });
}

export function useExamResults(examId: number | null) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["exam-results", examId]),
    enabled: examId !== null,
    queryFn: async () =>
      (
        await api.get<{
          title: string;
          students: { id: number; fullName: string; gradeLevel: number; section: string; totalScore: number; submittedAt: string | null }[];
        }>(`/teacher/exam-results/${examId}`)
      ).data,
  });
}

export function useLessonPlans() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["lessons"]),
    queryFn: async () =>
      (
        await api.get<{
          academicYear: string;
          subjects: { id: number; name: string; grades: number[] }[];
          plans: {
            id: number;
            subjectName: string;
            gradeLevel: number;
            weekNumber: number;
            topicTitle: string;
            learningObjectives: string | null;
            status: string;
          }[];
        }>("/teacher/lesson-plans")
      ).data,
  });
}

export function useAddLesson() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: {
      subjectId: number;
      gradeLevel: number;
      weekNumber: number;
      topicTitle: string;
      learningObjectives?: string;
    }) => (await api.post("/teacher/lesson-plans", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: teacherKey(tenantId, ["lessons"]) }),
  });
}

export function useRegistration(grade: number, q: string) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["registration", grade, q]),
    queryFn: async () =>
      (
        await api.get<{
          academicYear: string;
          grade: number;
          pending: { id: number; fullName: string; registrationType: string | null; gradeLevel: number }[];
          matches: {
            id: number;
            fullName: string;
            gender: "M" | "F";
            age: number;
            gradeLevel: number;
            registrationType: string | null;
            stream: string | null;
            isTransfer: boolean;
            previousSchool: string | null;
            kebele: string | null;
            gote: string | null;
            houseNumber: string | null;
            editable: boolean;
          }[];
        }>("/teacher/registration", { params: { grade, q: q || undefined } })
      ).data,
  });
}

export function useSaveRegistration() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => (await api.post("/teacher/registration", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: teacherKey(tenantId, ["registration"]) }),
  });
}

export function useRoster(classId: string) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["roster", classId]),
    queryFn: async () =>
      (
        await api.get<
          | { allowed: false }
          | {
              allowed: true;
              academicYear: string;
              classes: { id: number; label: string }[];
              classId: number;
              gradeLevel: number;
              section: string;
              students: { id: number; fullName: string; gender: "M" | "F"; age: number; kebele: string | null; gote: string | null; houseNumber: string | null }[];
            }
        >("/teacher/roster", { params: { classId: classId || undefined } })
      ).data,
  });
}

export function useReportCards(classId: string) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["cards", classId]),
    queryFn: async () =>
      (
        await api.get<
          | { allowed: false }
          | {
              allowed: true;
              academicYear: string;
              semester: string;
              gradeLevel: number;
              section: string;
              classes: { id: number; label: string }[];
              cards: {
                id: number;
                fullName: string;
                average: number;
                rank: number;
                subjects: { name: string; score: number }[];
              }[];
            }
        >("/teacher/report-cards", { params: { classId: classId || undefined } })
      ).data,
  });
}

export function useSubjectReport(classSelect: string, subjectId: string, enabled: boolean) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["subject-report", classSelect, subjectId, enabled]),
    queryFn: async () =>
      (
        await api.get<{
          academicYear: string;
          semester: string;
          classes: { value: string; label: string }[];
          subjects: { id: number; name: string }[];
          rows: { id: number; fullName: string; total: number }[];
        }>("/teacher/subject-report", {
          params: enabled ? { classSelect, subjectId } : {},
        })
      ).data,
  });
}

export function useSimulations() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["simulations"]),
    queryFn: async () =>
      (
        await api.get<{
          academicYear?: string;
          items: { id: number; gradeLevel: number | null; section: string; subjectName: string | null; simTitle: string | null; simUrl: string | null }[];
        }>("/teacher/simulations")
      ).data,
  });
}

export function useAddSimulation() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: { gradeLevel: number; section: string; subjectName: string; simTitle: string; simUrl?: string }) =>
      (await api.post("/teacher/simulations", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: teacherKey(tenantId, ["simulations"]) }),
  });
}

export function useStoreBoard() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherKey(tenantId, ["store"]),
    queryFn: async () =>
      (
        await api.get<{
          teacherName: string;
          available: boolean;
          stats: { total: number; pending: number; approved: number; holdings: number };
          items: { id: number; label: string }[];
          requests: { ref: string; name: string; quantity: string; requestedAt: string; status: string }[];
          holdings: { code: string; name: string; kind: string; quantity: string; issuedAt: string; status: string }[];
        }>("/teacher/store-requests")
      ).data,
  });
}

export function useStoreRequest() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: { itemId?: number; customItemName?: string; estimatedUnitPrice?: number; quantity: number; purpose: string }) =>
      (await api.post("/teacher/store-requests", body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: teacherKey(tenantId, ["store"]) }),
  });
}
