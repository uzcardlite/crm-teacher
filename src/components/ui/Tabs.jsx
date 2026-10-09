import { cn } from "../../utils/cn";

export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div
      className={cn(
        // inline-flex, not flex: the pill background must hug however many
        // tabs there are. A page that genuinely wants it full-width (e.g.
        // Students.jsx's status filter) already passes an explicit w-full.
        "inline-flex items-center gap-1 overflow-x-auto rounded-btn bg-surface-sunken p-1",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex-shrink-0 rounded-btn px-3 py-1.5 text-sm font-medium transition-colors",
            value === tab.key
              ? "bg-surface text-fg shadow-sm"
              : "text-fg-muted hover:text-fg-secondary",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span className="ml-1.5 text-xs text-fg-faint">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
