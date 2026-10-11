import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg";

type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white shadow-soft hover:bg-brand-800 hover:-translate-y-px hover:shadow-raised",
  secondary: "border border-border bg-surface text-ink hover:bg-canvas hover:border-brand-100",
  ghost: "text-ink hover:bg-canvas",
  danger: "bg-danger text-white shadow-soft hover:bg-danger/90",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-tap px-4 text-sm",
  lg: "min-h-11 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition duration-200",
        "disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      <span className="min-w-0 truncate">{children}</span>
      {!loading && rightIcon}
    </button>
  );
}
