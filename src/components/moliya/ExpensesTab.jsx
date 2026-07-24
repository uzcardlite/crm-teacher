import { useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Download, Pencil, Receipt, Trash2 } from "lucide-react";
import { createExpense, deleteExpense, listExpenses, updateExpense } from "../../api/expenses";
import { downloadFinanceExport } from "../../api/finance";
import { listFilials } from "../../api/filials";
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
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { saveBlobResponse } from "../../utils/downloadFile";
import { cn } from "../../utils/cn";
import {
  METHOD_BADGE,
  METHOD_LABELS,
  formatDate,
  formatMoneyI18n,
  todayValue,
} from "../../constants/moliya";

const PAGE_SIZE = 20;

function emptyForm() {
  return {
    filial_id: "",
    category: "",
    amount: "",
    date: todayValue(),
    description: "",
    payment_method: "",
  };
}

export default function ExpensesTab({
  canUpdate,
  canDelete,
  modalOpen,
  onCloseModal,
  onDataChanged,
}) {
  const { t } = useTranslation();
  const categoryOptions = t("finance.expenses.categoryOptions", { returnObjects: true });
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filials, setFilials] = useState([]);
  const filialMap = useMemo(
    () => Object.fromEntries(filials.map((filial) => [filial.id, filial.name])),
    [filials],
  );

  const [filialFilter, setFilialFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const formOpen = modalOpen || Boolean(editingExpense);

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("finance.common.loadBranchesError")));
        }
      });
  }, [t]);

  // Reset the create form each time the page-level "Yangi xarajat" button opens it.
  useEffect(() => {
    if (modalOpen) {
      setEditingExpense(null);
      setForm(emptyForm());
      setErrors({});
    }
  }, [modalOpen]);

  useEffect(() => {
    setPage(1);
  }, [filialFilter, dateFrom, dateTo]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listExpenses({
        page,
        size: PAGE_SIZE,
        filial_id: filialFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setExpenses(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.expenses.loadError")));
    } finally {
      setLoading(false);
    }
  }, [page, filialFilter, dateFrom, dateTo, t]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  function openEditModal(expense) {
    setEditingExpense(expense);
    setForm({
      filial_id: expense.filial_id || "",
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      description: expense.description || "",
      payment_method: expense.payment_method || "",
    });
    setErrors({});
  }

  function closeModal() {
    if (submitting) return;
    setEditingExpense(null);
    onCloseModal();
  }

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function clearFilters() {
    setFilialFilter("");
    setDateFrom("");
    setDateTo("");
  }

  async function refresh() {
    await loadExpenses();
    await onDataChanged?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.category.trim()) nextErrors.category = t("finance.expenses.categoryRequired");
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = t("finance.expenses.amountRequired");
    if (!form.date) nextErrors.date = t("finance.expenses.dateRequired");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      filial_id: form.filial_id || null,
      category: form.category.trim(),
      amount: form.amount,
      date: form.date,
      description: form.description.trim() || null,
      payment_method: form.payment_method || null,
    };

    setSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
      } else {
        await createExpense(payload);
      }
      toast.success(
        editingExpense ? t("finance.expenses.updated") : t("finance.expenses.created"),
      );
      setEditingExpense(null);
      onCloseModal();
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.common.actionError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget.id);
      toast.success(t("finance.expenses.deleted"));
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.common.deleteError")));
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await downloadFinanceExport("expenses", {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        filial_id: filialFilter || undefined,
      });
      saveBlobResponse(response, "xarajatlar.csv");
      toast.success(t("finance.common.fileDownloaded"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.common.filePrepareError")));
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(filialFilter || dateFrom || dateTo);

  const columns = [
    { key: "category", header: t("finance.expenses.categoryColumn") },
    {
      key: "amount",
      header: t("finance.common.amount"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoneyI18n(row.amount, t),
    },
    {
      key: "payment_method",
      header: t("finance.expenses.methodColumn"),
      render: (row) =>
        row.payment_method ? (
          <Badge variant={METHOD_BADGE[row.payment_method] || "neutral"}>
            {METHOD_LABELS[row.payment_method] ? t(METHOD_LABELS[row.payment_method]) : row.payment_method}
          </Badge>
        ) : (
          <span className="text-fg-faint">{t("finance.expenses.methodNotSpecified")}</span>
        ),
    },
    {
      key: "filial",
      header: t("finance.common.branch"),
      // An unknown filial id falls through to the table's em dash.
      render: (row) => (row.filial_id ? filialMap[row.filial_id] : t("finance.expenses.generalBranch")),
    },
    {
      key: "date",
      header: t("finance.common.date"),
      nowrap: true,
      render: (row) => formatDate(row.date),
    },
    { key: "description", header: t("finance.common.note"), truncate: true },
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
                    onClick={() => openEditModal(row)}
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
        <Select
          label={t("finance.common.branch")}
          className="w-full max-w-[220px]"
          value={filialFilter}
          onChange={(event) => setFilialFilter(event.target.value)}
        >
          <option value="">{t("finance.common.allBranches")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
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
        data={expenses}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Receipt}
            title={hasFilters ? t("finance.expenses.emptyFilteredTitle") : t("finance.expenses.emptyTitle")}
            description={
              hasFilters ? t("finance.common.retryOtherFilter") : t("finance.expenses.emptyDesc")
            }
          />
        }
      />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal
        open={formOpen}
        onClose={closeModal}
        title={editingExpense ? t("finance.expenses.editTitle") : t("finance.expenses.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("finance.common.cancel")}
            </Button>
            <Button type="submit" form="expense-form" disabled={submitting}>
              {submitting ? t("finance.common.saving") : t("finance.common.save")}
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Select label={t("finance.common.branch")} value={form.filial_id} onChange={handleChange("filial_id")}>
            <option value="">{t("finance.expenses.generalNoBranch")}</option>
            {filials.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.name}
              </option>
            ))}
          </Select>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-category" className="text-sm font-medium text-fg-secondary">
              {t("finance.expenses.categoryLabel")}
            </label>
            <input
              id="expense-category"
              list="expense-category-options"
              value={form.category}
              onChange={handleChange("category")}
              placeholder={t("finance.expenses.categoryPlaceholder")}
              className={cn(
                "rounded-btn border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent/40",
                errors.category
                  ? "border-danger focus:ring-danger/30"
                  : "border-line-strong focus:border-accent",
              )}
            />
            <datalist id="expense-category-options">
              {categoryOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            {errors.category && <p className="text-xs text-danger">{errors.category}</p>}
          </div>

          <Input
            label={t("finance.common.amountSom")}
            type="number"
            min="0"
            value={form.amount}
            onChange={handleChange("amount")}
            error={errors.amount}
          />

          <Select
            label={t("finance.expenses.methodColumn")}
            value={form.payment_method}
            onChange={handleChange("payment_method")}
          >
            <option value="">{t("finance.expenses.methodNotSpecified")}</option>
            {Object.entries(METHOD_LABELS).map(([key, labelKey]) => (
              <option key={key} value={key}>
                {t(labelKey)}
              </option>
            ))}
          </Select>

          <DateInput
            label={t("finance.common.date")}
            value={form.date}
            onChange={handleChange("date")}
            error={errors.date}
          />
          <Input
            label={t("finance.common.note")}
            value={form.description}
            onChange={handleChange("description")}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("finance.expenses.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
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
            i18nKey="finance.expenses.deleteConfirm"
            values={{
              category: deleteTarget?.category,
              amount: formatMoneyI18n(deleteTarget?.amount, t),
            }}
            components={{ bold: <span className="font-medium text-fg" /> }}
          />
        </p>
      </Modal>
    </>
  );
}
