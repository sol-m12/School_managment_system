import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn("min-w-0 rounded-card border border-border bg-surface shadow-soft", className)}
      {...rest}
    />
  );
}

type CardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold break-words text-ink-strong">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("p-4 sm:p-5", className)} {...rest} />;
}
