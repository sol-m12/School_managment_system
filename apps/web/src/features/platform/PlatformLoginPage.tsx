import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Shield, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Alert, Button, Input } from "@/components/ui";
import { toErrorKey, type ErrorKey } from "@/lib/apiError";
import { usePlatformAuth } from "./platformAuthContext";
import { isPlatformFieldErrorKey, platformLoginSchema, type PlatformLoginValues } from "./platformSchemas";

function redirectTarget(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = (state as { from: unknown }).from;
    if (typeof from === "string" && from.startsWith("/platform") && from !== "/platform/login") {
      return from;
    }
  }
  return "/platform";
}

export function PlatformLoginPage() {
  const { t } = useTranslation("platform");
  const { t: tErrors } = useTranslation("errors");
  const auth = usePlatformAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlatformLoginValues>({
    resolver: zodResolver(platformLoginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    const previous = document.title;
    document.title = t("login.pageTitle");
    return () => {
      document.title = previous;
    };
  }, [t]);

  if (auth.status === "loading") return <FullScreenLoader />;
  if (auth.status === "authenticated") {
    return <Navigate to={redirectTarget(location.state)} replace />;
  }

  const fieldError = (message: string | undefined) =>
    isPlatformFieldErrorKey(message) ? tErrors(message) : undefined;

  const onSubmit = handleSubmit(async (values) => {
    setErrorKey(null);
    try {
      await auth.login(values);
      navigate(redirectTarget(location.state), { replace: true });
    } catch (error) {
      setErrorKey(toErrorKey(error));
    }
  });

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-[#07111f] font-sans text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(14,165,163,0.28),transparent_45%),radial-gradient(ellipse_at_80%_10%,rgba(56,189,248,0.18),transparent_40%),linear-gradient(160deg,#07111f_0%,#0b1c33_55%,#082f2e_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher tone="light" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-center gap-10 px-4 py-12 lg:flex-row lg:items-center lg:gap-16">
        <section className="max-w-xl lg:flex-1">
          <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-teal-300/90 uppercase">
            {t("brand.eyebrow")}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {t("brand.title")}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">{t("brand.subtitle")}</p>
        </section>

        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-6 text-ink-strong shadow-raised backdrop-blur sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Shield aria-hidden className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-ink-strong">{t("login.title")}</h2>
              <p className="text-sm text-ink-muted">{t("login.hint")}</p>
            </div>
          </div>

          {errorKey ? (
            <Alert tone="danger" className="mb-4">
              {tErrors(errorKey)}
            </Alert>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              label={t("login.username")}
              autoComplete="username"
              icon={<User aria-hidden className="size-4" />}
              error={fieldError(errors.username?.message)}
              {...register("username")}
            />
            <Input
              label={t("login.password")}
              type="password"
              autoComplete="current-password"
              icon={<KeyRound aria-hidden className="size-4" />}
              error={fieldError(errors.password?.message)}
              {...register("password")}
            />
            <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800" disabled={isSubmitting}>
              {t("login.submit")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            <Link to="/login" className="font-medium text-teal-700 hover:underline">
              {t("login.schoolLogin")}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
