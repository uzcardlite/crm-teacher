import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPayment, updatePayment } from "../../api/payments";
import { getStudentGroups, listStudents } from "../../api/students";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import Textarea from "../ui/Textarea";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { METHOD_LABELS, currentMonthValue, formatMoneyI18n } from "../../constants/moliya";

const STUDENT_PAGE_SIZE = 100;

function emptyForm() {
  return {
    studentId: "",
    groupId: "",
    amount: "",
    method: "cash",
    monthFor: currentMonthValue(),
    note: "",
  };
}

// One modal for three flows: new payment, quick payment from the debtors table
// (`prefill`) and editing an existing payment (`editing`).
export default function PaymentFormModal({ open, onClose, onSaved, editing, prefill }) {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [activeGroups, setActiveGroups] = useState(null);
  const [resolvingGroups, setResolvingGroups] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(editing);

  useEffect(() => {
    if (!open || isEdit) return;
    listStudents({ page: 1, size: STUDENT_PAGE_SIZE })
      .then((data) => setStudents(data.items))
      .catch((error) =>
        toast.error(getErrorMessage(error, t("finance.common.loadStudentsError"))),
      );
  }, [open, isEdit, t]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setStudentSearch("");

    if (editing) {
      setForm({
        studentId: editing.student_id,
        groupId: editing.group_id || "",
        amount: String(editing.amount ?? ""),
        method: editing.method,
        monthFor: String(editing.month_for || "").slice(0, 7) || currentMonthValue(),
        note: editing.note || "",
      });
      setActiveGroups(null);
      return;
    }

    if (prefill) {
      setForm({
        ...emptyForm(),
        studentId: prefill.studentId,
        groupId: prefill.groupId || "",
        monthFor: prefill.monthFor || currentMonthValue(),
      });
      setActiveGroups(
        prefill.groupId ? [{ id: prefill.groupId, name: prefill.groupName || "" }] : null,
      );
      return;
    }

    setForm(emptyForm());
    setActiveGroups(null);
  }, [open, editing, prefill]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const query = studentSearch.trim().toLowerCase();
    return students.filter((student) => student.full_name.toLowerCase().includes(query));
  }, [students, studentSearch]);

  async function resolveGroups(studentId) {
    setResolvingGroups(true);
    try {
      const groups = await getStudentGroups(studentId);
      setActiveGroups(groups);
      setForm((prev) => ({ ...prev, groupId: groups.length === 1 ? groups[0].id : "" }));
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.paymentForm.loadGroupsError")));
      setActiveGroups([]);
    } finally {
      setResolvingGroups(false);
    }
  }

  function handleSelectStudent(studentId) {
    setForm((prev) => ({ ...prev, studentId, groupId: "" }));
    setActiveGroups(null);
    if (studentId) resolveGroups(studentId);
  }

  function closeModal() {
    if (submitting) return;
    onClose();
  }

  const debtWarning =
    !isEdit &&
    prefill?.debtAmount !== undefined &&
    Number(form.amount) > Number(prefill.debtAmount) &&
    Number(form.amount) > 0;

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.studentId) nextErrors.studentId = t("finance.paymentForm.studentRequired");
    if (!form.amount || Number(form.amount) <= 0) {
      nextErrors.amount = t("finance.paymentForm.amountRequired");
    }
    if (!isEdit && activeGroups && activeGroups.length > 1 && !form.groupId) {
      nextErrors.groupId = t("finance.paymentForm.groupRequired");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        await updatePayment(editing.id, {
          amount: form.amount,
          method: form.method,
          month_for: `${form.monthFor}-01`,
          note: form.note.trim() || null,
        });
        toast.success(t("finance.paymentForm.updated"));
      } else {
        await createPayment({
          student_id: form.studentId,
          group_id: form.groupId || null,
          amount: form.amount,
          method: form.method,
          month_for: `${form.monthFor}-01`,
          note: form.note.trim() || null,
        });
        toast.success(t("finance.paymentForm.created"));
      }
      onClose();
      await onSaved?.();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          isEdit ? t("finance.paymentForm.updateError") : t("finance.paymentForm.createError"),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={isEdit ? t("finance.paymentForm.editTitle") : t("finance.paymentForm.createTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={closeModal} disabled={submitting}>
            {t("finance.common.cancel")}
          </Button>
          <Button type="submit" form="payment-form" disabled={submitting}>
            {submitting ? t("finance.common.saving") : t("finance.common.save")}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {isEdit ? (
          <p className="text-sm text-fg-muted">
            {t("finance.paymentForm.studentPrefix")}{" "}
            <span className="font-medium text-fg-secondary">{editing.student_full_name}</span>
          </p>
        ) : prefill ? (
          <p className="text-sm text-fg-muted">
            {t("finance.paymentForm.studentPrefix")}{" "}
            <span className="font-medium text-fg-secondary">{prefill.studentName}</span>
            {prefill.groupName ? ` — ${prefill.groupName}` : ""}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg-secondary">{t("finance.common.student")}</span>
            <Input
              placeholder={t("finance.common.searchByName")}
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
            />
            <Select
              value={form.studentId}
              error={errors.studentId}
              onChange={(event) => handleSelectStudent(event.target.value)}
            >
              <option value="">{t("finance.paymentForm.selectStudent")}</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {resolvingGroups && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-fg-muted">{t("finance.paymentForm.groupsResolving")}</span>
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {!isEdit && !prefill && !resolvingGroups && activeGroups && activeGroups.length > 1 && (
          <Select
            label={t("finance.common.group")}
            value={form.groupId}
            onChange={(event) => setForm((prev) => ({ ...prev, groupId: event.target.value }))}
            error={errors.groupId}
          >
            <option value="">{t("finance.paymentForm.selectGroup")}</option>
            {activeGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        )}

        {!isEdit && !prefill && !resolvingGroups && activeGroups && activeGroups.length === 1 && (
          <p className="text-sm text-fg-muted">
            {t("finance.paymentForm.singleGroupPrefix")}{" "}
            <span className="font-medium text-fg-secondary">{activeGroups[0].name}</span>
          </p>
        )}

        {!isEdit && !prefill && !resolvingGroups && activeGroups && activeGroups.length === 0 && (
          <p className="text-sm text-fg-muted">{t("finance.paymentForm.noActiveGroup")}</p>
        )}

        <Input
          label={t("finance.common.amountSom")}
          type="number"
          min="0"
          value={form.amount}
          onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          error={errors.amount}
        />

        {debtWarning && (
          <p className="text-xs text-accent-dark">
            {t("finance.paymentForm.debtWarning", {
              debt: formatMoneyI18n(prefill.debtAmount, t),
            })}
          </p>
        )}

        <Select
          label={t("finance.paymentForm.methodLabel")}
          value={form.method}
          onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}
        >
          {Object.entries(METHOD_LABELS).map(([key, labelKey]) => (
            <option key={key} value={key}>
              {t(labelKey)}
            </option>
          ))}
        </Select>

        <Input
          label={t("finance.paymentForm.monthForLabel")}
          type="month"
          value={form.monthFor}
          onChange={(event) => setForm((prev) => ({ ...prev, monthFor: event.target.value }))}
        />

        <Textarea
          label={t("finance.paymentForm.noteLabel")}
          rows={2}
          maxLength={500}
          value={form.note}
          onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
        />
      </form>
    </Modal>
  );
}
