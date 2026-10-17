import { Building2, PlusCircle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { usePlatformAuth } from "./platformAuthContext";

export function PlatformHomePage() {
  const { t } = useTranslation("platform");
  const auth = usePlatformAuth();
  const name = auth.status === "authenticated" ? auth.user.displayName : "";

  return (
    <div className="mx-auto max-w-5xl">
      <section className="relative overflow-hidden rounded-3xl bg-[#0b1526] px-6 py-10 text-white shadow-raised sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(20,184,166,0.35),transparent_40%)]"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-teal-200">
            <Sparkles aria-hidden className="size-4" />
            {t("home.welcome")}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("home.title", { name })}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {t("home.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/platform/schools/new"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-500 px-4 text-sm font-semibold text-[#042f2e] transition hover:bg-teal-400"
            >
              <PlusCircle aria-hidden className="size-4" />
              {t("home.addSchool")}
            </Link>
            <Link
              to="/platform/schools"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              <Building2 aria-hidden className="size-4" />
              {t("home.viewSchools")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <h2 className="text-base font-semibold">{t("home.cardProvisionTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("home.cardProvisionBody")}</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <h2 className="text-base font-semibold">{t("home.cardShellTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("home.cardShellBody")}</p>
        </article>
      </section>
    </div>
  );
}
