import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { getMySchedule } from "../../api/teacher";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";

// Read-only weekly overview of the teacher's own groups — no room create/edit.
export default function Schedule() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const dayLabels = {
    mon: t("pages.schedule.days.mon"),
    tue: t("pages.schedule.days.tue"),
    wed: t("pages.schedule.days.wed"),
    thu: t("pages.schedule.days.thu"),
    fri: t("pages.schedule.days.fri"),
    sat: t("pages.schedule.days.sat"),
    sun: t("pages.schedule.days.sun"),
  };

  useEffect(() => {
    getMySchedule()
      .then(setItems)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.schedule.loadError"))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className={PAGE_CLASS}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} padding="p-4" className="flex flex-col gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={PAGE_CLASS}>
        <EmptyState
          size="md"
          icon={CalendarDays}
          title={t("teacher.schedule.emptyTitle")}
          description={t("teacher.schedule.emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div className={PAGE_CLASS}>
      {items.map((item) => {
        const days = (item.days || []).map((day) => dayLabels[day] || day);
        const meta = [
          item.time,
          item.room_name,
          t("teacher.schedule.minutes", { count: item.duration_minutes }),
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <Card
            key={item.group_id}
            padding="p-4"
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0 flex flex-col gap-1">
              <p className="truncate text-sm font-semibold text-fg">{item.group_name}</p>
              <p className="text-xs text-fg-muted">{meta || "—"}</p>
              {days.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {days.map((day) => (
                    <Badge key={day} variant="neutral">
                      {day}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
