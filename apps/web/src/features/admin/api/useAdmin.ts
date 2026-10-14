import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type StudentRow = {
  id: number;
  fullName: string;
  gender: "M" | "F";
  age: number;
  gradeLevel: number;
  stream: string | null;
  section: string | null;
  academicYear: string;
  registrationType: string | null;
  submissionStatus: string | null;
  isActive?: number | null;
  kebele: string | null;
  gote: string | null;
};

export type RepeaterPage = {
  rows: StudentRow[];
  total: number;
  male: number;
  female: number;
  years: string[];
  grades: number[];
  sections: string[];
  academicYear: string;
};

const key = (tenantId: number, name: string) => ["admin", tenantId, name] as const;

export function useRepeaters(filters: Record<string, string>) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: [...key(tenantId, "repeaters"), filters],
    queryFn: async () => (await api.get<RepeaterPage>("/admin/repeaters", { params: filters })).data,
  });
}

export function useStudents(filters: Record<string, string>) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: [...key(tenantId, "students"), filters],
    queryFn: async () =>
      (await api.get<{ rows: StudentRow[]; total: number; academicYear: string }>("/admin/students", { params: filters })).data,
  });
}

export function useAcademicYear() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "year"),
    queryFn: async () => (await api.get<{ academicYear: string | null; semester: string }>("/admin/academic-year")).data,
  });
}

export function useSaveAcademicYear() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { academicYear: string; semester: "1" | "2" }) => api.put("/admin/academic-year", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "year") }),
  });
}

export function useUsers(q: string) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: [...key(tenantId, "users"), q],
    queryFn: async () =>
      (await api.get<{ rows: { id: number; username: string; role: string; name: string }[] }>("/admin/users", { params: { q } })).data,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { userId: number; password: string }) => api.post("/admin/passwords", body),
  });
}

export function useSchoolInfo() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "school"),
    queryFn: async () =>
      (
        await api.get<{
          school: {
            schoolName: string;
            schoolVision: string | null;
            schoolEmail: string | null;
            schoolPhone: string | null;
            schoolAddress: string | null;
            aboutText: string | null;
            schoolNeeds: string | null;
            promoVideoUrl: string | null;
          } | null;
        }>("/admin/school-info")
      ).data,
  });
}

export function useSaveSchool() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, string>) => api.put("/admin/school-info", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "school") }),
  });
}

export function useApprovals() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "approvals"),
    queryFn: async () =>
      (
        await api.get<{
          academicYear: string | null;
          staff: { id: number; firstName: string; lastName: string; role: string; jobTitle: string }[];
          registration: { gradeLevel: number; registrationType: string; male: number; female: number; total: number }[];
          attendance: { recordedBy: number; total: number }[];
        }>("/admin/approvals")
      ).data,
  });
}

export function useApprove() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (action: { kind: "staff"; id: number } | { kind: "students"; gradeLevel: number } | { kind: "attendance"; recordedBy: number; startDate: string; endDate: string }) => {
      if (action.kind === "staff") return api.post(`/admin/approvals/staff/${action.id}`);
      if (action.kind === "students") return api.post("/admin/approvals/students", { gradeLevel: action.gradeLevel });
      return api.post("/admin/approvals/attendance", action);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "approvals") }),
  });
}

export function useSchedule() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "schedule"),
    queryFn: async () =>
      (
        await api.get<{
          academicYear: string | null;
          rows: {
            id: number;
            dayOfWeek: string;
            periodNumber: number;
            startTime: string;
            endTime: string;
            gradeLevel: number | null;
            section: string | null;
            subjectName: string | null;
            teacherName: string;
          }[];
        }>("/admin/schedule")
      ).data,
  });
}

export function useReports() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "reports"),
    queryFn: async () =>
      (
        await api.get<{
          rows: { id: number; studentName: string | null; academicYear: string | null; yearlyAvg: string | null; finalRank: number | null; remark: string | null }[];
        }>("/admin/reports")
      ).data,
  });
}

export function useFiles() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "files"),
    queryFn: async () =>
      (
        await api.get<{
          rows: { id: number; title: string | null; category: string | null; fileType: string | null; academicYear: string | null; targetRole: string | null }[];
        }>("/admin/files")
      ).data,
  });
}

export function useRoleModules() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "roles"),
    queryFn: async () => (await api.get<{ rows: { permission: string; roles: string[] }[] }>("/admin/role-modules")).data,
  });
}

export function useProfile() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "profile"),
    queryFn: async () => (await api.get<{ profile: { username: string; role: string; name: string; photo: string | null } }>("/admin/profile")).data,
  });
}

export function useSaveProfile() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password?: string }) => api.put("/admin/profile", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "profile") }),
  });
}

export function useIncome() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "income"),
    queryFn: async () => (await api.get<{ rows: { id: number; source: string; amount: string; dateReceived: string }[] }>("/admin/income")).data,
  });
}

export function useAddIncome() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { source: string; amount: string; dateReceived: string }) => api.post("/admin/income", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "income") }),
  });
}

export function useExpenses() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "expenses"),
    queryFn: async () =>
      (await api.get<{ rows: { id: number; category: string; amount: string; datePaid: string; description: string | null }[] }>("/admin/expenses")).data,
  });
}

export function useAddExpense() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { category: string; amount: string; datePaid: string; description?: string }) => api.post("/admin/expenses", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: key(tenantId, "expenses") }),
  });
}

export function useUnlockGrades() {
  return useMutation({
    mutationFn: (body: { studentId: number | null; subjectId: number; academicYear: string; semester: "1" | "2" }) =>
      api.post("/admin/grades/unlock", body),
  });
}

export function useBackupAction() {
  return useMutation({
    mutationFn: (path: "/admin/backup" | "/admin/restore") => api.post(path, {}),
  });
}
