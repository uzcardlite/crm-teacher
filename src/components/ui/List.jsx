import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

// System-style grouped list: one white (graphite in dark) block with hairline
// separators between rows. Rows are links, buttons or plain rows.
export function GroupedList({ title, action, className, children }) {
  return (
    <section className={cn("space-y-2", className)}>
      {(title || action) && (
        <div className="flex items-baseline justify-between px-1">
          {title && <h2 className="text-[13px] font-medium uppercase tracking-wide text-fg-muted">{title}</h2>}
          {action}
        </div>
      )}
      <div className="overflow-hidden rounded-card bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-line">
        {children}
      </div>
    </section>
  );
}

// leading: an icon tile / avatar node; trailing: value text or node.
export function ListRow({ to, onClick, leading, title, subtitle, trailing, chevron, className }) {
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base text-fg">{title}</span>
        {subtitle && <span className="block truncate text-[13px] text-fg-secondary">{subtitle}</span>}
      </span>
      {trailing !== undefined && trailing !== null && (
        <span className="max-w-[45%] shrink-0 truncate text-right text-[15px] text-fg-muted">{trailing}</span>
      )}
      {(chevron ?? Boolean(to || onClick)) && <ChevronRight size={18} className="shrink-0 text-fg-faint" />}
    </>
  );
  const rowClass = cn(
    "flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left",
    (to || onClick) && "transition-colors hover:bg-surface-sunken",
    className,
  );
  if (to) return <Link to={to} className={rowClass}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={rowClass}>{body}</button>;
  return <div className={rowClass}>{body}</div>;
}

// A small coloured square holding a white icon (settings-style).
export function IconTile({ icon: Icon, tone = "bg-fg-muted" }) {
  return (
    <span className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-lg text-white", tone)}>
      <Icon size={16} strokeWidth={2.2} />
    </span>
  );
}
