import { useId } from "react";
import { cn } from "../../utils/cn";
import { formatDate } from "../../utils/format";

// Drop-in replacement for `<input type="date">` that always displays
// dd.mm.yyyy regardless of the browser/OS locale (native date inputs render
// in whatever format the user's locale dictates, which on many machines is
// mm/dd/yyyy — not what this app wants).
//
// The underlying value/onChange contract is untouched: `value` is the ISO
// "yyyy-mm-dd" string the backend expects, and `onChange` fires a normal
// change event whose `target.value` is also ISO — existing
// `onChange={(e) => setForm(...e.target.value)}` handlers keep working
// unmodified.
//
// Implementation: the real `<input type="date">` stays mounted (so the
// native calendar picker still works) but its own text is made transparent,
// and a formatted dd.mm.yyyy label is drawn on top of it. Clicks pass
// through the label (pointer-events-none) straight to the input underneath.
export default function DateInput({ label, error, className, id, name, value, placeholder = "kk.oo.yyyy", disabled, type: _type, ...props }) {
  const fallbackId = useId();
  const inputId = id || name || fallbackId;
  const errorId = `${inputId}-error`;
  const displayValue = value ? formatDate(value) : "";

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fg-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="date"
          value={value || ""}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "w-full rounded-btn border bg-surface px-3 py-2 text-sm text-transparent caret-transparent placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:bg-surface-sunken [color-scheme:light] dark:[color-scheme:dark]",
            error
              ? "border-danger focus:ring-danger/30"
              : "border-line-strong focus:border-accent",
            className,
          )}
          {...props}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm",
            disabled ? "text-fg-faint" : displayValue ? "text-fg" : "text-fg-faint",
          )}
        >
          {displayValue || placeholder}
        </span>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
