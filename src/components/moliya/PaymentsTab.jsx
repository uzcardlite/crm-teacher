import { useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Download, Pencil, Trash2, Wallet } from "lucide-react";
import { deletePayment, listPayments } from "../../api/payments";
import { listGroups } from "../../api/groups";
import { listStudents } from "../../api/students";
import { downloadFinanceExport } from "../../api/finance";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import FilterBar from "../ui/FilterBar";
import Input from "../ui/Input";
import DateInput from "../ui/DateInput";
import Modal from "../ui/Modal";
import Pagination from "../ui/Pagination";
import Select from "../ui/Select";
import Table from "../ui/Table";
import { toast } from "../ui/Toast";
import IconButton from "../ui/IconButton";
import { getErrorMessage } from "../../utils/apiError";
import { saveBlobResponse } from "../../utils/downloadFile";
import PaymentFormModal from "./PaymentFormModal";
import {
  METHOD_BADGE,
  METHOD_LABELS,
  formatDate,
  formatMoneyI18n,
  formatMonth,
} from "../../constants/moliya";

const PAGE_SIZE = 20;

export default function PaymentsTab({
  canCreate,
  canUpdate,
  canDelete,
  modalOpen,
  onCloseModal,
  onDataChanged,
}) {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState([]);
  const groupMap = useMemo(
    () => Object.fromEntries(groups.map((group) => [group.id, group.name])),
    [groups],
  );
  const [students, setStudents] = useState([]);

  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [method, setMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listGroups({ page: 1, size: 100 })
      .then((data) => setGroups(data.items))
      .catch((error) =>
        toast.error(getErrorMessage(error, t("finance.common.loadGroupsError"))),
      );
    listStudents({ page: 1, size: 100 })
      .then((data) => setStudents(data.items))
      .catch((error) =>
        toast.error(getErrorMessage(error, t("finance.common.loadStudentsError"))),
      );
  }, [t]);

  useEffect(() => {
    setPage(1);
  }, [studentId, method, dateFrom, dateTo]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPayments({
        page,
        size: PAGE_SIZE,
        student_id: studentId || undefined,
        method: method || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setPayments(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.payments.loadError")));
    } finally {
      setLoading(false);
    }
  }, [page, studentId, method, dateFrom, dateTo, t]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const query = studentSearch.trim().toLowerCase();
    return students.filter((student) => student.full_name.toLowerCase().includes(query));
  }, [students, studentSearch]);

  const hasFilters = Boolean(studentId || method || dateFrom || dateTo);

  function clearFilters() {
    setStudentSearch("");
    setStudentId("");
    setMethod("");
    setDateFrom("");
    setDateTo("");
  }

  async function refresh() {
    await loadPayments();
    await onDataChanged?.();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await downloadFinanceExport("payments", {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        method: method || undefined,
      });
      saveBlobResponse(response, "tolovlar.csv");
      toast.success(t("finance.common.fileDownloaded"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.common.filePrepareError")));
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePayment(deleteTarget.id);
      toast.success(t("finance.payments.deleted"));
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.common.deleteError")));
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    { key: "student_full_name", header: t("finance.common.student") },
    {
      key: "group",
      header: t("finance.common.group"),
      // Undefined falls through to the table's em dash.
      render: (row) => groupMap[row.group_id],
    },
    {
      key: "amount",
      header: t("finance.common.amount"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoneyI18n(row.amount, t),
    },
    {
      key: "method",
      header: t("finance.payments.methodColumn"),
      render: (row) => (
        <Badge variant={METHOD_BADGE[row.method] || "neutral"}>
          {METHOD_LABELS[row.method] ? t(METHOD_LABELS[row.method]) : row.method}
        </Badge>
      ),
    },
    {
      key: "month_for",
      header: t("finance.payments.monthForColumn"),
      nowrap: true,
      render: (row) => formatMonth(row.month_for),
    },
    {
      key: "payment_date",
      header: t("finance.payments.paymentDateColumn"),
      nowrap: true,
      render: (row) => formatDate(row.payment_date),
    },
    { key: "note", header: t("finance.common.note"), truncate: true },
    ...(canUpdate || canDelete
      ? [
          {
            key: "actions",
            header: t("finance.common.actions"),
            align: "right",
            nowrap: true,
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                {canUpdate && (
                  <IconButton
                    icon={Pencil}
                    aria-label={t("finance.common.edit")}
                    onClick={() => setEditing(row)}
                  />
                )}
                {canDelete && (
                  <IconButton
                    icon={Trash2}
                    tone="danger"
                    aria-label={t("finance.common.delete")}
                    onClick={() => setDeleteTarget(row)}
                  />
                )}
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
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-secondary">{t("finance.common.student")}</span>
          <div className="flex gap-2">
            <Input
              placeholder={t("finance.common.searchByName")}
              className="w-48"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
            />
            <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">{t("finance.common.allStudents")}</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Select
          label={t("finance.payments.methodColumn")}
          className="w-full max-w-[160px]"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        >
          <option value="">{t("finance.common.allMethods")}</option>
          {Object.entries(METHOD_LABELS).map(([key, labelKey]) => (
            <option key={key} value={key}>
              {t(labelKey)}
            </option>
          ))}
        </Select>

        <DateInput
          label={t("finance.common.dateFrom")}
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
        />
        <DateInput
          label={t("finance.common.dateTo")}
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
        />
      </FilterBar>

      <Table
        columns={columns}
        data={payments}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Wallet}
            title={hasFilters ? t("finance.payments.emptyFilteredTitle") : t("finance.payments.emptyTitle")}
            description={
              hasFilters ? t("finance.common.retryOtherFilter") : t("finance.payments.emptyDesc")
            }
          />
        }
      />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {canCreate && (
        <PaymentFormModal
          open={modalOpen}
          onClose={onCloseModal}
          onSaved={refresh}
          editing={null}
          prefill={null}
        />
      )}

      {canUpdate && (
        <PaymentFormModal
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          onSaved={refresh}
          editing={editing}
          prefill={null}
        />
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("finance.payments.deleteTitle")}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {t("finance.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("finance.common.deleting") : t("finance.common.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <Trans
            i18nKey="finance.payments.deleteConfirm"
            values={{
              name: deleteTarget?.student_full_name,
              amount: formatMoneyI18n(deleteTarget?.amount, t),
            }}
            components={{ bold: <span className="font-medium text-fg" /> }}
          />
        </p>
      </Modal>
    </>
  );
}
