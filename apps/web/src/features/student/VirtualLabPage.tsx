import { useState } from "react";
import { Atom, FlaskConical, Leaf, Zap, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { useVirtualLabs } from "./api/useVirtualLabs";
import { StudentPanel } from "./components/StudentPanel";

const LAB_COPY: Record<string, { icon: LucideIcon; title: "physics" | "chemistry" | "biology"; hint: "physicsHint" | "chemistryHint" | "biologyHint" }> = {
  physics: { icon: Zap, title: "physics", hint: "physicsHint" },
  chemistry: { icon: Atom, title: "chemistry", hint: "chemistryHint" },
  biology: { icon: Leaf, title: "biology", hint: "biologyHint" },
};

export function VirtualLabPage() {
  const { t } = useTranslation("student");
  const query = useVirtualLabs();
  const [url, setUrl] = useState<string | null>(null);
  if (url) {
    return (
      <div className="space-y-3">
        <Button variant="secondary" onClick={() => setUrl(null)}>
          {t("close")}
        </Button>
        <iframe title={t("labTitle")} src={url} className="h-[70vh] w-full rounded-card border border-border bg-shell" />
      </div>
    );
  }
  return (
    <StudentPanel query={query}>
      {(data) => (
        <div className="space-y-4 rounded-panel bg-shell p-4 text-white sm:p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gold">{t("labTitle")}</h2>
            <p className="text-sm text-white/70">{t("labSubtitle")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.labs.map((lab) => {
              const copy = LAB_COPY[lab.id] ?? { icon: FlaskConical, title: "physics" as const, hint: "physicsHint" as const };
              const Icon = copy.icon;
              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => setUrl(lab.url)}
                  className="rounded-card border border-white/10 bg-shell-hover p-5 text-center hover:-translate-y-1"
                >
                  <Icon aria-hidden="true" className="mx-auto mb-2 size-8 text-gold" />
                  <h3 className="font-bold">{LAB_COPY[lab.id] ? t(copy.title) : lab.id}</h3>
                  <p className="text-sm text-white/60">{LAB_COPY[lab.id] ? t(copy.hint) : ""}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </StudentPanel>
  );
}
