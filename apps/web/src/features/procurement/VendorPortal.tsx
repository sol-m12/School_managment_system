import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { Building2, LogIn, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Alert, Badge, Button, Input } from "@/components/ui";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { toErrorKey } from "@/lib/apiError";
import { setVendorToken, usePlaceBid, usePublicTenders, useVendorDesk, useVendorLogin, vendorToken } from "./api/useProcurement";

const DEFAULT_SCHOOL = "keyit";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[linear-gradient(160deg,#f4f7fb_0%,#e7eef6_45%,#f8fafc_100%)] font-[Noto_Sans_Ethiopic,Segoe_UI,sans-serif] text-ink-strong">
      <header className="bg-brand-700 text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/tenders" className="inline-flex items-center gap-2 text-sm font-semibold text-white">
            <Scale className="size-5" aria-hidden="true" />
            Keyit
          </Link>
          <LanguageSwitcher tone="light" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16">{children}</main>
    </div>
  );
}

export function PublicTendersPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const [slug, setSlug] = useState(DEFAULT_SCHOOL);
  const [draft, setDraft] = useState(DEFAULT_SCHOOL);
  const query = usePublicTenders(slug);

  return (
    <Shell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("boardTitle")}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">{t("boardHelp")}</p>
        </div>
        <Link to="/vendor" className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 text-sm font-semibold text-white">
          {t("toPortal")}
        </Link>
      </div>
      <form
        className="mb-6 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSlug(draft.trim());
        }}
      >
        <Input label={t("schoolCode")} value={draft} onChange={(event) => setDraft(event.target.value)} />
        <div className="flex items-end">
          <Button type="submit">{t("signIn")}</Button>
        </div>
      </form>
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-3">
            <p className="text-sm font-semibold text-brand-700">{data.school}</p>
            {data.rows.length === 0 ? (
              <p className="rounded-card border border-dashed border-border bg-surface p-8 text-sm text-ink-muted">{t("emptyBoard")}</p>
            ) : (
              data.rows.map((row) => (
                <article key={row.id} className="rounded-card border border-border bg-surface p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold">{row.title}</h2>
                    <Badge tone="brand">{row.closesOn}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {row.itemName} · {row.quantity}
                  </p>
                </article>
              ))
            )}
          </div>
        )}
      </Panel>
    </Shell>
  );
}

export function VendorLoginPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const login = useVendorLogin();
  const [error, setError] = useState<string | null>(null);
  if (vendorToken()) return <Navigate to="/vendor/desk" replace />;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    setError(null);
    login.mutate(
      { tenantSlug: textOf(data, "tenantSlug"), username: textOf(data, "username"), password: textOf(data, "password") },
      { onError: (err) => setError(t(`errors:${toErrorKey(err)}` as "errors:server")) },
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md rounded-card border border-border bg-surface p-6 shadow-raised">
        <div className="mb-5 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Building2 aria-hidden="true" className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold">{t("portalTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("portalHelp")}</p>
        {error ? (
          <Alert tone="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}
        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
          <Input label={t("schoolCode")} name="tenantSlug" defaultValue={DEFAULT_SCHOOL} required />
          <Input label={t("username")} name="username" required autoComplete="username" />
          <Input label={t("password")} name="password" type="password" required autoComplete="current-password" />
          <Button type="submit" loading={login.isPending} leftIcon={<LogIn className="size-4" aria-hidden="true" />}>
            {t("signIn")}
          </Button>
        </form>
      </div>
    </Shell>
  );
}

export function VendorDeskPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const query = useVendorDesk();
  const bid = usePlaceBid();
  const { setNotice, view } = useNotice();
  if (!vendorToken()) return <Navigate to="/vendor" replace />;

  function onBid(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    bid.mutate(
      { tenderId: Number(textOf(data, "tenderId")), amount: Number(textOf(data, "amount")), note: textOf(data, "note") },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("saved") });
          event.currentTarget.reset();
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") }),
      },
    );
  }

  return (
    <Shell>
      <div className="mb-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            setVendorToken(null);
            window.location.assign("/vendor");
          }}
        >
          {t("signIn")}
        </Button>
      </div>
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <section className="rounded-card border border-border bg-surface p-5 shadow-soft">
              <h1 className="text-2xl font-semibold">{data.vendor.name}</h1>
              <p className="mt-1 text-sm text-ink-muted">{data.vendor.username}</p>
              <p className="mt-3 text-sm">
                {t("license")} {data.vendor.licenseNo || "—"} · {data.vendor.licenseExpires} ·{" "}
                {data.vendor.licenseCurrent ? t("licenseCurrent") : t("licenseClosed")}
              </p>
            </section>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-card border border-border bg-surface p-5 shadow-soft">
                <h2 className="text-lg font-semibold">{t("boardTitle")}</h2>
                {data.tenders.length === 0 ? <p className="mt-3 text-sm text-ink-muted">{t("emptyBoard")}</p> : null}
                <div className="mt-3 grid gap-3">
                  {data.tenders.map((row) => (
                    <form key={row.id} className="rounded-control border border-border p-3" onSubmit={onBid}>
                      <input type="hidden" name="tenderId" value={row.id} />
                      <p className="font-semibold">{row.title}</p>
                      <p className="text-sm text-ink-muted">
                        {row.itemName} · {row.quantity} · {row.closesOn}
                      </p>
                      <div className="mt-3 grid gap-2">
                        <Input label={t("amount")} name="amount" type="number" min="0.01" step="0.01" required />
                        <Input label={t("note")} name="note" />
                        <Button type="submit" loading={bid.isPending}>
                          {t("placeBid")}
                        </Button>
                      </div>
                    </form>
                  ))}
                </div>
              </section>
              <div className="grid gap-4">
                <section className="rounded-card border border-border bg-surface p-5 shadow-soft">
                  <h2 className="text-lg font-semibold">{t("myBids")}</h2>
                  {data.bids.length === 0 ? <p className="mt-3 text-sm text-ink-muted">{t("emptyBids")}</p> : null}
                  <ul className="mt-3 grid gap-2">
                    {data.bids.map((row) => (
                      <li key={row.id} className="flex items-center justify-between text-sm">
                        <span>{row.title}</span>
                        <span className="font-semibold">{row.amount.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-card border border-border bg-surface p-5 shadow-soft">
                  <h2 className="text-lg font-semibold">{t("myAwards")}</h2>
                  {data.awards.length === 0 ? <p className="mt-3 text-sm text-ink-muted">{t("emptyBids")}</p> : null}
                  <ul className="mt-3 grid gap-2">
                    {data.awards.map((row) => (
                      <li key={row.id} className="text-sm">
                        <p className="font-semibold">{row.letterNo}</p>
                        <p className="text-ink-muted">
                          {row.title} · {row.itemName} · {row.amount.toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </Shell>
  );
}
