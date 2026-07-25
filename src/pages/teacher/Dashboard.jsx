import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CalendarCheck, Users, UsersRound } from "lucide-react";
import { getTeacherMe } from "../../api/teacher";
import Card from "../../components/ui/Card";
import KoshinStar from "../../components/ui/KoshinStar";
import Skeleton from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatMoney } from "../../utils/format";

// Cabinet home: the teacher's own scope only — no centre-wide finance stats.
const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherMe()
      .then(setData)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.dashboard.loadError"))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !data) {
    return (
      <div className={PAGE_CLASS}>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} padding="p-4" className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded-btn" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const summary = data.summary || {};

  return (
    <div className={PAGE_CLASS}>
      {/* Soft national greeting banner: a light amber wash with a faint koshin
          star watermark tucked into the corner (overflow-hidden clips it). */}
      <div className="relative overflow-hidden rounded-card border border-line bg-accent-light/10 px-4 py-3.5">
        <KoshinStar
          size={76}
          className="pointer-events-none absolute -right-5 -top-5 text-accent/[0.06]"
        />
        <p className="relative text-sm text-fg-muted">
          {t("teacher.dashboard.greeting", { name: data.full_name?.split(" ")[0] || "" })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          compact
          variant="green"
          icon={Banknote}
          label={t("teacher.dashboard.calculatedSalary")}
          value={formatMoney(summary.calculated_salary)}
        />
        <StatCard
          compact
          variant="purple"
          icon={UsersRound}
          label={t("teacher.dashboard.groupsCount")}
          value={summary.groups_count}
        />
        <StatCard
          compact
          variant="blue"
          icon={Users}
          label={t("teacher.dashboard.studentsCount")}
          value={summary.students_count}
        />
        <StatCard
          compact
          variant="teal"
          icon={CalendarCheck}
          label={t("teacher.dashboard.lessonsThisMonth")}
          value={summary.lessons_this_month}
        />
      </div>
    </div>
  );
}
