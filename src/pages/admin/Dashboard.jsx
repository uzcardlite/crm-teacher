import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  Megaphone,
  Receipt,
  TrendingUp,
  UserPlus,
  UsersRound,
  Users,
  Wallet,
} from "lucide-react";
import { getDashboard } from "../../api/dashboard";
import { listFilials } from "../../api/filials";
import { listAcademicYears } from "../../api/academicYears";
import { listGroups } from "../../api/groups";
import { listPayments } from "../../api/payments";
import { listStudents } from "../../api/students";
import { useAuth } from "../../context/AuthContext";
import { useTenantModules } from "../../context/TenantModulesContext";
import DailyAttendance from "../../components/attendance/DailyAttendance";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import KoshinStar from "../../components/ui/KoshinStar";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import StatGrid from "../../components/ui/StatGrid";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { getMonthNames, formatDate, formatMoney } from "../../utils/format";
import Schedule from "./Schedule";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Shared row shape for the two "latest N" lists at the bottom of the page.
const LIST_ROW_CLASS =
  "flex flex-wrap items-center justify-between gap-2 rounded-btn border border-line px-3 py-2.5";

function formatGreetingDate() {
  const now = new Date();
  return `${now.getDate()}-${getMonthNames()[now.getMonth()]}, ${now.getFullYear()}`;
}

// Two-up stat rows (kassa) are the one shape StatGrid does not cover, so the
// skeleton for them is drawn here with the same card rhythm.
function StatSkeletonCard() {
  return (
    <Card className="flex flex-col gap-3">
      <Skeleton className="h-10 w-10 rounded-btn" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </Card>
  );
}

function HubCard({ icon: Icon, label, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-card-hover"
    >
      <KoshinStar
        size={56}
        className="pointer-events-none absolute -right-2 -top-2 text-accent/[0.07]"
      />
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn bg-accent-light/30 text-accent-dark dark:text-accent">
          <Icon size={20} />
        </span>
        <span>
          <span className="block text-sm font-semibold text-fg">{label}</span>
          <span className="block text-xs text-fg-muted">{description}</span>
        </span>
      </span>
      <ChevronRight size={18} className="flex-shrink-0 text-fg-faint" />
    </button>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasModule } = useTenantModules();
  const navigate = useNavigate();
  const roleName = user?.role_name;
  const isQabul = roleName === "qabul";
  const isKassa = roleName === "kassa";

  const [filials, setFilials] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [filialFilter, setFilialFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [todayGroups, setTodayGroups] = useState([]);
  const [newStudentsCount, setNewStudentsCount] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);

  // Academic years are not module-gated — load once.
  useEffect(() => {
    listAcademicYears()
      .then(setAcademicYears)
      .catch((error) => toast.error(getErrorMessage(error, t("pages.dashboard.academicYearsError"))));
  }, []);

  // Filials list is gated by the "filials" module — skip the request when it's off
  // (hasModule is false until modules load, so this re-runs once they arrive).
  useEffect(() => {
    if (!hasModule("filials")) return;
    listFilials()
      .then(setFilials)
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.dashboard.filialsError")));
        }
      });
  }, [hasModule]);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialFilter, academicYearFilter]);

  useEffect(() => {
    if (isQabul) {
      if (hasModule("groups")) {
        const todayKey = WEEKDAY_KEYS[new Date().getDay()];
        listGroups({ size: 100 })
          .then((result) => {
            const matching = result.items.filter((group) =>
              Array.isArray(group.schedule?.days) && group.schedule.days.includes(todayKey),
            );
            setTodayGroups(matching);
          })
          .catch((error) => {
            if (!isModuleDisabledError(error)) {
              toast.error(getErrorMessage(error, t("pages.dashboard.groupsError")));
            }
          });
      }

      if (hasModule("students")) {
        const monthStart = new Date();
        monthStart.setDate(1);
        listStudents({ page: 1, size: 1, enrolled_from: monthStart.toISOString().slice(0, 10) })
          .then((result) => setNewStudentsCount(result.total))
          .catch((error) => {
            if (!isModuleDisabledError(error)) {
              toast.error(getErrorMessage(error, t("pages.dashboard.studentsCountError")));
            }
          });
      }
    }

    if (isKassa && hasModule("payments")) {
      listPayments({ page: 1, size: 5 })
        .then((result) => setRecentPayments(result.items))
        .catch((error) => {
          if (!isModuleDisabledError(error)) {
            toast.error(getErrorMessage(error, t("pages.dashboard.recentPaymentsError")));
          }
        });
    }
  }, [isQabul, isKassa, hasModule]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const result = await getDashboard({
        filial_id: filialFilter || undefined,
        academic_year_id: academicYearFilter || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.dashboard.dashboardError")));
    } finally {
      setLoading(false);
    }
  }

  // Module state is the source of truth for "locked" cards — the backend also
  // returns null for these fields, but null can mean "no data yet" too (e.g.
  // attendance rate), so relying on hasModule avoids mislabeling enabled modules.
  const paymentsOff = !hasModule("payments");
  const expensesOff = !hasModule("expenses");
  const attendanceOff = !hasModule("attendance");
  const debtorsOff = !hasModule("payments");
  const isDefaultRole = !isQabul && !isKassa;
  const hasFilters = Boolean(filialFilter || academicYearFilter);

  const attendanceValue =
    data && data.attendance_rate_current_month !== null
      ? `${Math.round(data.attendance_rate_current_month * 100)}%`
      : undefined;
  const attendanceHint = attendanceValue ? undefined : t("pages.dashboard.noData");

  return (
    <div className="p-6">
      <PageHeader
        title={t("pages.dashboard.title")}
        subtitle={t("pages.dashboard.greeting", {
          name: user?.full_name?.split(" ")[0] || "",
          date: formatGreetingDate(),
        })}
      >
        {isQabul && (
          <>
            <Button variant="secondary" onClick={() => navigate("/app/attendance")}>
              <ClipboardCheck size={16} />
              {t("pages.dashboard.markAttendance")}
            </Button>
            <Button onClick={() => navigate("/app/students")}>
              <UserPlus size={16} />
              {t("pages.dashboard.addStudent")}
            </Button>
          </>
        )}
        {isKassa && (
          <Button onClick={() => navigate("/app/moliya?tab=payments")}>
            <Wallet size={16} />
            {t("pages.dashboard.addPayment")}
          </Button>
        )}
      </PageHeader>

      <FilterBar
        onClear={
          hasFilters
            ? () => {
                setFilialFilter("");
                setAcademicYearFilter("");
              }
            : undefined
        }
      >
        <Select
          label={t("nav.filials")}
          className="w-full max-w-[200px]"
          value={filialFilter}
          onChange={(event) => setFilialFilter(event.target.value)}
        >
          <option value="">{t("pages.dashboard.allFilials")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("pages.dashboard.academicYear")}
          className="w-full max-w-[200px]"
          value={academicYearFilter}
          onChange={(event) => setAcademicYearFilter(event.target.value)}
        >
          <option value="">{t("pages.dashboard.allAcademicYears")}</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </Select>
      </FilterBar>

      {isDefaultRole && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HubCard
            icon={Users}
            label={t("nav.hr")}
            description={t("pages.dashboard.hrDescription")}
            onClick={() => navigate("/app/hr")}
          />
          <HubCard
            icon={Megaphone}
            label={t("nav.marketing")}
            description={t("pages.dashboard.marketingDescription")}
            onClick={() => navigate("/app/marketing")}
          />
          <HubCard
            icon={Banknote}
            label={t("nav.moliya")}
            description={t("pages.dashboard.moliyaDescription")}
            onClick={() => navigate("/app/moliya")}
          />
        </div>
      )}

      {loading || !data ? (
        <>
          {/* The skeleton draws exactly the shape this role will get, so the
              grid does not re-flow once the data lands. */}
          {isKassa ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatSkeletonCard />
                <StatSkeletonCard />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatSkeletonCard />
                <StatSkeletonCard />
              </div>
            </>
          ) : (
            <StatGrid loading compact={isDefaultRole} count={isQabul ? 4 : 6} />
          )}
          <Card className="mt-6">
            <Skeleton className="h-64 w-full" />
          </Card>
        </>
      ) : (
        <>
          {isQabul && (
            <StatGrid>
              <StatCard variant="blue" icon={Users} label={t("pages.dashboard.stats.activeStudents")} value={data.students_count} />
              <StatCard variant="purple" icon={UsersRound} label={t("pages.dashboard.stats.activeGroups")} value={data.groups_count} />
              <StatCard
                variant="blue"
                icon={UserPlus}
                label={t("pages.dashboard.stats.newStudentsThisMonth")}
                value={newStudentsCount === null ? undefined : newStudentsCount}
                hint={newStudentsCount === null ? t("pages.dashboard.noData") : undefined}
              />
              {attendanceOff ? (
                <StatCard locked label={t("pages.dashboard.stats.attendanceRate")} hint={t("pages.dashboard.moduleOffHint", { module: t("nav.attendance") })} />
              ) : (
                <StatCard
                  variant="teal"
                  icon={CalendarCheck}
                  label={t("pages.dashboard.stats.attendanceRateThisMonth")}
                  value={attendanceValue}
                  hint={attendanceHint}
                />
              )}
            </StatGrid>
          )}

          {isKassa && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {debtorsOff ? (
                  <StatCard locked label={t("pages.dashboard.stats.debtors")} hint={t("pages.dashboard.moduleOffHint", { module: t("pages.moliya.tabs.payments") })} />
                ) : (
                  <StatCard
                    variant="rose"
                    icon={TrendingUp}
                    label={t("pages.dashboard.stats.debtors")}
                    value={t("pages.dashboard.debtorsCount", { count: data.debtors_count })}
                    hint={formatMoney(data.debtors_total_amount)}
                  />
                )}
                {paymentsOff ? (
                  <StatCard locked label={t("pages.dashboard.stats.currentMonthIncome")} hint={t("pages.dashboard.moduleOffHint", { module: t("pages.moliya.tabs.payments") })} />
                ) : (
                  <StatCard
                    variant="green"
                    icon={Wallet}
                    label={t("pages.dashboard.stats.currentMonthIncome")}
                    value={formatMoney(data.current_month_income)}
                  />
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard variant="blue" icon={Users} label={t("pages.dashboard.stats.activeStudents")} value={data.students_count} />
                <StatCard variant="purple" icon={UsersRound} label={t("pages.dashboard.stats.activeGroups")} value={data.groups_count} />
              </div>
            </>
          )}

          {isDefaultRole && (
            <>
              <StatGrid compact>
                <StatCard variant="blue" compact icon={Users} label={t("pages.dashboard.stats.activeStudents")} value={data.students_count} />
                <StatCard variant="purple" compact icon={UsersRound} label={t("pages.dashboard.stats.activeGroups")} value={data.groups_count} />
                {debtorsOff ? (
                  <StatCard
                    compact
                    locked
                    label={t("pages.dashboard.stats.debtors")}
                    hint={t("pages.dashboard.moduleOffHint", { module: t("pages.moliya.tabs.payments") })}
                  />
                ) : (
                  <StatCard
                    variant="rose"
                    compact
                    icon={TrendingUp}
                    label={t("pages.dashboard.stats.debtors")}
                    value={t("pages.dashboard.debtorsCount", { count: data.debtors_count })}
                    hint={formatMoney(data.debtors_total_amount)}
                  />
                )}
                {paymentsOff ? (
                  <StatCard
                    compact
                    locked
                    label={t("pages.dashboard.stats.currentMonthIncome")}
                    hint={t("pages.dashboard.moduleOffHint", { module: t("pages.moliya.tabs.payments") })}
                  />
                ) : (
                  <StatCard
                    variant="green"
                    compact
                    icon={Wallet}
                    label={t("pages.dashboard.stats.currentMonthIncome")}
                    value={formatMoney(data.current_month_income)}
                  />
                )}
                {expensesOff ? (
                  <StatCard
                    compact
                    locked
                    label={t("pages.dashboard.stats.currentMonthExpense")}
                    hint={t("pages.dashboard.moduleOffHint", { module: t("pages.moliya.tabs.expenses") })}
                  />
                ) : (
                  <StatCard
                    variant="orange"
                    compact
                    icon={Receipt}
                    label={t("pages.dashboard.stats.currentMonthExpense")}
                    value={formatMoney(data.current_month_expense)}
                  />
                )}
                {attendanceOff ? (
                  <StatCard
                    compact
                    locked
                    label={t("pages.dashboard.stats.attendanceRate")}
                    hint={t("pages.dashboard.moduleOffHint", { module: t("nav.attendance") })}
                  />
                ) : (
                  <StatCard
                    variant="teal"
                    compact
                    icon={CalendarCheck}
                    label={t("pages.dashboard.stats.attendanceRateThisMonth")}
                    value={attendanceValue}
                    hint={attendanceHint}
                  />
                )}
              </StatGrid>

              {/* Analytics charts temporarily removed on request — will be
                  restored later. The DashboardAnalytics component and its
                  backend endpoint stay in place, just not rendered. */}

              {hasModule("attendance") && hasModule("groups") && (
                <Card className="mt-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg">
                    <ClipboardCheck size={16} className="text-fg-faint" />
                    {t("pages.dashboard.quickAttendance")}
                  </h2>
                  <DailyAttendance />
                </Card>
              )}

              {hasModule("groups") && (
                <div className="mt-6">
                  <Schedule embedded />
                </div>
              )}
            </>
          )}

          {isQabul && (
            <Card className="mt-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg">
                <CalendarClock size={16} className="text-fg-faint" />
                {t("pages.dashboard.todayClasses")}
              </h2>
              {todayGroups.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={CalendarClock}
                  title={t("pages.dashboard.noTodayClassesTitle")}
                  description={t("pages.dashboard.noTodayClassesDescription")}
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {todayGroups.map((group) => (
                    <li key={group.id} className={LIST_ROW_CLASS}>
                      <span className="text-sm font-medium text-fg-secondary">{group.name}</span>
                      <span className="flex items-center gap-3 text-xs text-fg-muted">
                        {group.teacher_name || t("pages.schedule.noTeacherAssigned")}
                        <span className="text-sm font-semibold tabular-nums text-fg">
                          {group.schedule?.time || "—"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {isKassa && (
            <Card className="mt-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg">
                <Wallet size={16} className="text-fg-faint" />
                {t("pages.dashboard.recentPayments")}
              </h2>
              {recentPayments.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={Wallet}
                  title={t("pages.dashboard.noPaymentsTitle")}
                  description={t("pages.dashboard.noPaymentsDescription")}
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {recentPayments.map((payment) => (
                    <li key={payment.id} className={LIST_ROW_CLASS}>
                      <span className="text-sm font-medium text-fg-secondary">
                        {payment.student_full_name}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-fg-muted">
                        {formatDate(payment.payment_date)}
                        <span className="text-sm font-semibold tabular-nums text-fg">
                          {formatMoney(payment.amount)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
