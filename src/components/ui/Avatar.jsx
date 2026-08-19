import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { initials } from "../../utils/format";
import { cn } from "../../utils/cn";

// Single avatar treatment for the whole app: photo when there is one,
// initials on `bg-accent-light` otherwise. There is no gray variant.
const SIZE_STYLES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

// Big enough that a face is actually recognisable on zoom, not just a token bump.
const ZOOM_DIAMETER = 144;

export default function Avatar({ photoUrl, name, size = "md", zoomOnHover = false, className }) {
  const sizeClass = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const triggerRef = useRef(null);
  const [zoomPosition, setZoomPosition] = useState(null);

  function openZoom() {
    if (!zoomOnHover || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setZoomPosition({
      top: rect.top + rect.height / 2 - ZOOM_DIAMETER / 2,
      left: rect.left + rect.width / 2 - ZOOM_DIAMETER / 2,
    });
  }

  function closeZoom() {
    setZoomPosition(null);
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={openZoom}
        onMouseLeave={closeZoom}
        // Hover is the primary trigger, but keyboard users can tab to the
        // photo and get the same enlarged view via focus.
        tabIndex={zoomOnHover ? 0 : undefined}
        onFocus={zoomOnHover ? openZoom : undefined}
        onBlur={zoomOnHover ? closeZoom : undefined}
        className={cn(
          "inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-light font-semibold text-accent-dark",
          sizeClass,
          zoomOnHover &&
            "transition-transform hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          className,
        )}
        title={name || undefined}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={name || ""} className="h-full w-full object-cover" />
        ) : (
          initials(name)
        )}
      </span>

      {/* Rendered through a portal into <body> so the enlarged photo overlays
          neighbouring content (fixed positioning + z-index) instead of pushing
          the row layout, and is never clipped by a scrolling/overflow-hidden
          table ancestor. Purely decorative and non-interactive, so it never
          blocks clicks on the row or the attendance controls underneath it. */}
      {zoomOnHover &&
        zoomPosition &&
        createPortal(
          <span
            aria-hidden="true"
            style={{
              top: zoomPosition.top,
              left: zoomPosition.left,
              width: ZOOM_DIAMETER,
              height: ZOOM_DIAMETER,
            }}
            className="pointer-events-none fixed z-50 flex items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-accent-light text-3xl font-semibold text-accent-dark shadow-card-hover transition-shadow"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(name)
            )}
          </span>,
          document.body,
        )}
    </>
  );
}
