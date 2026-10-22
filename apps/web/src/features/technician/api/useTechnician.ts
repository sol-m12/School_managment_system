import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type AnnouncementRow = {
  id: number;
  title: string;
  content: string;
  targetRole: "All" | "Staff" | "Students" | "Parents" | "Admin_Only";
  startDate: string;
  endDate: string | null;
  isUrgent: boolean;
  postedAt: string | null;
};

export type AnnouncementBody = {
  title: string;
  content: string;
  audienceKey: string;
  personId?: number;
  startDate: string;
  endDate: string | null;
  isUrgent: boolean;
};

export type TeacherAccount = {
  id: number;
  name: string;
  username: string | null;
  approved: boolean;
  passwordChanged: boolean;
  salary: string | null;
  experienceYears: string | null;
  phoneNumber: string | null;
};

export type StaffAccount = {
  id: number;
  name: string;
  role: string;
  jobTitle: string;
  username: string | null;
  active: boolean;
};

export type StudentIdCard = {
  id: number;
  fullName: string;
  username: string | null;
  gradeLevel: number;
  section: string | null;
  hasPhoto: boolean;
};

const key = (tenantId: number, name: string) => ["technician", tenantId, name] as const;

export function useAnnouncements() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "announcements"),
    queryFn: async () => (await api.get<{ rows: AnnouncementRow[] }>("/technician/announcements")).data,
  });
}

export function useSaveAnnouncement() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: number; body: AnnouncementBody }) => {
      if (input.id) {
        return (await api.put(`/technician/announcements/${input.id}`, input.body)).data;
      }
      return (await api.post("/technician/announcements", input.body)).data;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "announcements") });
    },
  });
}

export function useDeleteAnnouncement() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/technician/announcements/${id}`);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "announcements") });
    },
  });
}

export function useRegistrationOptions() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "options"),
    queryFn: async () =>
      (await api.get<{ roles: string[]; subjects: { id: number; name: string }[] }>("/technician/options")).data,
  });
}

export function useTechnicianTeachers() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "teachers"),
    queryFn: async () => (await api.get<{ rows: TeacherAccount[] }>("/technician/teachers")).data,
  });
}

export function useCreateTeacher() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post<{ id: number; username: string; temporaryPassword: string }>("/technician/teachers", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "teachers") });
      await client.invalidateQueries({ queryKey: key(tenantId, "staff") });
    },
  });
}

export function useTechnicianStaff() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "staff"),
    queryFn: async () => (await api.get<{ rows: StaffAccount[] }>("/technician/staff")).data,
  });
}

export function useCreateStaff() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post<{ id: number; username: string }>("/technician/staff", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "staff") });
      await client.invalidateQueries({ queryKey: key(tenantId, "teachers") });
    },
  });
}

export function useAddRole() {
  return useMutation({
    mutationFn: async (roleName: string) => {
      await api.post("/technician/roles", { roleName });
    },
  });
}

export function useStudentIds(filters: { search: string; grade: string; section: string }) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: [...key(tenantId, "student-ids"), filters],
    queryFn: async () =>
      (
        await api.get<{ schoolName: string; rows: StudentIdCard[] }>("/technician/student-ids", {
          params: {
            search: filters.search,
            grade: filters.grade,
            section: filters.section,
          },
        })
      ).data,
  });
}
