import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type AlertTone = "danger" | "success" | "warning" | "info";

const tones: Record<AlertTone, { box: string; icon: ReactNode }> = {
  danger: { box: "border-danger/25 bg-danger/5 text-danger", icon: <AlertCircle className="size-4" /> },
  success: { box: "border-success/25 bg-success/5 text-success", icon: <CheckCircle2 className="size-4" /> },
  warning: {
    box: "border-warning/30 bg-warning/5 text-warning-strong",
    icon: <TriangleAlert className="size-4" />,
  },
  info: { box: "border-info/25 bg-info/5 text-info", icon: <Info className="size-4" /> },
};

type AlertProps = { tone?: AlertTone; children: ReactNode; className?: string };

export function Alert({ tone = "info", children, className }: AlertProps) {
  const { box, icon } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm", box, className)}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icon}
      </span>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
