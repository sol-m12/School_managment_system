import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = Omit<ComponentPropsWithRef<"button">, "aria-label" | "children"> & {
  label: string;
  icon: ReactNode;
  tone?: "light" | "shell";
};

const tones = {
  light: "text-ink-muted hover:bg-canvas hover:text-ink-strong",
  shell: "bg-white/5 text-white hover:bg-white/15",
} as const;

export function IconButton({ label, icon, tone = "light", className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-tap shrink-0 items-center justify-center rounded-control transition-colors",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
