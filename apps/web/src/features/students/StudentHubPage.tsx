import { Eye, Info, Presentation, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSessionUser } from "@/features/auth/authContext";
import { cn } from "@/lib/cn";

const adminCards = [
  { to: "/academics/vocational", icon: UserPlus, titleKey: "studentVocational", subtitleKey: "studentVocationalEn" },
  { to: "/academics/students/directory", icon: Users, titleKey: "studentDirectoryCard" },
  { to: "/academics/students/sections", icon: Presentation, titleKey: "studentSectionCard" },
] as const;

export function StudentHubPage() {
  const { t } = useTranslation("admin");
  const user = useSessionUser();

  return (
    <div className="bg-[#f8fafc] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mb-8 rounded-[15px] border-l-[6px] border-[#007bff] bg-white px-6 py-6 shadow-[0_2px_5px_rgba(0,0,0,0.03)]">
        <h2 className="mb-2 text-2xl font-bold text-[#212529]">👤 {t("studentsTitle")}</h2>
        <p className="mb-0 text-[#6c757d]">{t("studentHubIntro", { role: user.role })}</p>
      </div>

      <section className="mb-12">
        <h3 className="mb-6 border-l-[6px] border-[#1a237e] pl-4 text-[1.4rem] font-extrabold text-[#1a237e]">
          🔑 {t("studentAdminTasks")}
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {adminCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.titleKey}
                to={card.to}
                className="flex flex-col items-center justify-center rounded-[15px] border border-[#edf2f7] bg-white px-5 py-8 text-center text-[#343a40] no-underline shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-2 hover:border-b-4 hover:border-b-[#2e7d32] hover:text-[#343a40] hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)]"
              >
                <Icon aria-hidden="true" className="mb-4 size-11 text-[#2e7d32] transition duration-300" />
                <span className="block text-[1.15rem] leading-snug font-bold">
                  {t(card.titleKey)}
                  {"subtitleKey" in card ? (
                    <>
                      <br />
                      <small className="font-normal text-[#6c757d]">{t(card.subtitleKey)}</small>
                    </>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-6 border-l-[6px] border-[#1a237e] pl-4 text-[1.4rem] font-extrabold text-[#1a237e]">
          📚 {t("studentPerformanceTasks")}
        </h3>
        <div className="mb-3 flex items-start gap-2 rounded-2xl border-0 bg-[#cff4fc] px-4 py-3 text-[#055160] shadow-sm">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="mb-0">{t("studentVpInfo")}</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Link
            to="/academics/students/all"
            className={cn(
              "flex flex-col items-center justify-center rounded-[15px] border border-[#edf2f7] bg-white px-5 py-8 text-center text-[#343a40] no-underline shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition duration-300",
              "hover:-translate-y-2 hover:border-b-4 hover:border-b-[#f57c00] hover:text-[#343a40] hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)]",
            )}
          >
            <Eye aria-hidden="true" className="mb-4 size-11 text-[#f57c00]" />
            <span className="block text-[1.15rem] font-bold">{t("studentWatchAll")}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
