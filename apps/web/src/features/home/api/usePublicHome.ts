import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { tenantSlugFromHost } from "@/lib/tenantSlug";

export type PublicLeader = { name: string; photoFile: string | null };

export type PublicHome = {
  schoolName: string | null;
  schoolVision: string | null;
  schoolEmail: string | null;
  schoolPhone: string | null;
  schoolAddress: string | null;
  aboutText: string | null;
  schoolNeeds: string | null;
  logoFile: string | null;
  students: number;
  staff: number;
  news: { title: string; content: string }[];
  principal: PublicLeader | null;
  vicePrincipal: PublicLeader | null;
};

export type InquiryInput = {
  senderName: string;
  orgName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

function schoolSlug(): string {
  return tenantSlugFromHost();
}

export function usePublicHome() {
  const slug = schoolSlug();
  return useQuery({
    queryKey: ["public", "home", slug],
    queryFn: async () => {
      const { data } = await api.get<PublicHome>("/public/home", { params: { slug } });
      return data;
    },
  });
}

export function useSendInquiry() {
  return useMutation({
    mutationFn: async (input: InquiryInput) => {
      await api.post("/public/inquiries", { slug: schoolSlug(), ...input });
    },
  });
}
