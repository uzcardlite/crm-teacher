import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Bump this on every store release. The bundled app compares it against the
// remote app-version.json; a newer remote version triggers the update prompt.
export const APP_VERSION = "1.0.0";

// Where the latest version metadata lives (always fetched from the live web, so
// even the old remote-loading app can read it).
const VERSION_URL = "https://ustoz.ncrm.uz/app-version.json";

function cmp(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

// Two jobs in one place:
//  • New bundled app (loaded locally): checks for a newer store version and
//    invites the teacher to update.
//  • Old app (still loading ustoz.ncrm.uz remotely): invites them to install
//    the new official app instead.
// A browser tab sees neither. Dismissible; re-appears next launch.
export default function UpdateGate() {
  const [info, setInfo] = useState(null); // {url, notes}
  const [mode, setMode] = useState(null); // "update" | "migrate"
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const cap = typeof window !== "undefined" ? window.Capacitor : undefined;
    if (!cap?.isNativePlatform?.()) return; // only inside the app
    const remote = /ustoz\.ncrm\.uz/i.test(window.location.hostname);

    let alive = true;
    fetch(VERSION_URL, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d) return;
        if (remote) {
          // Old app — nudge to the new official build, but only once the new
          // app is actually published (flip "migrate": true in app-version.json).
          if (d.migrate) {
            setMode("migrate");
            setInfo(d);
          }
        } else if (cmp(d.version, APP_VERSION) > 0) {
          setMode("update");
          setInfo(d);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!mode || dismissed || !info?.url) return null;

  const isMigrate = mode === "migrate";
  return (
    <div className="fixed inset-x-0 top-0 z-[9998] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-sidebar px-4 py-3 text-white shadow-card">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-accent-dark">
          <Download size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold leading-tight">
            {isMigrate ? "Yangi rasmiy ilova chiqdi" : "Yangi versiya tayyor"}
          </div>
          <div className="truncate text-[11.5px] text-white/70">
            {info.notes || (isMigrate ? "Ustoz ilovasini yangilang" : `Versiya ${info.version}`)}
          </div>
        </div>
        <a
          href={info.url}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 rounded-btn bg-accent px-3.5 py-2 text-xs font-extrabold text-accent-dark"
        >
          Yuklab olish
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Yopish"
          className="flex-shrink-0 text-white/50 transition-colors hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
