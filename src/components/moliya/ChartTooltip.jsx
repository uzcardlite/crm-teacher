import { useTranslation } from "react-i18next";
import { formatMoneyI18n } from "../../constants/moliya";

// Shared tooltip for every Moliya chart — the recharts default is never used.
// `formatter` lets a chart render counts ("12 ta") instead of money. It is a
// component (not a plain module function), so it can call useTranslation
// itself and build the i18n-aware default formatter here.
export default function ChartTooltip({ active, payload, label, formatter }) {
  const { t } = useTranslation();
  const fmt = formatter || ((value) => formatMoneyI18n(value, t));
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-card border border-line bg-surface px-3 py-2 shadow-card">
      {label !== undefined && label !== "" && (
        <p className="mb-1 text-xs font-medium text-fg">{label}</p>
      )}
      {payload.map((item) => (
        <p key={item.dataKey || item.name} className="text-xs text-fg-muted">
          {item.name}: <span className="font-medium text-fg">{fmt(item.value)}</span>
        </p>
      ))}
    </div>
  );
}
