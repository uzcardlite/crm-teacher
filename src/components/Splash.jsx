import { useEffect, useState } from "react";

// A short branded launch animation shown over the app on boot: the koshin
// hexagon pops in on the amber field, the wordmark fades up, then the whole
// layer fades out to reveal the cabinet. Pure CSS (see index.css) so it stays
// light on low-end phones; skipped entirely under reduced-motion.
export default function Splash() {
  const [fadingOut, setFadingOut] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadingOut(true), 1050);
    const t2 = setTimeout(() => setGone(true), 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div className={`splash${fadingOut ? " splash--out" : ""}`} aria-hidden="true">
      <div className="splash__logo">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#FFFFFF"
            fillRule="evenodd"
            d="M100 22 L167.5 61 L167.5 139 L100 178 L32.5 139 L32.5 61 Z
               M100 44 L148.5 72 L148.5 128 L100 156 L51.5 128 L51.5 72 Z"
          />
        </svg>
      </div>
      <div className="splash__title">Ustoz</div>
    </div>
  );
}
