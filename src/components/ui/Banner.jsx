import { cn } from "../../utils/cn";

// Soft-bg / text pairs mirror ui/Badge's VARIANT_STYLES exactly — one colour
// source, no new tokens.
const VARIANT_STYLES = {
  info: "bg-info-bg text-info",
  warning: "bg-accent-light/40 text-accent-dark",
  danger: "bg-danger-bg text-danger",
  success: "bg-success-bg text-success",
};

// A full-width (or card-rounded) inline notice strip. The icon inherits the
// variant's text colour — do not colour it separately.
export default function Banner({
  variant = "info",
  icon: Icon,
  children,
  action,
  className,
  rounded = "none",
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm",
        rounded === "card" ? "rounded-card" : "rounded-none",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {Icon && <Icon size={16} className="flex-shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
