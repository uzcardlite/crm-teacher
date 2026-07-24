import { useTranslation } from "react-i18next";

export default function PagePlaceholder({ title }) {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-fg">{title}</h1>
      <p className="mt-1 text-sm text-fg-muted">{t("growth.placeholder.notReady")}</p>
    </div>
  );
}
