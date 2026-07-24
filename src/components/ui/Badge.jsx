import { cn } from "../../utils/cn";

const VARIANT_STYLES = {
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  warning: "bg-accent-light/40 text-accent-dark",
  neutral: "bg-surface-sunken text-fg-secondary",
  teal: "bg-scheduleBlock-teal-bg text-scheduleBlock-teal-text",
  rose: "bg-scheduleBlock-rose-bg text-scheduleBlock-rose-text",
  violet: "bg-scheduleBlock-violet-bg text-scheduleBlock-violet-text",
  // Semantic token instead of the calendar-block hue it used to borrow.
  info: "bg-info-bg text-info",
  // `blue` is the legacy alias of `info` — same pixels, kept so existing
  // callers (constants/marketing.js, constants/moliya.js) keep working.
  blue: "bg-info-bg text-info",
};

export default function Badge({ variant = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
