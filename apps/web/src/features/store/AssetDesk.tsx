import { useEffect, useRef, useState } from "react";
import { Camera, Printer, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input, PageHeader } from "@/components/ui";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { toErrorKey } from "@/lib/apiError";
import { useAssetLookup, useAssets, useRegisterAsset, type AssetHit, type AssetRow } from "./api/useStoreOffice";

const ASSET_KEY = { InStore: "officeInStore", OnLoan: "officeOnLoan", Disposed: "officeDisposed" } as const;
const ASSET_TONE = { InStore: "success", OnLoan: "warning", Disposed: "danger" } as const;

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

function detectorCtor(): (new (options: { formats: string[] }) => Detector) | null {
  const host = window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector };
  return host.BarcodeDetector ?? null;
}

function tagFromScan(raw: string): string {
  const match = raw.toUpperCase().match(/AST-\d+/);
  return match?.[0] ?? raw.trim().toUpperCase();
}

function QrMark({ svg }: { svg: string }) {
  if (!svg.startsWith("<svg")) return null;
  return <div className="h-36 w-36 shrink-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function AssetCard({
  asset,
  loan,
  printing,
  onPrint,
}: {
  asset: AssetRow;
  loan?: AssetHit["loan"];
  printing: boolean;
  onPrint: () => void;
}) {
  const { t } = useTranslation("store");
  return (
    <Card className={printing ? "asset-label" : undefined}>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-wide text-brand-800">{asset.tag}</p>
            <p className="truncate text-base font-semibold text-ink-strong">{asset.name}</p>
            <p className="text-sm text-ink-muted">{asset.code}</p>
          </div>
          <QrMark svg={asset.qrSvg} />
        </div>
        <Badge tone={ASSET_TONE[asset.status]}>{t(ASSET_KEY[asset.status])}</Badge>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-ink-muted">{t("officeSerial")}</dt>
            <dd className="font-medium text-ink-strong">{asset.serialNo || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">{t("officeLocation")}</dt>
            <dd className="font-medium text-ink-strong">{asset.location || "—"}</dd>
          </div>
        </dl>
        {loan ? (
          <p className="rounded-control bg-warning/10 px-3 py-2 text-sm text-warning-strong">
            {loan.overdue ? t("officeOverdue") : t("officeOnLoan")} · {loan.borrowerName} · {loan.dueOn}
          </p>
        ) : null}
        <Button type="button" variant="secondary" className="print:hidden" leftIcon={<Printer className="size-4" />} onClick={onPrint}>
          {t("officePrint")}
        </Button>
      </CardBody>
    </Card>
  );
}

export function AssetsPage() {
  const { t } = useTranslation(["store", "errors"]);
  const query = useAssets();
  const save = useRegisterAsset();
  const lookup = useAssetLookup();
  const { setNotice, view } = useNotice();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [printId, setPrintId] = useState<number | null>(null);
  const [found, setFound] = useState<AssetHit | null>(null);
  const onTag = useRef<(tag: string) => void>(() => undefined);
  const busy = useRef(false);
  const missingText = useRef("");
  missingText.current = t("officeScanMissing");

  function findTag(tag: string) {
    const value = tagFromScan(tag);
    if (!value || busy.current) return;
    busy.current = true;
    lookup.mutate(value, {
      onSuccess: (asset) => {
        setFound(asset);
        setNotice({ tone: "success", text: t("officeFound", { tag: asset.tag }) });
        setLive(false);
      },
      onError: (error) => {
        setFound(null);
        setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
      },
      onSettled: () => {
        busy.current = false;
      },
    });
  }

  onTag.current = findTag;

  useEffect(() => {
    if (!live) return;
    const Ctor = detectorCtor();
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setCameraNote(missingText.current);
      setLive(false);
      return;
    }
    let stop = false;
    let stream: MediaStream | null = null;
    const detector = new Ctor({ formats: ["qr_code"] });
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const tick = async () => {
          if (stop || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw) onTag.current(raw);
          } catch {
            // The frame is not ready yet.
          }
          if (!stop) window.setTimeout(() => void tick(), 400);
        };
        void tick();
      } catch {
        if (!stop) {
          setCameraNote(missingText.current);
          setLive(false);
        }
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [live]);

  useEffect(() => {
    function done() {
      setPrintId(null);
    }
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  return (
    <>
      <PageHeader title={t("officeAssetsTitle")} description={t("officeAssetsHelp")} />
      {view}
      {cameraNote ? <Alert tone="danger" className="mb-4">{cameraNote}</Alert> : null}
      <Card className="mb-4">
        <CardHeader title={t("officeScanTitle")} description={t("officeScanHelp")} />
        <CardBody className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="overflow-hidden rounded-card bg-shell">
            <video ref={videoRef} className={live ? "aspect-[4/3] w-full object-cover" : "hidden"} muted playsInline />
            {live ? null : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-shell-text">
                <ScanLine className="size-10" />
                <p className="text-sm">{t("officeScanIdle")}</p>
              </div>
            )}
          </div>
          <div className="grid content-start gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" leftIcon={<Camera className="size-4" />} onClick={() => { setCameraNote(null); setLive((value) => !value); }}>
                {live ? t("officeScanStop") : t("officeScanStart")}
              </Button>
            </div>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
              onSubmit={(event) => {
                const form = readForm(event);
                findTag(textOf(form, "tag"));
              }}
            >
              <Input name="tag" label={t("officeTag")} placeholder="AST-001" autoCapitalize="characters" />
              <Button type="submit" loading={lookup.isPending}>
                {t("officeFind")}
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>
      {found ? (
        <div className="mb-4 max-w-xl">
          <AssetCard asset={found} loan={found.loan} printing={printId === found.id} onPrint={() => { setPrintId(found.id); window.setTimeout(() => window.print(), 50); }} />
        </div>
      ) : null}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card className="print:hidden">
              <CardHeader title={t("officeRegister")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-4 md:items-end"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    const itemId = Number(textOf(form, "itemId"));
                    save.mutate(
                      { itemId, serialNo: textOf(form, "serialNo"), location: textOf(form, "location") },
                      {
                        onSuccess: () => {
                          setNotice({ tone: "success", text: t("officeSaved") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") }),
                      },
                    );
                  }}
                >
                  <label className="block text-sm font-semibold text-ink-muted">
                    {t("officeItem")}
                    <select name="itemId" required className="mt-1.5 block min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm">
                      <option value="">{t("officeChooseItem")}</option>
                      {data.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {data.items.length === 0 ? (
                    <p className="text-sm text-ink-muted md:col-span-4">
                      {t("officeNoItems")}{" "}
                      <Link className="font-semibold text-brand-700" to="/store/items">
                        {t("officeItemsLink")}
                      </Link>
                    </p>
                  ) : null}
                  <Input name="serialNo" label={t("officeSerial")} />
                  <Input name="location" label={t("officeLocation")} />
                  <Button type="submit" loading={save.isPending}>
                    {t("officeRegister")}
                  </Button>
                </form>
              </CardBody>
            </Card>
            {data.rows.length === 0 ? <p className="text-sm text-ink-muted">{t("officeEmpty")}</p> : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.rows.map((row) => (
                <AssetCard
                  key={row.id}
                  asset={row}
                  printing={printId === row.id}
                  onPrint={() => {
                    setPrintId(row.id);
                    window.setTimeout(() => window.print(), 50);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}
