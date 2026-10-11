import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

type StatTone = "brand" | "danger" | "success";

const tones: Record<StatTone, { icon: string; value: string }> = {
  brand: { icon: "bg-brand-700/10 text-brand-700", value: "text-ink-strong" },
  danger: { icon: "bg-danger/10 text-danger", value: "text-danger" },
  success: { icon: "bg-success/10 text-success", value: "text-ink-strong" },
};

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
};

export const StatCard = memo(function StatCard({ label, value, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <Card className="flex h-full items-center gap-4 p-4 transition-shadow hover:shadow-raised sm:p-5">
      <div className={cn("flex size-14 shrink-0 items-center justify-center rounded-card", tones[tone].icon)}>
        <Icon aria-hidden="true" className="size-7" />
      </div>
      <div className="min-w-0">
        <p className="text-sm break-words text-ink-muted">{label}</p>
        <p className={cn("text-2xl font-bold tabular-nums", tones[tone].value)}>{value}</p>
      </div>
    </Card>
  );
});
