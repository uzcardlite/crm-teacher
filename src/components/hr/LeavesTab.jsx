import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Palmtree } from "lucide-react";
import { createLeaveRequest, listEmployees, listLeaveRequests } from "../../api/hr";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import DateInput from "../ui/DateInput";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import StatCard from "../ui/StatCard";
import Textarea from "../ui/Textarea";
import Pagination from "../ui/Pagination";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from "../../constants/hr";
import LeaveRequestsTable from "./LeaveRequestsTable";

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  employee_id: "",
  leave_type: "annual",
  start_date: "",
  end_date: "",
  reason: "",
};

export default function LeavesTab({
  canManage,
  stats,
  statsLoading,
  modalOpen,
  onCloseModal,
  onDataChanged,
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [activeEmployees, setActiveEmployees] = useState([]);

  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listEmployees({ status: "active", size: 200 })
      .then((data) => setActiveEmployees(data.items || []))
      .catch(() => {});
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listLeaveRequests({
        page,
        size: PAGE_SIZE,
        leave_type: filterType || undefined,
        status: filterStatus || undefined,
        employee_id: filterEmployeeId || undefined,
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      toast.error(getErrorMessage(error, t("staff.leaves.loadError")));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterType, filterStatus, filterEmployeeId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (modalOpen) {
      setForm(EMPTY_FORM);
      setErrors({});
    }
  }, [modalOpen]);

  function clearFilters() {
    setFilterType("");
    setFilterStatus("");
    setFilterEmployeeId("");
    setPage(1);
  }

  const hasFilters = Boolean(filterType || filterStatus || filterEmployeeId);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function closeModal() {
    if (submitting) return;
    onCloseModal();
  }

  // Live approximation only — the authoritative day count comes back from the API.
  const estimatedDays =
    form.start_date && form.end_date && form.end_date >= form.start_date
      ? Math.round(
          (new Date(form.end_date) - new Date(form.start_date)) / (24 * 60 * 60 * 1000),
        ) + 1
      : null;

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.employee_id) nextErrors.employee_id = t("staff.leaves.validation.employee");
    if (!form.leave_type) nextErrors.leave_type = t("staff.leaves.validation.leaveType");
    if (!form.start_date) nextErrors.start_date = t("staff.leaves.validation.startDate");
    if (!form.end_date) {
      nextErrors.end_date = t("staff.leaves.validation.endDate");
    } else if (form.start_date && form.end_date < form.start_date) {
      nextErrors.end_date = t("staff.common.dateRangeError");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createLeaveRequest({
        employee_id: form.employee_id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim() || null,
      });
      toast.success(t("staff.leaves.created"));
      onCloseModal();
      await loadRows();
      await onDataChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("staff.leaves.saveError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChanged() {
    await loadRows();
    await onDataChanged?.();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          compact
          icon={Clock}
          label={t("status.pending")}
          value={statsLoading || !stats ? "-" : stats.pending_leave_requests}
        />
        <StatCard
          compact
          icon={Palmtree}
          label={t("staff.leaves.onLeaveToday")}
          value={statsLoading || !stats ? "-" : stats.on_leave_today}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label={t("staff.leaves.typeLabel")}
          className="w-full max-w-[180px]"
          value={filterType}
          onChange={(event) => {
            setFilterType(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("staff.leaves.allTypes")}</option>
          {Object.entries(LEAVE_TYPE_LABELS).map(([key, labelKey]) => (
            <option key={key} value={key}>
              {t(labelKey)}
            </option>
          ))}
        </Select>
        <Select
          label={t("staff.common.statusLabel")}
          className="w-full max-w-[160px]"
          value={filterStatus}
          onChange={(event) => {
            setFilterStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("staff.common.allStatuses")}</option>
          {Object.entries(LEAVE_STATUS_LABELS).map(([key, labelKey]) => (
            <option key={key} value={key}>
              {t(labelKey)}
            </option>
          ))}
        </Select>
        <Select
          label={t("staff.leaves.employeeLabel")}
          className="w-full max-w-[220px]"
          value={filterEmployeeId}
          onChange={(event) => {
            setFilterEmployeeId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("staff.leaves.allEmployees")}</option>
          {activeEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            {t("common.clear")}
          </Button>
        )}
      </div>

      <LeaveRequestsTable
        rows={rows}
        loading={loading}
        canManage={canManage}
        includeEmployee
        onChanged={handleChanged}
        emptyState={
          <EmptyState
            icon={Palmtree}
            title={t("staff.leaves.emptyTitle")}
            description={t("staff.leaves.emptyDescription")}
          />
        }
      />

      {!loading && rows.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t("staff.leaves.modalTitle")}
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("staff.common.cancel")}
            </Button>
            <Button type="submit" form="hr-leave-form" disabled={submitting}>
              {submitting ? t("staff.common.saving") : t("staff.common.save")}
            </Button>
          </>
        }
      >
        <form id="hr-leave-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Select
            label={t("staff.leaves.employeeLabel")}
            value={form.employee_id}
            onChange={handleChange("employee_id")}
            error={errors.employee_id}
          >
            <option value="">{t("staff.leaves.chooseEmployee")}</option>
            {activeEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </Select>
          <Select
            label={t("staff.leaves.typeLabel")}
            value={form.leave_type}
            onChange={handleChange("leave_type")}
            error={errors.leave_type}
          >
            {Object.entries(LEAVE_TYPE_LABELS).map(([key, labelKey]) => (
              <option key={key} value={key}>
                {t(labelKey)}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateInput
              label={t("staff.common.dateFrom")}
              value={form.start_date}
              onChange={handleChange("start_date")}
              error={errors.start_date}
            />
            <DateInput
              label={t("staff.common.dateTo")}
              value={form.end_date}
              onChange={handleChange("end_date")}
              error={errors.end_date}
            />
          </div>
          {estimatedDays !== null && (
            <p className="text-xs text-fg-muted">{t("staff.leaves.estimatedDays", { count: estimatedDays })}</p>
          )}
          <Textarea
            label={t("staff.leaves.reasonLabel")}
            rows={3}
            maxLength={500}
            value={form.reason}
            onChange={handleChange("reason")}
          />
        </form>
      </Modal>
    </div>
  );
}
