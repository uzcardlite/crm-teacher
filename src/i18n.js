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
import uzStaff from "./locales/uz.staff.json";
import ruStaff from "./locales/ru.staff.json";
import uzGrowth from "./locales/uz.growth.json";
import ruGrowth from "./locales/ru.growth.json";
import uzGrp from "./locales/uz.grp.json";
import ruGrp from "./locales/ru.grp.json";
import uzStu from "./locales/uz.stu.json";
import ruStu from "./locales/ru.stu.json";
import uzFil from "./locales/uz.fil.json";
import ruFil from "./locales/ru.fil.json";
import uzAtt from "./locales/uz.att.json";
import ruAtt from "./locales/ru.att.json";
import uzTeacher from "./locales/uz.teacher.json";
import ruTeacher from "./locales/ru.teacher.json";

const uzAll = { ...uz, ...uzPages, ...uzFinance, ...uzStaff, ...uzGrowth, ...uzGrp, ...uzStu, ...uzFil, ...uzAtt, ...uzTeacher };
const ruAll = { ...ru, ...ruPages, ...ruFinance, ...ruStaff, ...ruGrowth, ...ruGrp, ...ruStu, ...ruFil, ...ruAtt, ...ruTeacher };

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
