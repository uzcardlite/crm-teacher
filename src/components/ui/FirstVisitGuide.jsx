import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X } from "lucide-react";
import Button from "./Button";

const SEEN_KEY = "ustoz_guides_seen";

function readSeen() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markSeen(id) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...readSeen(), id])]));
  } catch {
    // storage blocked: the guide simply shows again next time
  }
}

// A short step-by-step guide shown the first time a teacher opens a section
// (every new feature ships with one). `steps` are [{ title, body }] already
// translated; bump `id` when a section changes enough to be shown again.
export default function FirstVisitGuide({ id, steps }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => !readSeen().includes(id));
  const [index, setIndex] = useState(0);

  if (!open || steps.length === 0) return null;

  function close() {
    markSeen(id);
    setOpen(false);
  }

  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      <div
        role="dialog"
        aria-label={step.title}
        className="w-full max-w-lg rounded-card border border-line bg-surface-raised p-4 shadow-card-hover"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-surface-sunken text-fg-secondary">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">{step.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{step.body}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("guide.close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-fg-muted transition-colors hover:bg-surface-sunken"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {steps.map((item, i) => (
              <span key={item.title} className={i === index ? "h-1.5 w-5 rounded-full bg-accent" : "h-1.5 w-1.5 rounded-full bg-line-strong"} />
            ))}
          </div>
          {index > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)}>
              {t("guide.back")}
            </Button>
          )}
          <Button size="sm" onClick={() => (last ? close() : setIndex(index + 1))}>
            {last ? t("guide.finish") : t("guide.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
