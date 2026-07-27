import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  MessagesSquare,
  Users,
  UsersRound,
} from "lucide-react";
import { getTeacherMe } from "../../api/teacher";
import { useAuth } from "../../context/AuthContext";
import { useTenantModules } from "../../context/TenantModulesContext";
import Avatar from "../../components/ui/Avatar";
import Card from "../../components/ui/Card";
import KoshinStar from "../../components/ui/KoshinStar";
import Skeleton from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatLongDate, formatMoney } from "../../utils/format";
import { cn } from "../../utils/cn";

// Cabinet home: the teacher's own scope only — no centre-wide finance stats.
const PAGE_CLASS = "mx-auto max-w-lg space-y-5 px-4 pb-24 pt-4";

// Quick actions map to existing routes; each is gated by the same
// teacher_cabinet.* permission as its nav tab, so nothing shows a teacher a
// screen they can't open.
const QUICK_ACTIONS = [
  { to: "/teacher/attendance", labelKey: "teacher.nav.attendance", icon: CalendarCheck, permission: "teacher_cabinet.attendance" },
  { to: "/teacher/groups", labelKey: "teacher.nav.groups", icon: UsersRound, permission: "teacher_cabinet.view" },
  { to: "/teacher/schedule", labelKey: "teacher.nav.schedule", icon: CalendarDays, permission: "teacher_cabinet.view" },
  { to: "/teacher/chat", labelKey: "teacher.nav.chat", icon: MessagesSquare, permission: "teacher_cabinet.chat" },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = useTenantModules();
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
        <Card padding="p-4" className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} padding="p-3" className="flex flex-col gap-2">
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
  const firstName = data.full_name?.split(" ")[0] || "";
  const actions = QUICK_ACTIONS.filter((item) => hasPermission(item.permission));

  return (
    <div className={PAGE_CLASS}>
      {/* Refined national greeting: a quiet amber wash with a layered koshin
          star watermark, the teacher's avatar, today's date and a warm
          greeting. overflow-hidden clips the decorative stars. */}
      <div className="relative overflow-hidden rounded-card border border-line bg-accent-light/[0.12] px-4 py-4">
        <KoshinStar
          size={120}
          strokeWidth={4}
          className="pointer-events-none absolute -right-8 -top-9 text-accent/[0.07]"
        />
        <KoshinStar
          size={56}
          strokeWidth={5}
          className="pointer-events-none absolute -bottom-6 right-16 text-accent/[0.05]"
        />
        <div className="relative flex items-center gap-3">
          <Avatar photoUrl={user?.photo_url} name={data.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-accent-dark dark:text-accent">
              {formatLongDate()}
            </p>
            <p className="mt-0.5 truncate text-lg font-semibold text-fg">
              {t("teacher.dashboard.greeting", { name: firstName })}
            </p>
            {data.subject && (
              <p className="truncate text-sm text-fg-muted">{data.subject}</p>
            )}
          </div>
        </div>
      </div>

      {/* Overview: the teacher's own scope, colour-coded by semantics. */}
      <section className="space-y-3">
        <h2 className="px-0.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t("teacher.dashboard.overviewTitle")}
        </h2>
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
      </section>

      {/* Quick actions: shortcuts to the most-used screens. */}
      {actions.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-0.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {t("teacher.dashboard.quickActionsTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((item) => (
              <Card
                key={item.to}
                padding="p-3"
                hoverable
                className={cn(
                  "flex cursor-pointer items-center gap-3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                )}
                role="button"
                tabIndex={0}
                onClick={() => navigate(item.to)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(item.to);
                  }
                }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-accent-light/30 text-accent-dark dark:text-accent">
                  <item.icon size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                  {t(item.labelKey)}
                </span>
                <ChevronRight size={16} className="shrink-0 text-fg-faint" />
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
