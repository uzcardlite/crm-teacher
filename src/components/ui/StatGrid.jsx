import Card from "./Card";
import Skeleton from "./Skeleton";
import { cn } from "../../utils/cn";

// The only stat-row grid in the app — replaces the hand-written
// `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4` copies.
// `compact` matches StatCard's compact variant (denser, 6 per row).
// While `loading`, the grid draws `count` skeleton cards itself.
export default function StatGrid({
  loading = false,
  count = 4,
  compact = false,
  className,
  children,
}) {
  const gridClass = cn(
    "grid",
    compact
      ? "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      : "grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
    className,
  );

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} padding={compact ? "p-3" : "p-5"} className="flex flex-col gap-3">
            <Skeleton className={compact ? "h-8 w-8 rounded-btn" : "h-10 w-10 rounded-btn"} />
            <div className="flex flex-col gap-1.5">
              <Skeleton className={compact ? "h-5 w-16" : "h-7 w-24"} />
              <Skeleton className="h-3 w-20" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return <div className={gridClass}>{children}</div>;
}
