import { useTranslation } from "react-i18next";
import { Award, Bell, Cake, FileWarning, Users } from "lucide-react";
import Badge from "../ui/Badge";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import Skeleton from "../ui/Skeleton";
import { cn } from "../../utils/cn";
import { formatDate } from "../../constants/hr";

const REMINDER_STYLE = {
  birthday: {
    box: "bg-scheduleBlock-pink-bg text-scheduleBlock-pink-text",
    icon: Cake,
  },
  work_anniversary: {
    box: "bg-scheduleBlock-amber-bg text-scheduleBlock-amber-text",
    icon: Award,
  },
  contract_expiring: {
    box: "bg-danger-bg text-danger",
    icon: FileWarning,
  },
};

const FALLBACK_STYLE = { box: "bg-surface-sunken text-fg-muted", icon: Bell };

export default function RemindersTab({ items, loading, stats, statsLoading }) {
  const { t } = useTranslation();
  const byPosition = stats?.by_position || [];
  const max = Math.max(...byPosition.map((p) => p.count), 1);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {loading ? (
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-fg">{t("staff.reminders.upcomingTitle")}</h2>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 py-3">
                <Skeleton className="h-9 w-9 rounded-btn" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </Card>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={t("staff.reminders.emptyTitle")}
            description={t("staff.reminders.emptyDescription")}
          />
        ) : (
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-fg">{t("staff.reminders.upcomingTitle")}</h2>
            {items.map((item) => {
              const style = REMINDER_STYLE[item.type] || FALLBACK_STYLE;
              const Icon = style.icon;
              return (
                <div
                  key={`${item.employee_id}-${item.type}-${item.date}`}
                  className="flex items-center gap-3 border-b border-line py-3 last:border-0"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-btn",
                      style.box,
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {item.employee_full_name}
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      {item.type === "work_anniversary" && typeof item.years === "number"
                        ? `${item.position} · ${t("staff.tenure.years", { count: item.years })}`
                        : item.position}
                    </p>
                  </div>
                  {item.days_left < 0 ? (
                    <Badge variant="danger">{t("staff.reminders.expired")}</Badge>
                  ) : item.days_left <= 7 ? (
                    <Badge variant="danger">
                      {item.days_left === 0
                        ? t("staff.reminders.today")
                        : t("staff.reminders.daysLeft", { count: item.days_left })}
                    </Badge>
                  ) : (
                    <span className="flex-shrink-0 text-xs text-fg-muted">
                      {formatDate(item.date)}
                    </span>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-fg">{t("staff.reminders.byPositionTitle")}</h2>
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="mb-3 last:mb-0">
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : byPosition.length === 0 ? (
          <EmptyState
            size="sm"
            icon={Users}
            title={t("staff.reminders.byPositionEmptyTitle")}
            description={t("staff.reminders.byPositionEmptyDescription")}
          />
        ) : (
          byPosition.map((p) => (
            <div key={p.position} className="mb-3 last:mb-0">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="truncate text-fg-secondary">{p.position}</span>
                <span className="flex-shrink-0 font-medium text-fg">{p.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(p.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
