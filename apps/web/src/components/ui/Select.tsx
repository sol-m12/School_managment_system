import { useId, type ComponentPropsWithRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldControlClass, fieldLabelClass } from "./Input";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<ComponentPropsWithRef<"select">, "children"> & {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
};

export function Select({ label, options, placeholder, error, id, className, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={className}>
      <label htmlFor={selectId} className={fieldLabelClass}>
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(fieldControlClass, "appearance-none pr-10", Boolean(error) && "border-danger")}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
        />
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
