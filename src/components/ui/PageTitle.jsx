import { cn } from "../../utils/cn";

// Large page title in the system style: optional small line above, the
// title, an optional subtitle, and an action on the right.
export default function PageTitle({ eyebrow, title, subtitle, action, className }) {
  return (
    <header className={cn("flex items-end gap-3 px-1", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-[13px] font-medium text-fg-muted">{eyebrow}</p>}
        <h1 className="mt-0.5 line-clamp-2 break-words text-[28px] font-bold leading-tight tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[15px] text-fg-secondary">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
