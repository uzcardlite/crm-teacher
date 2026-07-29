import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Eye,
  EyeOff,
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
// screen they can't open. Each tile carries its own semantic tint so the row
// reads as a colourful, inviting launcher instead of four grey rows.
const QUICK_ACTIONS = [
  {
    to: "/teacher/attendance",
    labelKey: "teacher.nav.attendance",
    icon: CalendarCheck,
    permission: "teacher_cabinet.attendance",
    iconClass: "bg-success-bg text-success",
  },
  {
    to: "/teacher/groups",
    labelKey: "teacher.nav.groups",
    icon: UsersRound,
    permission: "teacher_cabinet.view",
    iconClass: "bg-scheduleBlock-violet-bg text-scheduleBlock-violet-text",
  },
  {
    to: "/teacher/schedule",
    labelKey: "teacher.nav.schedule",
    icon: CalendarDays,
    permission: "teacher_cabinet.view",
    iconClass: "bg-info-bg text-info",
  },
  {
    to: "/teacher/chat",
    labelKey: "teacher.nav.chat",
    icon: MessagesSquare,
    permission: "teacher_cabinet.chat",
    iconClass: "bg-scheduleBlock-teal-bg text-scheduleBlock-teal-text",
  },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = useTenantModules();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Salary stays masked on every visit — it only shows while the eye is open.
  const [salaryVisible, setSalaryVisible] = useState(false);

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
        <Card padding="p-5" className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-44" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-card" />
        </Card>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} padding="p-3" className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded-btn" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-16" />
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
      {/* National hero: a deep amber girih gradient with layered koshin
          stars. The greeting is large and warm; the teacher's calculated
          salary lives INSIDE this card, masked until the eye is pressed. */}
      <div className="relative overflow-hidden rounded-card bg-gradient-orange px-5 pb-5 pt-6 text-white shadow-card dark:bg-gradient-orange-dark">
        <KoshinStar
          size={170}
          strokeWidth={3}
          className="pointer-events-none absolute -right-12 -top-14 text-white/10"
        />
        <KoshinStar
          size={72}
          strokeWidth={4}
          className="pointer-events-none absolute -bottom-8 right-24 text-white/[0.08]"
        />
        <KoshinStar
          size={40}
          strokeWidth={5}
          className="pointer-events-none absolute bottom-10 left-2 text-white/[0.07]"
        />

        <div className="relative flex items-center gap-4">
          <span className="rounded-full bg-white/15 p-1">
            <Avatar photoUrl={user?.photo_url} name={data.full_name} size="lg" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              {formatLongDate()}
            </p>
            <p className="mt-1 truncate text-xl font-bold leading-tight">
              {t("teacher.dashboard.greeting", { name: firstName })}
            </p>
            {data.subject && (
              <p className="mt-0.5 truncate text-sm text-white/75">{data.subject}</p>
            )}
          </div>
        </div>

        {/* Salary pocket: frosted panel inside the hero. Masked by default on
            every load; the eye button is the only way to reveal it. */}
        <div className="relative mt-5 flex items-center gap-3 rounded-card border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-white/15">
            <Banknote size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/70">
              {t("teacher.dashboard.calculatedSalary")}
            </p>
            <p className="mt-0.5 truncate text-lg font-bold tracking-wide">
              {salaryVisible ? formatMoney(summary.calculated_salary) : "•• ••• •••"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSalaryVisible((v) => !v)}
            aria-label={t(
              salaryVisible
                ? "teacher.dashboard.hideSalary"
                : "teacher.dashboard.showSalary",
            )}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {salaryVisible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
      </div>

      {/* Overview: the teacher's own scope. Salary moved into the hero, so
          three compact colour-coded tiles sit in one row. */}
      <section className="space-y-3">
        <h2 className="px-0.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t("teacher.dashboard.overviewTitle")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
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

      {/* Quick actions: colourful launcher tiles with a faint koshin
          watermark, one semantic tint per destination. */}
      {actions.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-0.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {t("teacher.dashboard.quickActionsTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((item) => (
              <Card
                key={item.to}
                padding="p-4"
                hoverable
                className={cn(
                  "relative flex cursor-pointer items-center gap-3 overflow-hidden",
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
                <KoshinStar
                  size={52}
                  className="pointer-events-none absolute -bottom-4 -right-4 text-accent/[0.07]"
                />
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-btn",
                    item.iconClass,
                  )}
                >
                  <item.icon size={20} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
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
