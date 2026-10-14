import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

type LegacyModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Header colors, e.g. "bg-[#0dcaf0] text-white". */
  headerClassName: string;
  /** White close icon for dark headers. */
  closeWhite?: boolean;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Centered dialog that looks like the legacy modal: 1rem radius, large soft shadow,
 * colored header, dim backdrop. Escape and a click on the backdrop close it.
 */
export function LegacyModal({ open, onClose, title, headerClassName, closeWhite = false, wide = false, children, footer }: LegacyModalProps) {
  const { t } = useTranslation("common");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1055] overflow-y-auto bg-black/50" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={cn("mx-auto flex min-h-[calc(100%-3.5rem)] items-center px-2 py-7", wide ? "max-w-[800px]" : "max-w-[500px]")}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="flex w-full flex-col overflow-hidden rounded-2xl border-0 bg-white shadow-[0_1rem_3rem_rgba(0,0,0,0.175)] focus:outline-none"
        >
          <div className={cn("flex items-center justify-between border-b border-[#dee2e6] p-4", headerClassName)}>
            <h5 id={titleId} className="m-0 text-xl leading-normal font-bold">
              {title}
            </h5>
            <button
              type="button"
              aria-label={t("close")}
              onClick={onClose}
              className={cn("p-1 opacity-50 hover:opacity-75", closeWhite ? "text-white" : "text-black")}
            >
              <X aria-hidden="true" className="size-4" strokeWidth={3} />
            </button>
          </div>
          <div className="p-6">{children}</div>
          {footer ? <div className="flex flex-wrap items-center justify-end gap-2 p-3">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
