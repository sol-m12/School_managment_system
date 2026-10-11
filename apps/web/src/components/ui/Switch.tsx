import { useId, type ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  label: string;
};

export function Switch({ label, id, className, ...rest }: SwitchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={cn("inline-flex min-h-tap cursor-pointer items-center gap-3 text-sm font-semibold text-ink-muted", className)}
    >
      <span className="relative inline-flex shrink-0">
        <input id={inputId} type="checkbox" role="switch" className="peer sr-only" {...rest} />
        <span
          aria-hidden="true"
          className="h-6 w-11 rounded-full border border-border bg-canvas transition peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-700/10"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 left-1 size-4 rounded-full border border-border bg-white shadow-soft transition peer-checked:translate-x-5"
        />
      </span>
      <span className="min-w-0 break-words">{label}</span>
    </label>
  );
}
