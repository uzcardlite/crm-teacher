import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { getMyGroupFinance, listMyGroups } from "../../api/teacher";
import MonthGrid from "../../components/attendance/MonthGrid";
import Avatar from "../../components/ui/Avatar";
import EmptyState from "../../components/ui/EmptyState";
import FirstVisitGuide from "../../components/ui/FirstVisitGuide";
import { GroupedList, ListRow } from "../../components/ui/List";
import MonthSwitcher, { currentMonthValue } from "../../components/ui/MonthSwitcher";
import PageTitle from "../../components/ui/PageTitle";
import Segmented from "../../components/ui/Segmented";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { useTenantModules } from "../../context/TenantModulesContext";
import { formatDate, groupThousands } from "../../utils/format";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-5 px-4 pb-24 pt-5";

const PAYMENT_TONE = {
  paid: "text-success",
  partial: "text-warning",
  unpaid: "text-danger",
};

function shortDate(iso) {
  return iso ? formatDate(iso).slice(0, 5) : "";
}

// Students with their money for the month: what each paid, what is left,
// the group's totals and the teacher's own estimated share — so the teacher
// can reckon their pay without asking the office.
function StudentsTab({ groupId, month }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setData(null);
    getMyGroupFinance(groupId, month)
      .then(setData)
      .catch((error) => {
        setData({ students: [] });
        toast.error(getErrorMessage(error, t("teacher.groupPayments.loadError")));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, month]);

  if (data === null) return <Skeleton className="h-72 w-full rounded-card" />;
  if (!data.students?.length) return <EmptyState size="md" icon={Wallet} title={t("teacher.groups.emptyRoster")} />;

  const expected = Number(data.expected) || 0;
  const collected = Number(data.collected) || 0;
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const owing = data.students.filter((row) => row.status !== "paid");
  const rows = filter === "owing" ? owing : data.students;
  const currency = t("finance.currency");

  return (
    <div className="space-y-4">
      {/* group totals */}
      <section className="rounded-card bg-surface p-4 shadow-card">
        <p className="text-[13px] font-medium text-fg-muted">{t("teacher.groupFinance.collected")}</p>
        <p className="mt-1 text-[28px] font-bold tracking-tight tabular-nums text-fg">
          {groupThousands(collected)} <span className="text-lg font-semibold text-fg-muted">{currency}</span>
        </p>
        <p className="text-[13px] text-fg-secondary">
          {t("teacher.groupFinance.ofExpected", { amount: `${groupThousands(expected)} ${currency}`, pct })}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 border-t border-line pt-3">
          {[
            ["paid", data.paid_count, PAYMENT_TONE.paid],
            ["partial", data.partial_count, PAYMENT_TONE.partial],
            ["unpaid", data.unpaid_count, PAYMENT_TONE.unpaid],
          ].map(([key, value, tone], index) => (
            <div key={key} className={cn("text-center", index > 0 && "border-l border-line")}>
              <p className={cn("text-lg font-bold tabular-nums", tone)}>{value}</p>
              <p className="text-xs text-fg-muted">{t(`teacher.groupPayments.${key}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* the teacher's own estimate */}
      {data.share_estimate !== null && data.share_estimate !== undefined ? (
        <section className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success text-white">
            <Wallet size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-fg-muted">{t("teacher.groupFinance.share")}</p>
            <p className="text-xl font-bold tabular-nums text-fg">
              ≈ {groupThousands(data.share_estimate)} {currency}
            </p>
            <p className="text-xs text-fg-secondary">
              {data.salary_type === "percentage"
                ? t("teacher.groupFinance.sharePercent", { rate: Number(data.salary_rate) })
                : t("teacher.groupFinance.sharePerStudent", { rate: groupThousands(data.salary_rate), count: data.students.length })}
            </p>
          </div>
        </section>
      ) : (
        <p className="px-1 text-xs text-fg-muted">{t("teacher.groupFinance.shareOther")}</p>
      )}

      <Segmented
        options={[
          { value: "all", label: t("teacher.groupFinance.filterAll", { count: data.students.length }) },
          { value: "owing", label: t("teacher.groupFinance.filterOwing", { count: owing.length }) },
        ]}
        value={filter}
        onChange={setFilter}
        ariaLabel={t("teacher.groupDetail.tabs.students")}
      />

      {rows.length === 0 ? (
        <EmptyState size="sm" title={t("teacher.groupFinance.nobodyOwes")} />
      ) : (
        <GroupedList>
          {rows.map((row) => (
            <ListRow
              key={row.student_id}
              to={`/teacher/students/${row.student_id}?group=${groupId}`}
              leading={<Avatar photoUrl={row.photo_url} name={row.full_name} size="sm" />}
              title={row.full_name}
              subtitle={
                Number(row.paid) > 0
                  ? t("teacher.groupFinance.paidOn", { date: shortDate(row.last_payment_date) })
                  : t("teacher.groupFinance.notPaidYet")
              }
              trailing={
                <span className="flex flex-col items-end leading-tight">
                  <span className={cn("text-[15px] font-semibold tabular-nums", PAYMENT_TONE[row.status])}>
                    {groupThousands(row.paid)}
                  </span>
                  <span className="text-xs tabular-nums text-fg-muted">
                    {row.status === "paid"
                      ? t("teacher.groupFinance.fullyPaid")
                      : t("teacher.groupFinance.debt", { amount: groupThousands(row.debt) })}
                  </span>
                </span>
              }
            />
          ))}
        </GroupedList>
      )}
      <p className="px-1 text-xs text-fg-muted">{t("teacher.groupFinance.hint")}</p>
    </div>
  );
}

// One group: its students, who has paid this month, and the monthly register.
export default function GroupDetail() {
  const { t } = useTranslation();
  const { groupId } = useParams();
  const { hasPermission } = useTenantModules();
  const [searchParams, setSearchParams] = useSearchParams();
  const [group, setGroup] = useState(null);
  const [month, setMonth] = useState(currentMonthValue);
  const canAttendance = hasPermission("teacher_cabinet.attendance");

  const tabs = [
    { value: "students", label: t("teacher.groupDetail.tabs.students") },
    ...(canAttendance ? [{ value: "attendance", label: t("teacher.groupDetail.tabs.attendance") }] : []),
  ];
  const tab = tabs.some((item) => item.value === searchParams.get("tab")) ? searchParams.get("tab") : "students";

  useEffect(() => {
    listMyGroups()
      .then((list) => setGroup(list.find((item) => String(item.id) === String(groupId)) || null))
      .catch(() => {});
  }, [groupId]);

  return (
    <div className={PAGE_CLASS}>
      <PageTitle
        eyebrow={t("teacher.groups.title")}
        title={group?.name || "…"}
        subtitle={group ? t("teacher.groups.studentsCount", { count: group.current_students_count }) : null}
      />
      <Segmented
        options={tabs}
        value={tab}
        onChange={(value) => setSearchParams({ tab: value }, { replace: true })}
        ariaLabel={group?.name}
      />
      <MonthSwitcher value={month} onChange={setMonth} />
      {tab === "students" && <StudentsTab groupId={groupId} month={month} />}
      {tab === "attendance" && <MonthGrid groupId={groupId} month={month} />}

      <FirstVisitGuide
        id="group-detail-v2"
        steps={["tabs", "money", "register"].map((key) => ({
          title: t(`teacher.groupDetail.guide.${key}Title`),
          body: t(`teacher.groupDetail.guide.${key}Body`),
        }))}
      />
    </div>
  );
}
