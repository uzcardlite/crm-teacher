// Koshin (girih) star: two overlapping outlined polygons forming an
// eight-pointed motif. Color comes only from `currentColor` (the parent's
// `text-*` token) — no hex here. Shares the lucide interface (`size`,
// `className`) so it can be passed as `icon={KoshinStar}` in the future.
export default function KoshinStar({ size = 20, className, strokeWidth = 6 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    >
      <polygon fill="none" stroke="currentColor" points="50,6 94,50 50,94 6,50" />
      <polygon fill="none" stroke="currentColor" points="20,20 80,20 80,80 20,80" />
    </svg>
  );
}
