import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  finalizeTeacherPayroll,
  getTeacherPayroll,
  getTeacherPayrollHistory,
} from "../../api/payroll";
import { CalendarClock, Wallet } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Skeleton from "../ui/Skeleton";
import Table from "../ui/Table";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { currentMonthValue, formatDate, formatMonth, formatMoneyI18n } from "../../constants/moliya";

// Shared by the Employees page (teachers table) and the Moliya payroll tab —
// the single place that renders one teacher's monthly payroll breakdown.
export default function PayrollDetailModal({
  open,
  onClose,
  teacherId,
  teacherName,
  initialMonth,
  canFinalize = true,
  onFinalized,
}) {
  const { t } = useTranslation();
  const historyColumns = [
    { key: "month", header: t("finance.payrollDetail.monthColumn"), nowrap: true, render: (row) => formatMonth(row.month) },
    {
      key: "total_amount",
      header: t("finance.payrollDetail.amountColumn"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoneyI18n(row.total_amount, t),
    },
    {
      key: "paid_at",
      header: t("finance.payrollDetail.finalizedColumn"),
      nowrap: true,
      render: (row) => formatDate(row.paid_at),
    },
  ];
  const [month, setMonth] = useState(initialMonth || currentMonthValue());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPayroll = useCallback(
    async (monthValue) => {
      if (!teacherId) return;
      setLoading(true);
      try {
        const monthParam = `${monthValue}-01`;
        const [live, records] = await Promise.all([
          getTeacherPayroll(teacherId, monthParam),
          getTeacherPayrollHistory(teacherId),
        ]);
        const finalizedRecord = records.find((record) => record.month === monthParam) || null;
        setData({ ...live, finalizedRecord });
      } catch (error) {
        toast.error(getErrorMessage(error, t("finance.payrollDetail.loadError")));
        setData(null);
        onClose();
      } finally {
        setLoading(false);
      }
    },
    [teacherId, onClose, t],
  );

  useEffect(() => {
    if (!open) {
      setData(null);
      setHistoryOpen(false);
      setHistory([]);
      return;
    }
    const startMonth = initialMonth || currentMonthValue();
    setMonth(startMonth);
    loadPayroll(startMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId]);

  function handleMonthChange(value) {
    setMonth(value);
    if (value) loadPayroll(value);
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      await finalizeTeacherPayroll(teacherId, `${month}-01`);
      toast.success(t("finance.payrollDetail.finalized"));
      setFinalizeConfirmOpen(false);
      await loadPayroll(month);
      await onFinalized?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.payrollDetail.finalizeError")));
    } finally {
      setFinalizing(false);
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      setHistory(await getTeacherPayrollHistory(teacherId));
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.payrollDetail.historyError")));
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t("finance.payrollDetail.title", { name: teacherName || "" })}
        footer={
          <>
            <Button variant="secondary" onClick={openHistory}>
              {t("finance.payrollDetail.history")}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {t("common.close")}
            </Button>
            {canFinalize && !data?.finalizedRecord && (
              <Button onClick={() => setFinalizeConfirmOpen(true)} disabled={loading || !data}>
                {t("finance.payrollDetail.finalize")}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t("finance.common.month")}
            type="month"
            className="max-w-[180px]"
            value={month}
            onChange={(event) => handleMonthChange(event.target.value)}
            disabled={loading}
          />

          {loading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {!loading && data && (
            <>
              {data.finalizedRecord && (
                <div className="flex items-center gap-2">
                  <Badge variant="success">{t("finance.payrollDetail.finalizedBadge")}</Badge>
                  <span className="text-xs text-fg-muted">
                    {formatDate(data.finalizedRecord.paid_at)}
                  </span>
                </div>
              )}

              <p className="text-2xl font-bold text-fg">{formatMoneyI18n(data.total_amount, t)}</p>

              {data.salary_type === "hourly" && (
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  {data.breakdown.length === 0 ? (
                    <EmptyState
                      size="sm"
                      icon={CalendarClock}
                      title={t("finance.payrollDetail.noSessionsTitle")}
                      description={t("finance.payrollDetail.noSessionsDesc")}
                    />
                  ) : (
                    data.breakdown.map((item) => (
                      <div key={item.group_id} className="flex justify-between text-sm">
                        <span className="text-fg-secondary">
                          {item.group_name} (
                          {t("finance.payrollDetail.lessonsUnit", { count: item.sessions_count })})
                        </span>
                        <span className="font-medium text-fg">
                          {formatMoneyI18n(item.subtotal, t)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={finalizeConfirmOpen}
        onClose={() => !finalizing && setFinalizeConfirmOpen(false)}
        title={t("finance.payrollDetail.finalizeConfirmTitle")}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFinalizeConfirmOpen(false)}
              disabled={finalizing}
            >
              {t("finance.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? t("finance.payrollDetail.finalizing") : t("finance.payrollDetail.finalize")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">{t("finance.payrollDetail.finalizeConfirmDesc")}</p>
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t("finance.payrollDetail.historyTitle")}
        size="lg"
      >
        <Table
          columns={historyColumns}
          data={history}
          loading={historyLoading}
          rowKey={(record) => record.id}
          emptyState={
            <EmptyState
              size="sm"
              icon={Wallet}
              title={t("finance.payrollDetail.emptyHistoryTitle")}
              description={t("finance.payrollDetail.emptyHistoryDesc")}
            />
          }
        />
      </Modal>
    </>
  );
}
