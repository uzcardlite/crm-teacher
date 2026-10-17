import { cn } from "../../utils/cn";

// Serious, system-like buttons: one solid primary (black in light, white in
// dark), a quiet grey secondary, text-only ghost. `brand` is kept as an alias
// of primary so older call sites need no change.
const VARIANT_STYLES = {
  primary: "bg-primary text-primary-fg hover:opacity-90",
  brand: "bg-primary text-primary-fg hover:opacity-90",
  secondary: "bg-surface-sunken text-fg hover:bg-line",
  ghost: "bg-transparent text-fg-secondary hover:bg-surface-sunken",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const SIZE_STYLES = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn(
        "u-press inline-flex items-center justify-center gap-2 rounded-btn font-medium disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
