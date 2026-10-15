import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type LockedProfile = {
  firstName: string;
  lastName: string;
  gender: string | null;
  role: string;
  jobTitle: string;
  specialization: string | null;
  phoneNumber: string | null;
  email: string | null;
  hireDate: string | null;
  photo: string | null;
  username: string;
};

export const teacherProfileKeys = {
  all: ["teacher", "profile"] as const,
  mine: (tenantId: number) => [...teacherProfileKeys.all, tenantId] as const,
};

export function useTeacherProfile() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: teacherProfileKeys.mine(tenantId),
    queryFn: async () => (await api.get<{ profile: LockedProfile }>("/teacher/profile")).data,
  });
}
