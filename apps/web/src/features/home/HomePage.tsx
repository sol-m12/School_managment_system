import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  ChevronUp,
  GraduationCap,
  HeartHandshake,
  Info,
  Mail,
  MapPin,
  Medal,
  Megaphone,
  Menu,
  MessageSquare,
  Phone,
  Quote,
  Send,
  Shield,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { usePublicHome, useSendInquiry } from "./api/usePublicHome";
import { HOME_FORM_DEFAULTS, homeFormSchema, type HomeFieldError, type HomeFormValues } from "./homeSchema";

const NAV = [
  { href: "#home", key: "home" },
  { href: "#about", key: "about" },
  { href: "#portals", key: "portals" },
  { href: "#leaders", key: "leaders" },
  { href: "#contact", key: "contact" },
] as const;

function textOr(value: string | null, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-5 block">
      <span className="mb-1 block text-sm font-bold text-ink-muted">{label}</span>
      <div className="flex items-center gap-3 rounded-[15px] border-2 border-transparent bg-[#f1f4f9] px-4 py-1 focus-within:border-brand-700 focus-within:bg-white">
        {children}
      </div>
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
    </label>
  );
}

export function HomePage() {
  const { t, i18n } = useTranslation(["home", "errors", "common"]);
  const english = (i18n.resolvedLanguage ?? i18n.language).startsWith("en");
  const home = usePublicHome();
  const send = useSendInquiry();
  const [menuOpen, setMenuOpen] = useState(false);
  const [values, setValues] = useState<HomeFormValues>(HOME_FORM_DEFAULTS);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof HomeFormValues, HomeFieldError>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const schoolName = textOr(
    home.data?.schoolName ?? null,
    english ? t("home:content.name") : t("home:fallbacks.name"),
  );

  useEffect(() => {
    document.title = t("home:pageTitle", { name: schoolName });
  }, [t, schoolName]);

  if (home.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#003366] text-white">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }

  if (home.isError || !home.data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#003366] px-4 text-center text-white">
        <p>{t(`errors:${toErrorKey(home.error)}`)}</p>
        <Link to="/login" className="rounded-full bg-[#ffcc00] px-6 py-3 font-bold text-[#003366]">
          {t("home:nav.login")}
        </Link>
      </div>
    );
  }

  const data = home.data;
  const vision = english
    ? t("home:fallbacks.vision")
    : data.schoolVision == null
      ? t("home:fallbacks.vision")
      : data.schoolVision.trim();
  const about = english ? t("home:content.about") : textOr(data.aboutText, t("home:fallbacks.about"));
  const needs = english ? t("home:content.needs") : textOr(data.schoolNeeds, t("home:fallbacks.needs"));
  const email = textOr(data.schoolEmail, t("home:fallbacks.email"));
  const phone = textOr(data.schoolPhone, t("home:fallbacks.phone"));
  const address = english ? t("home:content.address") : textOr(data.schoolAddress, t("home:fallbacks.address"));
  const newsLine = (index: number, item: { title: string; content: string }) => {
    if (!english) return `${item.title}: ${item.content}`;
    if (index === 0) return `${t("home:content.news1Title")}: ${t("home:content.news1Body")}`;
    if (index === 1) return `${t("home:content.news2Title")}: ${t("home:content.news2Body")}`;
    return `${item.title}: ${item.content}`;
  };
  const ticker =
    data.news.length > 0
      ? data.news.map((item, index) => newsLine(index, item))
      : [t("home:tickerWelcome", { name: schoolName }), t("home:tickerQuality")];

  const fieldError = (key: keyof HomeFormValues) => {
    const code = fieldErrors[key];
    return code ? t(`errors:${code}`) : undefined;
  };

  const setField = (key: keyof HomeFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const parsed = homeFormSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof HomeFormValues, HomeFieldError>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in next)) {
          next[key as keyof HomeFormValues] = issue.message as HomeFieldError;
        }
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    send.mutate(parsed.data, {
      onSuccess: () => {
        setValues(HOME_FORM_DEFAULTS);
        window.alert(t("home:sent"));
      },
      onError: (error) => setFormError(t(`errors:${toErrorKey(error)}`)),
    });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className="min-h-dvh bg-[#fdfdfd] text-ink"
      style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" }}
    >
      <div className="overflow-hidden bg-[#ce0000] py-2.5 font-bold text-white shadow-[0_2px_10px_rgb(0_0_0/0.2)]">
        <div className="flex w-max animate-[ticker_45s_linear_infinite] whitespace-nowrap">
          {ticker.map((item) => (
            <span key={item} className="mx-8 inline-flex items-center">
              <Megaphone aria-hidden="true" className="me-2 size-4 text-[#ffcc00]" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <header className="sticky top-0 z-[3000] border-b-4 border-[#ffcc00] bg-[#003366] py-4 text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4">
          <a href="#home" className="flex min-w-0 items-center gap-3 font-extrabold">
            {data.logoFile ? (
              <img
                src={`/portal/${data.logoFile}`}
                alt=""
                className="size-[50px] rounded-lg bg-white object-contain p-[3px] shadow"
              />
            ) : (
              <span className="flex size-[50px] items-center justify-center rounded-lg bg-white text-[#003366]">
                <GraduationCap aria-hidden="true" className="size-7" />
              </span>
            )}
            <span className="hidden truncate text-[1.4rem] sm:block">{schoolName}</span>
          </a>
          <button
            type="button"
            className="rounded-control p-2 lg:hidden"
            aria-expanded={menuOpen}
            aria-label={t("home:nav.openMenu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
          <nav className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-2 bg-[#003366] px-4 py-4 lg:static lg:flex lg:flex-row lg:items-center lg:bg-transparent lg:p-0`}>
            {NAV.map((item) => (
              <a
                key={item.key}
                href={item.href}
                onClick={closeMenu}
                className="relative px-2.5 py-2 font-medium text-white/90 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#ffcc00] after:transition-all hover:after:w-full"
              >
                {t(`home:nav.${item.key}`)}
              </a>
            ))}
            <LanguageSwitcher tone="light" />
            <Link
              to="/login"
              onClick={closeMenu}
              className="rounded-full bg-[#ffcc00] px-4 py-2 text-center font-bold text-[#003366] shadow-sm lg:ms-4"
            >
              {t("home:nav.login")}
            </Link>
          </nav>
        </div>
      </header>

      <section
        id="home"
        className="flex min-h-[95vh] items-center bg-[#003366] bg-cover bg-center text-center text-white"
        style={{
          backgroundImage: "linear-gradient(rgba(0,51,102,0.7), rgba(0,51,102,0.7)), url(/portal/hero_bg.jpg)",
        }}
      >
        <div className="mx-auto w-full max-w-4xl px-4 py-16">
          <h1 className="mb-3 text-4xl font-black [text-shadow:2px_2px_10px_rgb(0_0_0/0.5)] sm:text-[4rem] sm:leading-tight">{schoolName}</h1>
          {vision ? <p className="mb-10 text-2xl opacity-90 sm:text-3xl">{vision}</p> : <div className="mb-10" />}
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#portals" className="rounded-full bg-[#ffcc00] px-8 py-3 text-lg font-bold text-[#003366] shadow">
              {t("home:services")}
            </a>
            <a href="#needs" className="rounded-full border border-white px-8 py-3 text-lg font-bold text-white">
              {t("home:donors")}
            </a>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-20 w-full max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: GraduationCap, value: String(data.students), label: t("home:stats.students"), gold: false },
            { icon: Users, value: String(data.staff), label: t("home:stats.teachers"), gold: false },
            { icon: BookOpen, value: t("home:stats.booksValue"), label: t("home:stats.books"), gold: false },
            { icon: Medal, value: t("home:stats.rankValue"), label: t("home:stats.rank"), gold: true },
          ].map((card) => (
            <article key={card.label} className="rounded-[20px] border-b-[6px] border-[#ffcc00] bg-white p-8 text-center shadow-[0_15px_35px_rgb(0_0_0/0.1)] transition-transform duration-300 hover:-translate-y-3 hover:shadow-[0_20px_45px_rgb(0_0_0/0.15)]">
              <card.icon aria-hidden="true" className={`mx-auto mb-3 size-12 ${card.gold ? "text-[#ffcc00]" : "text-[#003366]"}`} />
              <h2 className="text-4xl font-bold">{card.value}</h2>
              <p className="font-bold text-ink-muted">{card.label}</p>
            </article>
          ))}
        </div>
      </div>

      <section id="about" className="bg-white py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-10 lg:grid-cols-2">
          <div>
            <h2 className="relative mb-8 pb-5 text-left text-4xl font-extrabold text-[#003366] after:absolute after:bottom-0 after:left-1/2 after:h-1.5 after:w-20 after:-translate-x-1/2 after:rounded-full after:bg-[#ffcc00] after:content-['']">
              {t("home:aboutTitle")}
            </h2>
            <div className="rounded-r-[25px] border-l-[10px] border-[#ffcc00] bg-white p-8 shadow-[0_10px_30px_rgb(0_0_0/0.05)]">
              <p className="text-justify text-lg leading-loose whitespace-pre-line text-ink-muted">
                <Quote aria-hidden="true" className="me-2 inline size-5 text-[#ffcc00]" />
                {about}
              </p>
            </div>
          </div>
          <div className="relative min-h-64 overflow-hidden rounded-[2rem] bg-[#003366]/10 shadow-lg">
            <img src="/portal/sc.jpg" alt="" className="h-full min-h-64 w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <div className="absolute start-4 bottom-4 hidden rounded-2xl bg-[#ffcc00] p-4 text-[#003366] shadow md:block">
              <h3 className="font-bold">{t("home:years")}</h3>
              <p className="text-sm">{t("home:yearsHint")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="portals" className="bg-[#f8f9fa] py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2 className="relative mb-12 pb-5 text-center text-4xl font-extrabold text-[#003366] after:absolute after:bottom-0 after:left-1/2 after:h-1.5 after:w-20 after:-translate-x-1/2 after:rounded-full after:bg-[#ffcc00] after:content-['']">
            {t("home:portalsTitle")}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <PortalCard icon={<Shield className="size-10" />} title={t("home:authoritiesTitle")} body={t("home:authoritiesBody")} action={t("home:viewReport")} href="#" />
            <PortalCard icon={<HeartHandshake className="size-10" />} title={t("home:ngoTitle")} body={t("home:ngoBody")} action={t("home:viewNeeds")} href="#needs" />
            <PortalCard icon={<Users className="size-10" />} title={t("home:parentsTitle")} body={t("home:parentsBody")} action={t("home:toPortal")} href="/login" />
          </div>
        </div>
      </section>

      <section id="leaders" className="bg-white py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2 className="relative mb-12 pb-5 text-center text-4xl font-extrabold text-[#003366] after:absolute after:bottom-0 after:left-1/2 after:h-1.5 after:w-20 after:-translate-x-1/2 after:rounded-full after:bg-[#ffcc00] after:content-['']">
            {t("home:leadersTitle")}
          </h2>
          <div className="grid justify-center gap-10 md:grid-cols-2">
            <Leader
              name={data.principal ? (english ? t("home:content.principalName") : data.principal.name) : t("home:principalBadge")}
              badge={t("home:principalBadge")}
              photoFile={data.principal?.photoFile ?? null}
            />
            <Leader
              name={data.vicePrincipal ? (english ? t("home:content.viceName") : data.vicePrincipal.name) : t("home:viceBadge")}
              badge={t("home:viceBadge")}
              photoFile={data.vicePrincipal?.photoFile ?? null}
            />
          </div>
        </div>
      </section>

      <section id="needs" className="bg-[#f8f9fa] py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-2 text-2xl font-bold text-[#003366]">
              <HeartHandshake aria-hidden="true" className="size-6 text-[#ffcc00]" />
              {t("home:needsTitle")}
            </h3>
            <div className="mb-4 rounded-2xl border-s-[5px] border-[#ffcc00] bg-white p-4 shadow-sm">
              <p className="text-lg leading-loose whitespace-pre-line text-ink-muted">{needs}</p>
            </div>
            <div className="rounded-2xl bg-[#e7f3ff] p-4">
              <h4 className="flex items-center gap-2 font-bold">
                <Info aria-hidden="true" className="size-4" />
                {t("home:donorNoteTitle")}
              </h4>
              <p className="mt-2 text-sm">{t("home:donorNoteBody")}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_25px_60px_rgb(0_0_0/0.15)] lg:col-span-3">
            <div className="bg-gradient-to-br from-[#003366] to-[#0056b3] px-6 py-8 text-center text-white">
              <h3 className="text-2xl font-bold">{t("home:formTitle")}</h3>
              <p className="opacity-75">{t("home:formSubtitle")}</p>
            </div>
            <form noValidate onSubmit={onSubmit} className="p-6 md:p-10">
              {formError ? <p className="mb-4 text-danger">{formError}</p> : null}
              <div className="grid md:grid-cols-2 md:gap-4">
                <Field label={t("home:fullName")} error={fieldError("senderName")}>
                  <User aria-hidden="true" className="size-4 shrink-0 text-[#003366]" />
                  <input className="w-full bg-transparent py-2.5 outline-none" placeholder={t("home:fullNamePlaceholder")} value={values.senderName} onChange={(event) => setField("senderName", event.target.value)} />
                </Field>
                <Field label={t("home:orgName")} error={fieldError("orgName")}>
                  <Building2 aria-hidden="true" className="size-4 shrink-0 text-[#003366]" />
                  <input className="w-full bg-transparent py-2.5 outline-none" placeholder={t("home:orgNamePlaceholder")} value={values.orgName} onChange={(event) => setField("orgName", event.target.value)} />
                </Field>
                <Field label={t("home:email")} error={fieldError("email")}>
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-[#003366]" />
                  <input type="email" className="w-full bg-transparent py-2.5 outline-none" placeholder={t("home:emailPlaceholder")} value={values.email} onChange={(event) => setField("email", event.target.value)} />
                </Field>
                <Field label={t("home:phone")} error={fieldError("phone")}>
                  <Phone aria-hidden="true" className="size-4 shrink-0 text-[#003366]" />
                  <input className="w-full bg-transparent py-2.5 outline-none" placeholder={t("home:phonePlaceholder")} value={values.phone} onChange={(event) => setField("phone", event.target.value)} />
                </Field>
              </div>
              <Field label={t("home:subject")} error={fieldError("subject")}>
                <Tag aria-hidden="true" className="size-4 shrink-0 text-[#003366]" />
                <input className="w-full bg-transparent py-2.5 outline-none" placeholder={t("home:subjectPlaceholder")} value={values.subject} onChange={(event) => setField("subject", event.target.value)} />
              </Field>
              <Field label={t("home:message")} error={fieldError("message")}>
                <MessageSquare aria-hidden="true" className="mt-2 size-4 shrink-0 self-start text-[#003366]" />
                <textarea rows={4} className="w-full resize-y bg-transparent py-2.5 outline-none" placeholder={t("home:messagePlaceholder")} value={values.message} onChange={(event) => setField("message", event.target.value)} />
              </Field>
              <button type="submit" disabled={send.isPending} className="flex w-full items-center justify-center gap-2 rounded-[15px] bg-[#ffcc00] px-4 py-4 font-extrabold tracking-wide text-[#003366] uppercase transition hover:scale-[1.02] hover:bg-[#003366] hover:text-white disabled:opacity-70">
                <Send aria-hidden="true" className="size-4" />
                {t("home:send")}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-[#0a0a0a] py-16 text-center text-white">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2 className="relative mb-10 pb-5 text-4xl font-extrabold after:absolute after:bottom-0 after:left-1/2 after:h-1.5 after:w-20 after:-translate-x-1/2 after:rounded-full after:bg-[#ffcc00] after:content-['']">
            {t("home:nav.contact")}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <ContactCard icon={<MapPin className="size-10 text-[#ffcc00]" />} title={t("home:address")} value={address} />
            <ContactCard icon={<Phone className="size-10 text-[#ffcc00]" />} title={t("home:phoneLabel")} value={phone} />
            <ContactCard icon={<Mail className="size-10 text-[#ffcc00]" />} title={t("home:emailLabel")} value={email} />
          </div>
        </div>
      </section>

      <footer className="border-t-[6px] border-[#ffcc00] bg-[#0a0a0a] px-4 py-16 text-center text-white">
        {data.logoFile ? (
          <img src={`/portal/${data.logoFile}`} alt="" className="mx-auto mb-4 size-20 rounded-md bg-white p-2" />
        ) : null}
        <h2 className="mb-6 text-2xl font-bold text-[#ffcc00]">{schoolName}</h2>
        <div className="mb-8 flex justify-center gap-8 text-2xl text-white/70">
          <SocialLink label={t("home:social.facebook")} path="M14 8h2V5h-2c-2.8 0-5 2.2-5 5v2H7v3h2v7h3v-7h2.2l.8-3H12v-2c0-.6.4-1 1-1z" />
          <SocialLink label={t("home:social.telegram")} path="M21 4 3 11.2l5.2 1.7L18.2 7.2 10.4 14l-.2 4.2 2.6-2.4 4.4 3.2L21 4z" />
          <SocialLink label={t("home:social.youtube")} path="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6zM9.8 15.5v-6.6l6.2 3.3-6.2 3.3z" />
          <SocialLink label={t("home:social.x")} path="M17.5 3h3.1l-6.8 7.8L22 21h-6.2l-4.8-6.3L5.7 21H2.6l7.3-8.4L2 3h6.3l4.4 5.8L17.5 3zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5z" />
        </div>
        <p className="border-t border-white/25 pt-6 opacity-50">{t("home:rights", { year: new Date().getFullYear() })}</p>
      </footer>

      <a href="#home" aria-label={t("home:backTop")} className="fixed end-4 bottom-4 z-[5000] flex size-12 items-center justify-center rounded-full bg-[#ffcc00] text-[#003366] shadow">
        <ChevronUp aria-hidden="true" className="size-6" />
      </a>
    </div>
  );
}

function PortalCard({ icon, title, body, action, href }: { icon: ReactNode; title: string; body: string; action: string; href: string }) {
  const className = "mt-4 inline-block rounded-full border border-[#003366] px-8 py-2 font-semibold text-[#003366]";
  return (
    <article className="group rounded-[25px] border border-[#f0f0f0] bg-white px-6 py-10 text-center transition duration-300 hover:-translate-y-2.5 hover:border-[#ffcc00] hover:shadow-[0_25px_50px_rgb(0_0_0/0.1)]">
      <div className="mx-auto mb-6 flex size-[90px] items-center justify-center rounded-full bg-[#f0f4f8] text-[#003366] transition group-hover:bg-[#003366] group-hover:text-white">{icon}</div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-3 text-ink-muted">{body}</p>
      {href.startsWith("/") ? (
        <Link to={href} className={className}>{action}</Link>
      ) : (
        <a href={href} className={className}>{action}</a>
      )}
    </article>
  );
}

function Leader({ name, badge, photoFile }: { name: string; badge: string; photoFile: string | null }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(photoFile) && !photoFailed;
  return (
    <div className="text-center">
      {showPhoto ? (
        <img
          src={`/portal/${photoFile}`}
          alt=""
          className="mx-auto mb-4 size-[200px] rounded-full border-[6px] border-[#ffcc00] object-cover shadow-[0_10px_25px_rgb(0_0_0/0.2)] transition duration-300 hover:scale-105 hover:rotate-3"
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <div className="mx-auto mb-4 flex size-[200px] items-center justify-center rounded-full border-[6px] border-[#ffcc00] bg-[#f0f4f8] text-[#003366] shadow-[0_10px_25px_rgb(0_0_0/0.2)]">
          <User aria-hidden="true" className="size-20" />
        </div>
      )}
      <h3 className="text-xl font-bold">{name}</h3>
      <span className="mt-2 inline-block rounded-full bg-[#003366] px-3 py-1 text-sm text-white">{badge}</span>
    </div>
  );
}

function SocialLink({ label, path }: { label: string; path: string }) {
  return (
    <a href="#" aria-label={label} className="opacity-70 transition hover:text-[#ffcc00] hover:opacity-100">
      <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden="true">
        <path d={path} />
      </svg>
    </a>
  );
}

function ContactCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-white/10 p-6">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 opacity-75">{value}</p>
    </div>
  );
}
