import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, LogIn, School, User, UserLock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Alert, Button, Input } from "@/components/ui";
import { toErrorKey, type ErrorKey } from "@/lib/apiError";
import { useAuth } from "./authContext";
import { isFieldErrorKey, loginSchema, type LoginValues } from "./loginSchema";

const DEFAULT_TENANT_SLUG = "keyit";

function redirectTarget(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = (state as { from: unknown }).from;
    if (typeof from === "string" && from.startsWith("/") && from !== "/login") return from;
  }
  return "/dashboard";
}

export function LoginPage() {
  const { t } = useTranslation("auth");
  const { t: tErrors } = useTranslation("errors");
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantSlug: DEFAULT_TENANT_SLUG, username: "", password: "" },
  });

  useEffect(() => {
    const previous = document.title;
    document.title = t("pageTitle");
    return () => {
      document.title = previous;
    };
  }, [t]);

  if (auth.status === "loading") return <FullScreenLoader />;
  if (auth.status === "authenticated") return <Navigate to={redirectTarget(location.state)} replace />;

  const fieldError = (message: string | undefined) =>
    isFieldErrorKey(message) ? tErrors(message) : undefined;

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
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[linear-gradient(135deg,rgba(0,51,102,0.85),rgba(0,51,102,0.7))] px-4 py-5 font-[Segoe_UI,Tahoma,Geneva,Verdana,sans-serif]">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <LanguageSwitcher tone="light" />
      </div>

      <div className="mb-6 mt-12 sm:mt-0">
        <Link
          to="/home"
          className="inline-flex min-h-tap items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 text-sm text-white backdrop-blur transition-colors hover:bg-white hover:text-brand-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("backHome")}
        </Link>
      </div>

      <main className="w-full max-w-[400px] overflow-hidden rounded-panel bg-white/[0.98] shadow-panel">
        <header className="bg-brand-700 px-5 py-6 text-center text-white sm:px-6">
          <div className="mx-auto mb-4 flex size-[60px] items-center justify-center rounded-full bg-gold text-brand-700">
            <UserLock aria-hidden="true" className="size-6" />
          </div>
          <h1 className="text-lg font-bold break-words sm:text-xl">{t("schoolName")}</h1>
          <p className="mt-1 text-sm opacity-75">{t("subtitle")}</p>
        </header>

        <div className="px-5 py-6 sm:px-10 sm:py-8">
          {errorKey ? (
            <Alert tone="danger" className="mb-5">
              {tErrors(errorKey)}
            </Alert>
          ) : null}

          <form noValidate onSubmit={(event) => void onSubmit(event)} className="space-y-4">
            <Input
              label={t("tenantSlug")}
              placeholder={t("tenantSlugPlaceholder")}
              autoComplete="organization"
              autoCapitalize="none"
              spellCheck={false}
              icon={<School className="size-4" />}
              error={fieldError(errors.tenantSlug?.message)}
              {...register("tenantSlug")}
            />
            <Input
              label={t("username")}
              placeholder={t("usernamePlaceholder")}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              icon={<User className="size-4" />}
              error={fieldError(errors.username?.message)}
              {...register("username")}
            />
            <div>
              <Input
                type="password"
                label={t("password")}
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
                icon={<KeyRound className="size-4" />}
                error={fieldError(errors.password?.message)}
                {...register("password")}
              />
              <div className="mt-1 text-right">
                <Link
                  to="/forgot-password"
                  className="inline-flex min-h-tap items-center text-sm text-brand-600 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={isSubmitting}
              rightIcon={<LogIn aria-hidden="true" className="size-4" />}
            >
              {t("submit")}
            </Button>
          </form>
        </div>

        <footer className="bg-canvas px-4 py-3 text-center text-xs text-ink-muted">
          {t("footer", { year: new Date().getFullYear() })}
        </footer>
      </main>
    </div>
  );
}
