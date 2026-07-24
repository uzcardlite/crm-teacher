import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../../components/ui/Card";
import Toggle from "../../components/ui/Toggle";
import { toast } from "../../components/ui/Toast";

const STORAGE_KEY = "crm_notification_settings";

// Keys only — labels/descriptions are resolved with `t()` at render time
// since this module cannot call hooks.
const NOTIFICATION_ITEM_KEYS = [
  "new_payment",
  "student_added",
  "student_debt",
  "attendance_marked",
  "group_announcement",
];

const DEFAULT_SETTINGS = Object.fromEntries(
  NOTIFICATION_ITEM_KEYS.map((key) => [key, true]),
);

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Notifications() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  function handleToggle(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast.success(t("pages.notifications.saved"));
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-lg font-semibold text-fg">{t("pages.notifications.title")}</h1>

      <div className="max-w-xl">
        <Card>
          <div className="divide-y divide-line">
            {NOTIFICATION_ITEM_KEYS.map((key) => (
              <Toggle
                key={key}
                label={t(`pages.notifications.items.${key}.label`)}
                description={t(`pages.notifications.items.${key}.description`)}
                checked={settings[key]}
                onChange={(value) => handleToggle(key, value)}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
