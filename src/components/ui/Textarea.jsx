import { forwardRef, useId } from "react";
import { cn } from "../../utils/cn";

const Textarea = forwardRef(function Textarea(
  { label, error, className, id, name, rows = 3, ...props },
  ref,
) {
  const fallbackId = useId();
  const textareaId = id || name || fallbackId;
  const errorId = `${textareaId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-fg-secondary">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "rounded-btn border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-faint",
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
});

export default Textarea;
