import { useId } from "react";
import { cn } from "../../utils/cn";

export default function Input({ label, error, className, id, name, ...props }) {
  const fallbackId = useId();
  const inputId = id || name || fallbackId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fg-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "rounded-btn border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-faint [color-scheme:light] dark:[color-scheme:dark]",
          error
            ? "border-danger focus:ring-danger/30"
            : "border-line-strong focus:border-accent",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
