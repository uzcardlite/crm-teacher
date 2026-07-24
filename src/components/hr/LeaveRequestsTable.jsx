import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Palmtree } from "lucide-react";
import { cancelLeaveRequest, decideLeaveRequest } from "../../api/hr";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Modal from "../ui/Modal";
import Table from "../ui/Table";
import Textarea from "../ui/Textarea";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import {
  LEAVE_STATUS_BADGE,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_BADGE,
  LEAVE_TYPE_LABELS,
  formatDate,
  initials,
} from "../../constants/hr";
import { EMPTY_VALUE } from "../../utils/format";

// Shared by the global "Ta'tillar" tab and the employee profile leaves sub-tab.
// The only difference is whether the employee column is rendered.
export default function LeaveRequestsTable({
  rows,
  loading,
  canManage,
  includeEmployee = true,
  onChanged,
  emptyState,
}) {
  const { t } = useTranslation();
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deciding, setDeciding] = useState(false);

  async function approve(row) {
    setDeciding(true);
    try {
      await decideLeaveRequest(row.id, { status: "approved" });
      toast.success(t("staff.leaveRequestsTable.approved"));
      await onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("staff.leaveRequestsTable.approveError")));
    } finally {
      setDeciding(false);
    }
  }

  async function cancel(row) {
    setDeciding(true);
    try {
      await cancelLeaveRequest(row.id);
      toast.success(t("staff.leaveRequestsTable.cancelled"));
      await onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("staff.leaveRequestsTable.cancelError")));
    } finally {
      setDeciding(false);
      setCancelTarget(null);
    }
  }

  function openReject(row) {
    setRejectTarget(row);
    setRejectNote("");
  }

  function closeReject() {
    if (deciding) return;
    setRejectTarget(null);
  }

  async function submitReject(event) {
    event.preventDefault();
    if (!rejectTarget) return;
    setDeciding(true);
    try {
      await decideLeaveRequest(rejectTarget.id, {
        status: "rejected",
        decision_note: rejectNote.trim() || null,
      });
      toast.success(t("staff.leaveRequestsTable.rejected"));
      setRejectTarget(null);
      await onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("staff.leaveRequestsTable.rejectError")));
    } finally {
      setDeciding(false);
    }
  }

  const employeeColumn = {
    key: "employee",
    header: t("staff.leaveRequestsTable.columnEmployee"),
    render: (row) => (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
          <span className="text-xs font-semibold text-fg-muted">
            {initials(row.employee_full_name)}
          </span>
        </span>
        <span className="font-medium text-fg">{row.employee_full_name}</span>
      </div>
    ),
  };

  const columns = [
    ...(includeEmployee ? [employeeColumn] : []),
    {
      key: "leave_type",
      header: t("staff.leaveRequestsTable.columnType"),
      render: (row) => (
        <Badge variant={LEAVE_TYPE_BADGE[row.leave_type] || "neutral"}>
          {LEAVE_TYPE_LABELS[row.leave_type] ? t(LEAVE_TYPE_LABELS[row.leave_type]) : row.leave_type}
        </Badge>
      ),
    },
    {
      key: "dates",
      header: t("staff.leaveRequestsTable.columnDates"),
      render: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.start_date)} – {formatDate(row.end_date)}
        </span>
      ),
    },
    {
      key: "days",
      header: t("staff.leaveRequestsTable.columnDays"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <span className="text-fg-secondary">{t("staff.common.days", { count: row.days })}</span>
      ),
    },
    {
      key: "status",
      header: t("staff.leaveRequestsTable.columnStatus"),
      render: (row) => (
        <Badge variant={LEAVE_STATUS_BADGE[row.status] || "neutral"}>
          {LEAVE_STATUS_LABELS[row.status] ? t(LEAVE_STATUS_LABELS[row.status]) : row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: t("staff.leaveRequestsTable.columnActions"),
      align: "right",
      nowrap: true,
      render: (row) =>
        canManage && row.status === "pending" ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              disabled={deciding}
              onClick={(event) => {
                event.stopPropagation();
                approve(row);
              }}
            >
              {t("staff.leaveRequestsTable.approve")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={deciding}
              onClick={(event) => {
                event.stopPropagation();
                openReject(row);
              }}
            >
              {t("staff.leaveRequestsTable.reject")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={deciding}
              onClick={(event) => {
                event.stopPropagation();
                setCancelTarget(row);
              }}
            >
              {t("staff.common.cancel")}
            </Button>
          </div>
        ) : (
          <span className="text-fg-faint">{EMPTY_VALUE}</span>
        ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          emptyState ?? <EmptyState icon={Palmtree} title={t("staff.leaves.emptyTitle")} />
        }
      />

      <Modal
        open={Boolean(rejectTarget)}
        onClose={closeReject}
        title={t("staff.leaveRequestsTable.rejectTitle")}
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeReject} disabled={deciding}>
              {t("staff.common.cancel")}
            </Button>
            <Button
              variant="danger"
              type="submit"
              form="hr-leave-reject-form"
              disabled={deciding}
            >
              {deciding ? t("staff.leaveRequestsTable.rejecting") : t("staff.leaveRequestsTable.reject")}
            </Button>
          </>
        }
      >
        <form id="hr-leave-reject-form" onSubmit={submitReject} className="flex flex-col gap-4">
          <Textarea
            label={t("staff.leaveRequestsTable.rejectReasonLabel")}
            rows={3}
            maxLength={500}
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => !deciding && setCancelTarget(null)}
        title={t("staff.leaveRequestsTable.cancelTitle")}
        className="max-w-lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelTarget(null)}
              disabled={deciding}
            >
              {t("common.close")}
            </Button>
            <Button
              variant="danger"
              onClick={() => cancel(cancelTarget)}
              disabled={deciding}
            >
              {deciding ? t("staff.leaveRequestsTable.cancelling") : t("staff.leaveRequestsTable.confirmCancel")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          {cancelTarget
            ? t("staff.leaveRequestsTable.cancelConfirm", {
                start: formatDate(cancelTarget.start_date),
                end: formatDate(cancelTarget.end_date),
              })
            : ""}
        </p>
      </Modal>
    </>
  );
}
