import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthNames } from "../../utils/format";

// "‹  Oktabr 2026  ›" — value/onChange are "YYYY-MM-01" strings.
export default function MonthSwitcher({ value, onChange }) {
  const { t } = useTranslation();
  const [y, m] = value.split("-").map(Number);
  const names = getMonthNames();

  function shift(delta) {
    const date = new Date(y, m - 1 + delta, 1);
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`);
  }

  return (
    <div className="flex items-center justify-between rounded-card bg-surface px-1 shadow-card">
      <button type="button" onClick={() => shift(-1)} aria-label={t("teacher.month.prev")} className="flex h-11 w-11 items-center justify-center text-fg-secondary">
        <ChevronLeft size={20} />
      </button>
      <span className="text-[15px] font-semibold text-fg">
        {names[m - 1]} {y}
      </span>
      <button type="button" onClick={() => shift(1)} aria-label={t("teacher.month.next")} className="flex h-11 w-11 items-center justify-center text-fg-secondary">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
