import { cn } from "../../utils/cn";

export default function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && (
          <span className="block text-xs text-fg-muted">{description}</span>
        )}
      </span>
      <span className="relative inline-flex flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "h-6 w-11 rounded-full bg-line-strong transition-colors peer-checked:bg-accent",
          )}
        />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
