import { cn } from "../../utils/cn";
import KoshinStar from "./KoshinStar";

// Canonical page title block. `children` = the right-hand action area
// (usually one primary Button, optionally a secondary next to it).
export default function PageHeader({ title, subtitle, className, children }) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-3", className)}>
      <div>
        <div className="inline-flex items-center gap-2">
          <KoshinStar size={18} className="text-accent shrink-0" />
          <h1 className="text-lg font-semibold text-fg">{title}</h1>
        </div>
        {subtitle && <p className="text-sm text-fg-muted">{subtitle}</p>}
        {/* National accent underline — stays inside the left block so it never
            shifts the right-hand action buttons. */}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-[3px] w-[52px] rounded-full bg-gradient-to-r from-accent to-accent-light" />
          <span className="h-1.5 w-1.5 rotate-45 rounded-[1px] bg-accent-light" />
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
