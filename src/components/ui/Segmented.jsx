import { cn } from "../../utils/cn";

// System segmented control. options: [{ value, label }]. Scrolls sideways
// when the labels do not fit (e.g. many groups).
export default function Segmented({ options, value, onChange, ariaLabel, className }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex gap-0.5 overflow-x-auto rounded-[10px] bg-surface-sunken p-0.5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 min-w-[30%] flex-1 shrink-0 truncate rounded-lg px-3 text-[13px] transition-colors",
              active ? "bg-surface font-semibold text-fg shadow-card" : "font-medium text-fg-secondary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
