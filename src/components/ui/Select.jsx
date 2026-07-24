import { useId } from "react";
import { cn } from "../../utils/cn";

export default function Select({
  label,
  error,
  className,
  id,
  name,
  children,
  ...props
}) {
  const fallbackId = useId();
  const selectId = id || name || fallbackId;
  const errorId = `${selectId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-fg-secondary">
          {label}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          // Same disabled treatment as Input/Textarea.
          "rounded-btn border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-faint",
          error
            ? "border-danger focus:ring-danger/30"
            : "border-line-strong focus:border-accent",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
