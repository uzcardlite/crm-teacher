import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";

// Three widths only — anything else breaks the rhythm of the app.
const SIZE_STYLES = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export default function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
  footer,
  className,
}) {
  const { t } = useTranslation();
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Lock the page behind the dialog so the background never scrolls.
  useEffect(() => {
    if (!open) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  // Tailwind emits `max-w-2xl` BEFORE `max-w-md`, so a size class would win
  // over a caller's own `className="max-w-2xl"` no matter the order here.
  // Legacy callers that already pass a width keep it; `size` is skipped.
  const hasCustomWidth = typeof className === "string" && /(^|\s)max-w-/.test(className);

  // NOTE: clicking the backdrop deliberately does NOT close the dialog —
  // long forms would lose their data on a stray click.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex max-h-[90vh] w-full flex-col rounded-card bg-surface shadow-card",
          !hasCustomWidth && (SIZE_STYLES[size] ?? SIZE_STYLES.md),
          className,
        )}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 rounded-t-card border-b border-line bg-surface px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 text-fg-faint transition-colors hover:text-fg-secondary"
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <div className="sticky bottom-0 flex justify-end gap-2 rounded-b-card border-t border-line bg-surface px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
