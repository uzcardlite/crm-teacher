import { useTranslation } from "react-i18next";
import { Clock, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { shouldShowSubscriptionBanner } from "../../constants/status";
import Banner from "../ui/Banner";

// Top-of-app strip for a tenant admin. Only demo tenants and active tenants in
// their final week see it. Null / old / expired => nothing here (expired is
// handled by the block screen). Reads straight from user.subscription.
export default function SubscriptionBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sub = user?.subscription;

  if (!sub || !shouldShowSubscriptionBanner(sub.status, sub.days_remaining)) {
    return null;
  }

  if (sub.status === "demo") {
    return (
      <Banner variant="info" icon={Info}>
        {t("billing.demoBanner", { days: sub.days_remaining })}
      </Banner>
    );
  }

  return (
    <Banner variant="warning" icon={Clock}>
      {t("billing.expiringBanner", { days: sub.days_remaining })}
    </Banner>
  );
}
