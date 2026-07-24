import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CalendarCheck } from "lucide-react";
import { getMyPayroll } from "../../api/payroll";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatMoney } from "../../utils/format";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// The teacher's OWN payroll only — no centre finance, no other teacher, no
// student payments, and never a finalize action.
export default function Salary() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyPayroll(month)
      .then(setData)
      .catch((error) => {
        setData(null);
        toast.error(getErrorMessage(error, t("teacher.salary.loadError")));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const columns = [
    { key: "group_name", header: t("teacher.salary.groupColumn"), truncate: true },
    { key: "sessions_count", header: t("teacher.salary.sessionsColumn"), align: "right", nowrap: true },
    {
      key: "subtotal",
      header: t("teacher.salary.subtotalColumn"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoney(row.subtotal),
    },
  ];

  const breakdown = data?.breakdown || [];
  const sessionsTotal = breakdown.reduce((sum, item) => sum + (item.sessions_count || 0), 0);
  const isEmpty = data && Number(data.total_amount) === 0 && breakdown.length === 0;

  return (
    <div className={PAGE_CLASS}>
      <Input
        label={t("teacher.salary.monthLabel")}
        type="month"
        className="w-full max-w-[180px]"
        value={month}
        onChange={(event) => setMonth(event.target.value)}
        disabled={loading}
      />

      {loading || !data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card padding="p-4" className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded-btn" />
              <Skeleton className="h-6 w-20" />
            </Card>
            <Card padding="p-4" className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded-btn" />
              <Skeleton className="h-6 w-12" />
            </Card>
          </div>
          <Table columns={columns} loading />
        </>
      ) : isEmpty ? (
        <EmptyState
          size="md"
          icon={Banknote}
          title={t("teacher.salary.emptyTitle")}
          description={t("teacher.salary.emptyDescription")}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              compact
              variant="green"
              icon={Banknote}
              label={t("teacher.salary.calculatedSalary")}
              value={formatMoney(data.total_amount)}
            />
            <StatCard
              compact
              variant="blue"
              icon={CalendarCheck}
              label={t("teacher.salary.sessionsGiven")}
              value={sessionsTotal}
            />
          </div>
          {breakdown.length > 0 && (
            <Table columns={columns} data={breakdown} rowKey={(row) => row.group_id} />
          )}
        </>
      )}
    </div>
  );
}
