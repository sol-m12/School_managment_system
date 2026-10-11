import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-canvas text-ink border-border",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning-strong border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-info/10 text-info border-info/20",
};

type BadgeProps = { tone?: BadgeTone; children: ReactNode; className?: string };

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
