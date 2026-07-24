import { cn } from "../../utils/cn";

export default function Spinner({ size = 20, className }) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-line-strong border-t-accent",
        className,
      )}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Yuklanmoqda"
    />
  );
}
