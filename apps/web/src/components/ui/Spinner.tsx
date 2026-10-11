import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

const sizes = { sm: "size-4", md: "size-6", lg: "size-10" } as const;

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 aria-hidden="true" className={cn("animate-spin", sizes[size])} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
