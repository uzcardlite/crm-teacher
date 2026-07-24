import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileQuestion } from "lucide-react";
import Button from "../components/ui/Button";

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-btn bg-sidebar text-accent">
        <FileQuestion size={32} />
      </span>
      <div>
        <h1 className="text-xl font-semibold text-fg">{t("pages.notFound.title")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("pages.notFound.description")}</p>
      </div>
      <Button onClick={() => navigate("/")}>{t("pages.notFound.backHome")}</Button>
    </div>
  );
}
