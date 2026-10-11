import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center sm:py-14">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon ?? <Inbox aria-hidden="true" className="size-7" />}
      </div>
      <h3 className="text-base font-semibold break-words text-ink-strong">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
