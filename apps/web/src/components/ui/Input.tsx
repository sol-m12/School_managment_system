import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type InputProps = ComponentPropsWithRef<"input"> & {
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
};

export const fieldLabelClass = "mb-1.5 block text-sm font-semibold text-ink-muted";

export const fieldControlClass =
  "block min-h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3.5 text-sm text-ink-strong " +
  "placeholder:text-ink-muted/70 transition focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-700/10 " +
  "disabled:bg-canvas disabled:opacity-70";

export function Input({ label, error, hint, icon, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={inputId} className={fieldLabelClass}>
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-ink-muted">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            fieldControlClass,
            Boolean(icon) && "pl-11",
            Boolean(error) && "border-danger focus:border-danger focus:ring-danger/10",
          )}
          {...rest}
        />
      </div>
      {message ? (
        <p id={messageId} className={cn("mt-1.5 text-xs", error ? "text-danger" : "text-ink-muted")}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
