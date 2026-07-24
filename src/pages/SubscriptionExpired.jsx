import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";

// Full-screen block shown to a tenant admin whose subscription has expired.
// No sidebar / layout — it replaces the whole app shell.
export default function SubscriptionExpired() {
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <EmptyState
        icon={Lock}
        title={t("billing.expiredTitle")}
        description={t("billing.expiredDescription")}
      >
        <Button variant="secondary" onClick={logout} className="mt-2">
          {t("billing.logout")}
        </Button>
      </EmptyState>
    </div>
  );
}
