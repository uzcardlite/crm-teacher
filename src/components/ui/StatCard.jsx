import { Lock, TrendingDown, TrendingUp } from "lucide-react";
import Card from "./Card";
import KoshinStar from "./KoshinStar";
import { cn } from "../../utils/cn";

// Gradient variants pair a light-mode gradient with a darker dark-mode
// counterpart so the card stays legible (and WCAG AA) in both themes.
const VARIANT_STYLES = {
  plain: "",
  blue: "bg-gradient-blue dark:bg-gradient-blue-dark",
  green: "bg-gradient-green dark:bg-gradient-green-dark",
  orange: "bg-gradient-orange dark:bg-gradient-orange-dark",
  purple: "bg-gradient-purple dark:bg-gradient-purple-dark",
  rose: "bg-gradient-rose dark:bg-gradient-rose-dark",
  teal: "bg-gradient-teal dark:bg-gradient-teal-dark",
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
  const isColored = variant !== "plain" && !locked;

  return (
    <Card
      padding={compact ? "p-3" : "p-5"}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden flex flex-col",
        compact ? "gap-2" : "gap-3",
        onClick && "u-press cursor-pointer hover:shadow-card-hover",
        isColored && VARIANT_STYLES[variant],
        isColored && "border-transparent",
        className,
      )}
    >
      {/* Glossy top-light bloom on coloured tiles — the "lit glass" sheen from
          the reference widgets. pointer-events-none so taps pass through. */}
      {isColored && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 -top-8 h-24 w-24 rounded-full bg-white/25 blur-2xl"
        />
      )}
      {/* Faint national watermark; pointer-events-none so it never intercepts
          the card's onClick. Hidden in the locked state. */}
      {!locked && (
        <KoshinStar
          size={60}
          className={cn(
            "pointer-events-none absolute -right-3 -top-3",
            isColored ? "text-white/[0.12]" : "text-accent/[0.08]",
          )}
        />
      )}
      <div className="flex items-center justify-between">
        {(locked || Icon) && (
          <span
            className={cn(
              "flex items-center justify-center rounded-btn",
              locked
                ? "bg-surface-sunken text-fg-faint"
                : isColored
                  ? "bg-white/20 text-white dark:bg-white/10"
                  : "bg-accent-light/30 text-accent-dark dark:text-accent",
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
              isColored
                ? "bg-white/20 text-white"
                : isPositive
                  ? "bg-success-bg text-success"
                  : "bg-danger-bg text-danger",
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
                // Heritage display serif with tabular figures — the stat value
                // is the card's headline moment across every screen.
                "font-display font-semibold tabular-nums",
                isColored ? "text-white" : "text-fg",
                compact ? "text-xl" : "text-3xl",
              )}
            >
              {value === null || value === undefined || value === "" ? "—" : value}
            </p>
            <p className={cn(isColored ? "text-white/70" : "text-fg-muted", compact ? "text-xs" : "text-sm")}>
              {label}
            </p>
          </>
        )}
        {hint && (
          <p
            className={cn(
              isColored ? "text-white/70" : "text-fg-faint",
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
