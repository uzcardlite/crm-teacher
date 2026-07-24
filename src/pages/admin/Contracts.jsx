import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createContract,
  deleteContract,
  listContracts,
  updateContract,
} from "../../api/contracts";
import { listStudents } from "../../api/students";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import IconButton from "../../components/ui/IconButton";
import Input from "../../components/ui/Input";
import DateInput from "../../components/ui/DateInput";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { DEFAULT_STATUS, STATUS_BADGE, STATUS_LABELS, STATUS_ORDER } from "../../constants/contracts";
import { useTenantModules } from "../../context/TenantModulesContext";
import { formatDate, formatMoney } from "../../utils/format";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  student_id: "",
  contract_number: "",
  start_date: "",
  end_date: "",
  monthly_fee: "",
  status: DEFAULT_STATUS,
  note: "",
};

export default function Contracts() {
  const { t } = useTranslation();
  const { hasPermission } = useTenantModules();

  const [students, setStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listStudents({ page: 1, size: 100 })
      .then((res) => setStudents(res.items))
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.contracts.studentsError")));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [studentFilter, statusFilter]);

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, studentFilter, statusFilter]);

  async function loadContracts() {
    setLoading(true);
    try {
      const res = await listContracts({
        page,
        size: PAGE_SIZE,
        student_id: studentFilter || undefined,
        status: statusFilter || undefined,
      });
      setData(res.items);
      setTotal(res.total);
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.contracts.listError")));
      }
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(row) {
    setEditing(row);
    setForm({
      student_id: row.student_id ?? "",
      contract_number: row.contract_number ?? "",
      start_date: row.start_date ?? "",
      end_date: row.end_date ?? "",
      monthly_fee: row.monthly_fee ?? "",
      status: row.status ?? DEFAULT_STATUS,
      note: row.note ?? "",
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.student_id) nextErrors.student_id = t("pages.contracts.studentError");
    if (!form.contract_number.trim()) nextErrors.contract_number = t("pages.contracts.numberError");
    if (!form.start_date) nextErrors.start_date = t("pages.contracts.startDateError");
    // Pure frontend convenience — the backend does not enforce this order.
    if (form.end_date && form.end_date < form.start_date) {
      nextErrors.end_date = t("pages.contracts.endBeforeStartError");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      student_id: form.student_id,
      contract_number: form.contract_number.trim(),
      start_date: form.start_date.trim(),
      end_date: form.end_date ? form.end_date.trim() : null,
      monthly_fee: form.monthly_fee === "" ? null : form.monthly_fee,
      status: form.status,
      note: form.note.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateContract(editing.id, payload);
      } else {
        await createContract(payload);
      }
      toast.success(editing ? t("pages.contracts.updateSuccess") : t("pages.contracts.createSuccess"));
      setModalOpen(false);
      await loadContracts();
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.contracts.actionError")));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContract(deleteTarget.id);
      toast.success(t("pages.contracts.deleteSuccess"));
      setDeleteTarget(null);
      await loadContracts();
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.contracts.deleteError")));
      }
    } finally {
      setDeleting(false);
    }
  }

  function clearFilters() {
    setStudentFilter("");
    setStatusFilter("");
  }

  const hasFilters = Boolean(studentFilter || statusFilter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canUpdate = hasPermission("contracts.update");
  const canDelete = hasPermission("contracts.delete");
  const canCreate = hasPermission("contracts.create");

  const columns = [
    { key: "contract_number", header: t("pages.contracts.columns.number"), truncate: true },
    { key: "student_name", header: t("pages.contracts.columns.student"), truncate: true },
    {
      key: "term",
      header: t("pages.contracts.columns.term"),
      nowrap: true,
      render: (row) =>
        `${formatDate(row.start_date)} — ${row.end_date ? formatDate(row.end_date) : "—"}`,
    },
    {
      key: "monthly_fee",
      header: t("pages.contracts.columns.monthlyFee"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoney(row.monthly_fee),
    },
    {
      key: "status",
      header: t("pages.contracts.columns.status"),
      nowrap: true,
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status] ?? "neutral"}>
          {t(STATUS_LABELS[row.status] ?? row.status)}
        </Badge>
      ),
    },
  ];

  if (canUpdate || canDelete) {
    columns.push({
      key: "actions",
      header: t("pages.contracts.columns.actions"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <IconButton
              icon={Pencil}
              aria-label={t("pages.contracts.edit")}
              onClick={() => openEditModal(row)}
            />
          )}
          {canDelete && (
            <IconButton
              icon={Trash2}
              tone="danger"
              aria-label={t("pages.contracts.delete")}
              onClick={() => setDeleteTarget(row)}
            />
          )}
        </div>
      ),
    });
  }

  return (
    <div className="p-6">
      <PageHeader title={t("nav.contracts")}>
        {canCreate && (
          <Button onClick={openCreateModal}>
            <Plus size={16} />
            {t("pages.contracts.newContract")}
          </Button>
        )}
      </PageHeader>

      <FilterBar onClear={hasFilters ? clearFilters : undefined}>
        <Select
          label={t("pages.contracts.columns.student")}
          className="w-full max-w-[240px]"
          value={studentFilter}
          onChange={(event) => setStudentFilter(event.target.value)}
        >
          <option value="">{t("pages.contracts.allStudents")}</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name}
            </option>
          ))}
        </Select>
        <Select
          label={t("pages.contracts.columns.status")}
          className="w-full max-w-[180px]"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">{t("common.all")}</option>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {t(STATUS_LABELS[status])}
            </option>
          ))}
        </Select>
      </FilterBar>

      <Table
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={FileText}
            title={hasFilters ? t("pages.contracts.emptyFilteredTitle") : t("pages.contracts.emptyTitle")}
            description={
              hasFilters
                ? t("pages.contracts.emptyFilteredDescription")
                : t("pages.contracts.emptyDescription")
            }
            actionLabel={!hasFilters && canCreate ? t("pages.contracts.newContract") : undefined}
            onAction={!hasFilters && canCreate ? openCreateModal : undefined}
          />
        }
      />

      {!loading && data.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title={editing ? t("pages.contracts.editTitle") : t("pages.contracts.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("pages.contracts.cancel")}
            </Button>
            <Button type="submit" form="contract-form" disabled={submitting}>
              {submitting ? t("pages.contracts.saving") : t("pages.contracts.save")}
            </Button>
          </>
        }
      >
        <form id="contract-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Select
            label={t("pages.contracts.columns.student")}
            name="student_id"
            value={form.student_id}
            onChange={handleChange("student_id")}
            error={errors.student_id}
          >
            <option value="">{t("pages.contracts.selectStudent")}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name}
              </option>
            ))}
          </Select>
          <Input
            label={t("pages.contracts.columns.number")}
            name="contract_number"
            value={form.contract_number}
            onChange={handleChange("contract_number")}
            error={errors.contract_number}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DateInput
              label={t("pages.contracts.startDate")}
              name="start_date"
              value={form.start_date}
              onChange={handleChange("start_date")}
              error={errors.start_date}
            />
            <DateInput
              label={t("pages.contracts.endDate")}
              name="end_date"
              value={form.end_date}
              onChange={handleChange("end_date")}
              error={errors.end_date}
            />
          </div>
          <Input
            label={t("pages.contracts.monthlyFee")}
            name="monthly_fee"
            type="number"
            min="0"
            value={form.monthly_fee}
            onChange={handleChange("monthly_fee")}
          />
          <Select
            label={t("pages.contracts.columns.status")}
            name="status"
            value={form.status}
            onChange={handleChange("status")}
          >
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {t(STATUS_LABELS[status])}
              </option>
            ))}
          </Select>
          <Textarea
            label={t("pages.contracts.note")}
            name="note"
            value={form.note}
            onChange={handleChange("note")}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        size="md"
        title={t("pages.contracts.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("pages.contracts.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("pages.contracts.deleting") : t("pages.contracts.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <Trans
            i18nKey="pages.contracts.deleteConfirm"
            values={{ number: deleteTarget?.contract_number }}
            components={{ strong: <span className="font-medium text-fg" /> }}
          />
        </p>
      </Modal>
    </div>
  );
}
