import { cn } from "../../utils/cn";

export default function Card({
  className,
  children,
  padding = "p-5",
  hoverable = false,
  ...props
}) {
  // `cn` is a plain string join, not a Tailwind-aware merge: two `bg-*`
  // classes in the same element don't override by JSX order, they override
  // by whichever rule Tailwind happened to generate later in the stylesheet.
  // A caller passing its own `bg-*` (e.g. a dark card) can silently lose to
  // this default and render invisible white-on-white — so skip the default
  // here instead of trusting cascade order to sort it out.
  const hasCustomBackground = /\bbg-/.test(className || "");

  return (
    <div
      className={cn(
        "rounded-card border border-line shadow-card",
        !hasCustomBackground && "bg-surface",
        // Interactive cards lift softly — never `hover:shadow-md`.
        hoverable && "transition-shadow hover:shadow-card-hover",
        padding,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
