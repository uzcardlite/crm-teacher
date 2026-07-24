import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Users } from "lucide-react";
import { getFinancePayroll } from "../../api/finance";
import Badge from "../ui/Badge";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import FilterBar from "../ui/FilterBar";
import IconButton from "../ui/IconButton";
import Input from "../ui/Input";
import Skeleton from "../ui/Skeleton";
import Table from "../ui/Table";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import PayrollDetailModal from "./PayrollDetailModal";
import {
  SALARY_TYPE_LABELS,
  currentMonthValue,
  formatMoneyI18n,
  monthToApi,
} from "../../constants/moliya";

export default function PayrollTab({ onDataChanged }) {
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentMonthValue);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailTarget, setDetailTarget] = useState(null);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getFinancePayroll({ month: monthToApi(month) }));
    } catch (error) {
      setData(null);
      toast.error(getErrorMessage(error, t("finance.payroll.loadError")));
    } finally {
      setLoading(false);
    }
  }, [month, t]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  async function refresh() {
    await loadPayroll();
    await onDataChanged?.();
  }

  const columns = [
    { key: "teacher_full_name", header: t("finance.payroll.teacherColumn") },
    { key: "filial_name", header: t("finance.common.branch") },
    {
      key: "salary_type",
      header: t("finance.payroll.salaryTypeColumn"),
      render: (row) =>
        SALARY_TYPE_LABELS[row.salary_type] ? t(SALARY_TYPE_LABELS[row.salary_type]) : row.salary_type,
    },
    {
      key: "sessions_count",
      header: t("finance.payroll.sessionsColumn"),
      align: "right",
      nowrap: true,
    },
    {
      key: "total_amount",
      header: t("finance.payroll.totalAmountColumn"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoneyI18n(row.total_amount, t),
    },
    {
      key: "status",
      header: t("finance.payroll.statusColumn"),
      render: (row) =>
        row.status === "finalized" ? (
          <Badge variant="success">{t("finance.payroll.finalizedBadge")}</Badge>
        ) : (
          <Badge variant="warning">{t("finance.payroll.pendingBadge")}</Badge>
        ),
    },
    {
      key: "actions",
      header: t("finance.common.actions"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Eye}
            aria-label={t("finance.payroll.detailAria")}
            onClick={() => setDetailTarget(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <Input
          label={t("finance.common.month")}
          type="month"
          className="w-full max-w-[180px]"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </FilterBar>

      {loading || !data ? (
        <Card className="mb-4">
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-fg-muted">{t("finance.payroll.totalCalculated")}</p>
            <p className="mt-1 text-lg font-semibold text-fg">
              {formatMoneyI18n(data.total_amount, t)}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">{t("finance.payroll.finalizedCount")}</p>
            <p className="mt-1 text-lg font-semibold text-success">
              {t("finance.common.count", { count: data.finalized_count })}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">{t("finance.payroll.pendingCount")}</p>
            <p className="mt-1 text-lg font-semibold text-accent-dark">
              {t("finance.common.count", { count: data.pending_count })}
            </p>
          </div>
        </Card>
      )}

      <Table
        columns={columns}
        data={data?.items || []}
        loading={loading}
        rowKey={(row) => row.teacher_id}
        emptyState={
          <EmptyState
            icon={Users}
            title={t("finance.payroll.emptyTitle")}
            description={t("finance.payroll.emptyDesc")}
          />
        }
      />

      <PayrollDetailModal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        teacherId={detailTarget?.teacher_id}
        teacherName={detailTarget?.teacher_full_name}
        initialMonth={month}
        onFinalized={refresh}
      />
    </>
  );
}
