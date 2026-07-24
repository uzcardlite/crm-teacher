import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";

// The ONLY pagination UI in the system: numbered buttons with prev/next
// arrows at the edges, windowed to at most 7 slots (1 … 4 5 6 … 20).
function buildPages(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);
  if (page <= 3) {
    start = 2;
    end = 4;
  }
  if (page >= totalPages - 2) {
    start = totalPages - 3;
    end = totalPages - 1;
  }

  const pages = [1];
  if (start > 2) pages.push("start-gap");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push("end-gap");
  pages.push(totalPages);
  return pages;
}

const ARROW_STYLES =
  "flex h-8 w-8 items-center justify-center rounded-btn border border-line-strong bg-surface text-fg-secondary transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50";

export default function Pagination({ page, totalPages, onChange, total, className }) {
  const { t, i18n } = useTranslation();
  const hasPages = Boolean(totalPages) && totalPages > 1;
  const hasTotal = total !== null && total !== undefined;

  if (!hasPages && !hasTotal) return null;

  const numberLocale = i18n.language === "ru" ? "ru-RU" : "uz-UZ";

  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-3",
        hasTotal ? "justify-between" : "justify-center",
        className,
      )}
    >
      {hasTotal && (
        <span className="text-sm text-fg-muted">
          {t("common.recordsCount", { count: Number(total).toLocaleString(numberLocale) })}
        </span>
      )}
      {hasPages && (
        <nav className="flex items-center gap-1" aria-label={t("common.pagesAriaLabel")}>
          <button
            type="button"
            className={ARROW_STYLES}
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label={t("common.previousPage")}
            title={t("common.previous")}
          >
            <ChevronLeft size={16} />
          </button>

          {buildPages(page, totalPages).map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "h-8 min-w-[2rem] rounded-btn px-2 text-sm font-medium tabular-nums transition-colors",
                  item === page
                    ? "bg-accent text-accent-dark"
                    : "text-fg-secondary hover:bg-surface-sunken",
                )}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="px-1 text-sm text-fg-faint" aria-hidden="true">
                …
              </span>
            ),
          )}

          <button
            type="button"
            className={ARROW_STYLES}
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            aria-label="Keyingi sahifa"
            title="Keyingi"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
