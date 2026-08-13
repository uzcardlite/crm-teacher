import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// Translations are split one file per area so several people (or agents) can
// extend them without overwriting each other's keys. Each file owns a single
// distinct top-level namespace, so a shallow merge is enough here.
import uz from "./locales/uz.json";
import ru from "./locales/ru.json";
import uzPages from "./locales/uz.pages.json";
import ruPages from "./locales/ru.pages.json";
import uzFinance from "./locales/uz.finance.json";
import ruFinance from "./locales/ru.finance.json";
import uzGrowth from "./locales/uz.growth.json";
import ruGrowth from "./locales/ru.growth.json";
import uzTeacher from "./locales/uz.teacher.json";
import ruTeacher from "./locales/ru.teacher.json";

// The staff/att/fil/grp/stu namespaces came along when this repo was copied
// out of crm-frontend, but no /teacher/* page ever referenced them. They were
// shipped in every bundle and drifted from the admin app unnoticed (uz.staff
// labelled the `hourly` salary type "Foiz" and had no `percentage` at all), so
// they are gone. Anything the teacher cabinet needs lives in the files below.
const uzAll = { ...uz, ...uzPages, ...uzFinance, ...uzGrowth, ...uzTeacher };
const ruAll = { ...ru, ...ruPages, ...ruFinance, ...ruGrowth, ...ruTeacher };

export const LANG_KEY = "crm_lang";
export const DEFAULT_LANG = "uz";

export function getStoredLang() {
  const stored = localStorage.getItem(LANG_KEY);
  return stored === "ru" ? "ru" : DEFAULT_LANG;
}

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uzAll },
    ru: { translation: ruAll },
  },
  lng: getStoredLang(),
  fallbackLng: DEFAULT_LANG,
  interpolation: {
    // React already escapes values, no need for i18next to do it again.
    escapeValue: false,
  },
});

export default i18n;
