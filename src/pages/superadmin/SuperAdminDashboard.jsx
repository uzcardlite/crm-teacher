import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";

export default function SuperAdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <PageHeader title={t("pages.superAdminDashboard.title")} />

      <Card className="max-w-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent-light/40 text-accent-dark dark:text-accent">
            <Building2 size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-fg">{t("pages.superAdminDashboard.tenants")}</h2>
            <p className="text-sm text-fg-muted">{t("pages.superAdminDashboard.manageTenants")}</p>
          </div>
        </div>
        <Button className="mt-4" onClick={() => navigate("/superadmin/tenants")}>
          {t("pages.superAdminDashboard.viewTenants")}
        </Button>
      </Card>
    </div>
  );
}
