import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Download, Send, Wallet } from "lucide-react";
import { downloadFinanceExport, listFinanceDebtors } from "../../api/finance";
import { listFilials } from "../../api/filials";
import { listGroups } from "../../api/groups";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import FilterBar from "../ui/FilterBar";
import IconButton from "../ui/IconButton";
import Input from "../ui/Input";
import Pagination from "../ui/Pagination";
import Select from "../ui/Select";
import Table from "../ui/Table";
import { toast } from "../ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { saveBlobResponse } from "../../utils/downloadFile";
import PaymentFormModal from "./PaymentFormModal";
import ReminderModal from "./ReminderModal";
import {
  currentMonthValue,
  formatDate,
  formatMoneyI18n,
  monthToApi,
  monthsBadgeVariant,
} from "../../constants/moliya";

const PAGE_SIZE = 20;

function rowKey(row) {
  return `${row.student_id}-${row.group_id}`;
}

export default function DebtorsTab({ canCreate, modalOpen, onCloseModal, onDataChanged }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filials, setFilials] = useState([]);
  const [groups, setGroups] = useState([]);

  const [month, setMonth] = useState(currentMonthValue);
  const [filialId, setFilialId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [minMonths, setMinMonths] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("finance.common.loadBranchesError")));
        }
      });
    listGroups({ page: 1, size: 100 })
      .then((data) => setGroups(data.items))
      .catch((error) =>
        toast.error(getErrorMessage(error, t("finance.common.loadGroupsError"))),
      );
  }, [t]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [month, filialId, groupId, minMonths]);

  const queryParams = useMemo(
    () => ({
      month: monthToApi(month),
      filial_id: filialId || undefined,
      group_id: groupId || undefined,
      min_months: minMonths || undefined,
    }),
    [month, filialId, groupId, minMonths],
  );

  const loadDebtors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFinanceDebtors({ page, size: PAGE_SIZE, ...queryParams });
      setRows(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.debtors.loadError")));
    } finally {
      setLoading(false);
    }
  }, [page, queryParams, t]);

  useEffect(() => {
    loadDebtors();
  }, [loadDebtors]);

  // Selection is per student (the reminder API takes student ids), so a student
  // who owes in two groups is selected once by either of their rows.
  const pageStudentIds = useMemo(
    () => [...new Set(rows.map((row) => row.student_id))],
    [rows],
  );
  const allSelected =
    pageStudentIds.length > 0 && pageStudentIds.every((id) => selectedIds.includes(id));

  function toggleAll() {
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageStudentIds.includes(id))
        : [...new Set([...prev, ...pageStudentIds])],
    );
  }

  function toggleOne(studentId) {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  }

  const selectedStudents = useMemo(() => {
    const seen = new Map();
    rows.forEach((row) => {
      if (selectedIds.includes(row.student_id) && !seen.has(row.student_id)) {
        seen.set(row.student_id, row);
      }
    });
    return [...seen.values()];
  }, [rows, selectedIds]);

  const hasFilters = Boolean(filialId || groupId || minMonths);

  // The month is the report period itself, so "Tozalash" leaves it alone.
  function clearFilters() {
    setFilialId("");
    setGroupId("");
    setMinMonths("");
  }

  // Memoized so the payment modal's reset effect does not fire on every render.
  const payPrefill = useMemo(
    () =>
      payTarget
        ? {
            studentId: payTarget.student_id,
            studentName: payTarget.student_full_name,
            groupId: payTarget.group_id,
            groupName: payTarget.group_name,
            monthFor: month,
            debtAmount: payTarget.total_debt,
          }
        : null,
    [payTarget, month],
  );

  async function refresh() {
    await loadDebtors();
    await onDataChanged?.();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await downloadFinanceExport("debtors", queryParams);
      saveBlobResponse(response, "qarzdorlar.csv");
      toast.success(t("finance.common.fileDownloaded"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.common.filePrepareError")));
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          aria-label={t("finance.debtors.selectAllAria")}
          className="h-4 w-4 rounded border-line-strong text-accent focus:ring-accent/40"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.student_id)}
          onChange={() => toggleOne(row.student_id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={t("finance.debtors.selectAria")}
          className="h-4 w-4 rounded border-line-strong text-accent focus:ring-accent/40"
        />
      ),
    },
    { key: "student_full_name", header: t("finance.common.student") },
    { key: "group_name", header: t("finance.common.group") },
    { key: "filial_name", header: t("finance.common.branch") },
    {
      key: "price_per_month",
      header: t("finance.debtors.priceColumn"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoneyI18n(row.price_per_month, t),
    },
    {
      key: "total_debt",
      header: t("finance.debtors.debtColumn"),
      align: "right",
      nowrap: true,
      render: (row) => <Badge variant="danger">{formatMoneyI18n(row.total_debt, t)}</Badge>,
    },
    {
      key: "months_unpaid",
      header: t("finance.debtors.monthsColumn"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <Badge variant={monthsBadgeVariant(row.months_unpaid)}>
          {t("finance.debtors.monthsUnit", { count: Number(row.months_unpaid) || 0 })}
        </Badge>
      ),
    },
    {
      key: "last_payment",
      header: t("finance.debtors.lastPaymentColumn"),
      nowrap: true,
      // Null falls through to the table's em dash.
      render: (row) =>
        row.last_payment_date
          ? `${formatDate(row.last_payment_date)} — ${formatMoneyI18n(row.last_payment_amount, t)}`
          : null,
    },
    {
      key: "has_active_promise",
      header: t("finance.debtors.statusColumn"),
      render: (row) =>
        row.has_active_promise ? (
          <Badge variant="warning">{t("finance.debtors.hasPromise")}</Badge>
        ) : null,
    },
    {
      key: "parent_phone",
      header: t("finance.debtors.phoneColumn"),
      nowrap: true,
    },
    ...(canCreate
      ? [
          {
            key: "actions",
            header: t("finance.common.actions"),
            align: "right",
            nowrap: true,
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                <IconButton
                  icon={Wallet}
                  aria-label={t("finance.debtors.payAria")}
                  onClick={() => setPayTarget(row)}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <FilterBar
        onClear={hasFilters ? clearFilters : undefined}
        actions={
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            <Download size={16} />
            {exporting ? t("finance.common.preparing") : t("finance.common.exportCsv")}
          </Button>
        }
      >
        <Input
          label={t("finance.common.month")}
          type="month"
          className="w-full max-w-[180px]"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
        <Select
          label={t("finance.common.branch")}
          className="w-full max-w-[220px]"
          value={filialId}
          onChange={(event) => setFilialId(event.target.value)}
        >
          <option value="">{t("finance.common.allBranches")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("finance.common.group")}
          className="w-full max-w-[220px]"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
        >
          <option value="">{t("finance.common.allGroups")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("finance.debtors.monthsColumn")}
          className="w-full max-w-[160px]"
          value={minMonths}
          onChange={(event) => setMinMonths(event.target.value)}
        >
          <option value="">{t("finance.debtors.allMonths")}</option>
          <option value="1">{t("finance.debtors.monthsUnit", { count: 1 })}</option>
          <option value="2">{t("finance.debtors.monthsUnit", { count: 2 })}</option>
          <option value="3">{t("finance.debtors.threePlusMonths")}</option>
        </Select>
      </FilterBar>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent-light bg-accent-light/20 px-4 py-3">
          <p className="text-sm font-medium text-accent-dark">
            {t("finance.debtors.selectedCount", { count: selectedIds.length })}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              {t("finance.debtors.clearSelection")}
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => setReminderOpen(true)}>
                <Send size={16} />
                {t("finance.debtors.sendReminder")}
              </Button>
            )}
          </div>
        </div>
      )}

      <Table
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={rowKey}
        emptyState={
          <EmptyState
            icon={AlertTriangle}
            title={hasFilters ? t("finance.debtors.emptyFilteredTitle") : t("finance.debtors.emptyTitle")}
            description={
              hasFilters ? t("finance.common.retryOtherFilter") : t("finance.debtors.emptyDesc")
            }
          />
        }
      />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        students={selectedStudents}
        month={month}
        onSent={refresh}
      />

      {canCreate && (
        <PaymentFormModal
          open={Boolean(modalOpen)}
          onClose={onCloseModal}
          onSaved={refresh}
          editing={null}
          prefill={null}
        />
      )}

      {canCreate && (
        <PaymentFormModal
          open={Boolean(payTarget)}
          onClose={() => setPayTarget(null)}
          onSaved={refresh}
          editing={null}
          prefill={payPrefill}
        />
      )}
    </>
  );
}
