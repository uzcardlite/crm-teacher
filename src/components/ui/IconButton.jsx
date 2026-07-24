import { cn } from "../../utils/cn";

// Square icon-only action for table rows and card corners. Replaces both the
// hand-rolled row buttons and `Button size="sm" variant="ghost"` with an icon.
// `aria-label` is REQUIRED — an icon alone has no accessible name.
const TONE_STYLES = {
  default: "text-fg-muted hover:bg-surface-sunken hover:text-fg-secondary",
  danger: "text-fg-faint hover:bg-danger-bg hover:text-danger",
  accent: "text-accent hover:bg-accent-light/30 hover:text-accent-dark",
};

export default function IconButton({
  icon: Icon,
  tone = "default",
  "aria-label": ariaLabel,
  title,
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={cn(
        "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        TONE_STYLES[tone] ?? TONE_STYLES.default,
        className,
      )}
      {...props}
    >
      {Icon ? <Icon size={16} /> : children}
    </button>
  );
}
