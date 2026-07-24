import { cn } from "../../utils/cn";

const VARIANT_STYLES = {
  primary: "bg-accent text-accent-dark hover:bg-accent-light",
  secondary: "bg-surface border border-line-strong text-fg-secondary hover:bg-surface-sunken",
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
        "inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
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
