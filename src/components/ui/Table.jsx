import Skeleton from "./Skeleton";
import { cn } from "../../utils/cn";

// Column shape:
//   { key, header, render?, align?, nowrap?, truncate?, className? }
//   align    "left" (default) | "right" | "center"  — applied to th AND td
//   nowrap   true  -> `whitespace-nowrap` (dates, amounts, short codes)
//   truncate true  -> `max-w-[220px] truncate` + native title tooltip
//   className extra td classes (e.g. a custom max-width for truncation)
const ALIGN_STYLES = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

function alignClass(col) {
  return ALIGN_STYLES[col.align] ?? ALIGN_STYLES.left;
}

function cellClass(col) {
  return cn(
    "px-4 py-3 text-fg-secondary",
    alignClass(col),
    // Right-aligned columns are numeric by convention — keep digits in a grid.
    col.align === "right" && "tabular-nums",
    col.nowrap && "whitespace-nowrap",
    col.truncate && "max-w-[220px] truncate",
    col.className,
  );
}

// Empty cells always render an em dash, never a hyphen or a blank gap.
function isEmpty(value) {
  return value === null || value === undefined || value === "";
}

export default function Table({ columns, data, loading, emptyState, rowKey, onRowClick }) {
  const head = (
    <thead>
      <tr className="border-b border-line bg-surface-sunken">
        {columns.map((col) => (
          <th
            key={col.key}
            className={cn(
              "px-4 py-3 font-medium text-fg-muted",
              alignClass(col),
              col.nowrap && "whitespace-nowrap",
            )}
          >
            {col.header}
          </th>
        ))}
      </tr>
    </thead>
  );

  if (loading) {
    return (
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <table className="w-full text-sm">
          {head}
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-line last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[160px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full text-sm">
        {head}
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowKey ? rowKey(row) : rowIndex}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-line transition-colors last:border-0 hover:bg-surface-sunken",
                onRowClick && "cursor-pointer",
              )}
            >
              {columns.map((col) => {
                const value = col.render ? col.render(row) : row[col.key];
                return (
                  <td
                    key={col.key}
                    className={cellClass(col)}
                    title={
                      col.truncate && typeof value === "string" && value ? value : undefined
                    }
                  >
                    {isEmpty(value) ? <span className="text-fg-faint">—</span> : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
