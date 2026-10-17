import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { getMyGroupPayments, listMyGroups, listMyGroupStudents } from "../../api/teacher";
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
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-5 px-4 pb-24 pt-5";

const PAYMENT_TONE = {
  paid: "text-success",
  partial: "text-warning",
  unpaid: "text-danger",
};

function StudentsTab({ groupId }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    listMyGroupStudents(groupId)
      .then(setRows)
      .catch((error) => {
        setRows([]);
        toast.error(getErrorMessage(error, t("teacher.groups.rosterError")));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);
  if (rows === null) return <Skeleton className="h-48 w-full rounded-card" />;
  if (rows.length === 0) return <EmptyState size="md" title={t("teacher.groups.emptyRoster")} />;
  return (
    <GroupedList>
      {rows.map((student) => (
        <ListRow
          key={student.student_id}
          to={`/teacher/students/${student.student_id}?group=${groupId}`}
          leading={<Avatar photoUrl={student.photo_url} name={student.student_full_name} size="sm" />}
          title={student.student_full_name}
        />
      ))}
    </GroupedList>
  );
}

function PaymentsTab({ groupId, month }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    setRows(null);
    getMyGroupPayments(groupId, month)
      .then(setRows)
      .catch((error) => {
        setRows([]);
        toast.error(getErrorMessage(error, t("teacher.groupPayments.loadError")));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, month]);
  if (rows === null) return <Skeleton className="h-48 w-full rounded-card" />;
  if (rows.length === 0) return <EmptyState size="md" icon={Wallet} title={t("teacher.groups.emptyRoster")} />;
  const count = (status) => rows.filter((row) => row.status === status).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 rounded-card bg-surface py-3.5 shadow-card">
        {["paid", "partial", "unpaid"].map((status, index) => (
          <div key={status} className={cn("text-center", index > 0 && "border-l border-line")}>
            <p className={cn("text-[22px] font-bold tabular-nums", PAYMENT_TONE[status])}>{count(status)}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{t(`teacher.groupPayments.${status}`)}</p>
          </div>
        ))}
      </div>
      <GroupedList>
        {rows.map((row) => (
          <ListRow
            key={row.student_id}
            leading={<Avatar photoUrl={row.photo_url} name={row.full_name} size="sm" />}
            title={row.full_name}
            trailing={<span className={cn("font-medium", PAYMENT_TONE[row.status])}>{t(`teacher.groupPayments.${row.status}`)}</span>}
          />
        ))}
      </GroupedList>
      <p className="px-1 text-xs text-fg-muted">{t("teacher.groupPayments.hint")}</p>
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
    { value: "payments", label: t("teacher.groupDetail.tabs.payments") },
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
      {tab !== "students" && <MonthSwitcher value={month} onChange={setMonth} />}
      {tab === "students" && <StudentsTab groupId={groupId} />}
      {tab === "payments" && <PaymentsTab groupId={groupId} month={month} />}
      {tab === "attendance" && <MonthGrid groupId={groupId} month={month} />}

      <FirstVisitGuide
        id="group-detail-v1"
        steps={["tabs", "payments", "register"].map((key) => ({
          title: t(`teacher.groupDetail.guide.${key}Title`),
          body: t(`teacher.groupDetail.guide.${key}Body`),
        }))}
      />
    </div>
  );
}
