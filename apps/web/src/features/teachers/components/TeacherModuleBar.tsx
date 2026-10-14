import { memo, useContext } from "react";
import { createPortal } from "react-dom";
import { House, Presentation, UserRound, Users, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { ModuleBarSlotContext } from "@/components/layout/moduleBarSlot";
import { cn } from "@/lib/cn";

const TABS = [
  { to: "/academics/teaching-load", key: "teacherNavTeachers", icon: Users },
  { to: "/academics/classes", key: "teacherNavClasses", icon: Presentation },
  { to: "/academics/homeroom", key: "teacherNavHomeroom", icon: House },
  { to: "/academics/vocational", key: "teacherNavVocational", icon: Wrench },
  { to: "/academics/system-assignment", key: "teacherNavSystem", icon: Wrench },
] as const;

/**
 * Legacy "TEACHER MGMT" bar. It is drawn above the app header and stays pinned while scrolling.
 * Below 992px the tabs lose their side padding and get a faint bottom line, like the legacy page.
 */
export const TeacherModuleBar = memo(function TeacherModuleBar() {
  const { t } = useTranslation("admin");
  const slot = useContext(ModuleBarSlotContext);
  if (!slot) return null;

  return createPortal(
    <nav className="bg-[#1a237e] py-3 shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
      <div className="px-6">
        <div className="-mx-3 flex flex-wrap items-center">
          <div className="w-full px-3 min-[992px]:w-auto min-[992px]:flex-none">
            <h5 className="m-0 pr-5 text-xl leading-[1.2] font-extrabold tracking-[1px] text-white min-[992px]:border-r-2 min-[992px]:border-white/30">
              <UserRound aria-hidden="true" className="me-2 inline size-5 align-[-0.125em]" />
              {t("teacherMgmt")}
            </h5>
          </div>

          <div className="w-full px-3 min-[992px]:w-auto min-[992px]:shrink-0 min-[992px]:grow min-[992px]:basis-0">
            <div className="mt-2 flex flex-wrap gap-2 min-[992px]:mt-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <NavLink
                    key={tab.key}
                    to={tab.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-lg border-b border-white/5 p-2.5 text-[0.95rem] leading-normal font-medium no-underline transition-all duration-300",
                        "min-[992px]:border-b-0 min-[992px]:px-4 min-[992px]:py-2",
                        isActive
                          ? "bg-[#ffca28] text-black"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                      )
                    }
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {t(tab.key)}
                  </NavLink>
                );
              })}
            </div>
          </div>

          <div className="hidden px-3 text-right min-[992px]:block min-[992px]:flex-none">
            <span className="text-[0.875em] text-white/50">{t("teacherOffice")}</span>
          </div>
        </div>
      </div>
    </nav>,
    slot,
  );
});
