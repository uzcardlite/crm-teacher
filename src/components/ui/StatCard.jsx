import { Lock, TrendingDown, TrendingUp } from "lucide-react";
import Card from "./Card";
import { cn } from "../../utils/cn";

// Cards stay neutral; the variant only tints the small icon tile (the way
// system settings colour their icons), so colour still carries meaning.
const ICON_TONES = {
  plain: "bg-surface-sunken text-fg-secondary",
  blue: "bg-info text-white",
  green: "bg-success text-white",
  orange: "bg-accent text-accent-fg",
  purple: "bg-purple text-white",
  rose: "bg-danger text-white",
  teal: "bg-secondary text-white",
};

// `value` is free-form: a number, a preformatted string, or an em dash when
// there is nothing to show. `locked` renders the "module is switched off"
// state (replaces the per-page ModuleOffCard copies).
export default function StatCard({
  icon: Icon,
  label,
  value,
  change,
  hint,
  locked = false,
  onClick,
  className,
  compact = false,
  variant = "plain",
}) {
  const hasChange = !locked && typeof change === "number";
  const isPositive = hasChange && change >= 0;
  const LockedIcon = Icon ?? Lock;

  return (
    <Card
      padding={compact ? "p-3" : "p-5"}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden flex flex-col",
        compact ? "gap-2" : "gap-3",
        onClick && "u-press cursor-pointer hover:shadow-card-hover",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        {(locked || Icon) && (
          <span
            className={cn(
              "flex items-center justify-center rounded-btn",
              locked
                ? "bg-surface-sunken text-fg-faint"
                : ICON_TONES[variant] ?? ICON_TONES.plain,
              compact ? "h-8 w-8" : "h-10 w-10",
            )}
          >
            <LockedIcon size={compact ? 16 : 20} />
          </span>
        )}
        {hasChange && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
            )}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div>
        {locked ? (
          <p className={cn("font-medium text-fg-muted", compact ? "text-xs" : "text-sm")}>
            {label}
          </p>
        ) : (
          <>
            <p
              className={cn(
                "font-semibold tabular-nums tracking-tight text-fg",
                compact ? "text-xl" : "text-3xl",
              )}
            >
              {value === null || value === undefined || value === "" ? "—" : value}
            </p>
            <p className={cn("text-fg-muted", compact ? "text-xs" : "text-sm")}>
              {label}
            </p>
          </>
        )}
        {hint && (
          <p
            className={cn(
              "text-fg-faint",
              locked && compact ? "text-[10px]" : "mt-0.5 text-xs",
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </Card>
  );
}
