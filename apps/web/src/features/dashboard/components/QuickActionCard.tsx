import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

type QuickActionCardProps = {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const QuickActionCard = memo(function QuickActionCard({ to, title, description, icon: Icon }: QuickActionCardProps) {
  return (
    <Link
      to={to}
      className="flex h-full min-h-28 flex-col items-center justify-center rounded-card border border-border bg-surface p-4 text-center shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-700 hover:shadow-raised sm:p-5"
    >
      <Icon aria-hidden="true" className="mb-2 size-9 text-brand-700 sm:mb-3" />
      <span className="text-sm font-bold break-words text-ink-strong">{title}</span>
      <span className="mt-1 hidden text-xs text-ink-muted md:block">{description}</span>
    </Link>
  );
});
