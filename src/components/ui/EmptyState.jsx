import Button from "./Button";
import KoshinStar from "./KoshinStar";
import { cn } from "../../utils/cn";

// size="md" (default) — page-level empty state.
// size="sm"           — compact, for an empty table body or a card slot.
const SIZE_STYLES = {
  sm: { wrapper: "gap-2 px-4 py-6", icon: "h-9 w-9", iconSize: 18, title: "text-sm" },
  // Page-level empty state: the title carries the heritage display serif, a
  // quiet echo of the koshin watermark behind it.
  md: { wrapper: "gap-3 px-6 py-12", icon: "h-12 w-12", iconSize: 22, title: "font-display text-lg" },
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  size = "md",
  className,
  children,
}) {
  const styles = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-card border border-dashed border-line-strong bg-surface text-center",
        styles.wrapper,
        className,
      )}
    >
      {/* Faint national watermark tying every empty screen to the brand. */}
      {size !== "sm" && (
        <KoshinStar
          size={132}
          strokeWidth={4}
          className="pointer-events-none absolute -right-10 -top-10 text-accent/[0.05]"
        />
      )}
      {Icon && (
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full bg-accent-light/30 text-accent-dark dark:text-accent",
            styles.icon,
          )}
        >
          <Icon size={styles.iconSize} />
        </span>
      )}
      <div className="relative">
        <h3 className={cn("font-semibold text-fg", styles.title)}>{title}</h3>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {/* Legacy shorthand first, then the free-form slots. */}
      {actionLabel && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {action}
      {children}
    </div>
  );
}
