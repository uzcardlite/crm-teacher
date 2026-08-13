import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  createBehaviour,
  deleteBehaviour,
  listMyBehaviour,
  listMyGroups,
  listMyGroupStudents,
  updateBehaviour,
} from "../../api/teacher";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import IconButton from "../../components/ui/IconButton";
import Input from "../../components/ui/Input";
import DateInput from "../../components/ui/DateInput";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { behaviourTone, formatDate } from "../../utils/format";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";
const EMPTY_FORM = { group_id: "", student_id: "", points: "", note: "", date: "" };

// Quick-pick point chips. Positive -> success tone, negative -> danger tone,
// mirroring the Attendance STATUS_CONFIG chip pattern exactly.
const POINT_CHIPS = [
  { value: 1, tone: "positive" },
  { value: 5, tone: "positive" },
  { value: -1, tone: "negative" },
  { value: -3, tone: "negative" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Signed display: "+3" / "−2" (U+2212 minus for negatives, never a hyphen).
function signPoints(points) {
  return `${points >= 0 ? "+" : "−"}${Math.abs(points)}`;
}

export default function Behaviour() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.behaviour.groupsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId) {
      setRecords([]);
      setStudents([]);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function loadData() {
    setLoading(true);
    try {
      const [behaviour, groupStudents] = await Promise.all([
        listMyBehaviour(groupId),
        listMyGroupStudents(groupId),
      ]);
      setRecords(behaviour);
      setStudents(groupStudents);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.behaviour.loadError")));
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function openCreateModal() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, group_id: groupId, date: todayISO() });
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(row) {
    setEditing(row);
    setForm({
      group_id: row.group_id,
      student_id: row.student_id,
      points: row.points,
      note: row.note || "",
      date: row.date ? row.date.slice(0, 10) : "",
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!editing && !groupId) nextErrors.group_id = t("teacher.behaviour.groupError");
    if (!form.student_id) nextErrors.student_id = t("teacher.behaviour.studentError");
    const points = Number(form.points);
    if (form.points === "" || !Number.isInteger(points) || points === 0) {
      nextErrors.points = t("teacher.behaviour.pointsError");
    }
    if (!form.date) nextErrors.date = t("teacher.behaviour.dateError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      group_id: form.group_id,
      student_id: form.student_id,
      points: Number(form.points),
      note: form.note.trim() || null,
      date: form.date,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateBehaviour(editing.id, payload);
        toast.success(t("teacher.behaviour.updateSuccess"));
      } else {
        await createBehaviour(payload);
        toast.success(t("teacher.behaviour.createSuccess"));
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editing ? t("teacher.behaviour.updateError") : t("teacher.behaviour.createError"),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBehaviour(deleteTarget.id);
      toast.success(t("teacher.behaviour.deleteSuccess"));
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.behaviour.deleteError")));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={PAGE_CLASS}>
      <div className="flex flex-col gap-3">
        <Select
          label={t("teacher.behaviour.groupLabel")}
          className="w-full"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          disabled={groups.length === 0}
        >
          <option value="">{t("teacher.behaviour.selectGroup")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>

        {groupId && (
          <Button variant="secondary" className="w-full" onClick={openCreateModal}>
            <Plus size={16} />
            {t("teacher.behaviour.newBehaviour")}
          </Button>
        )}
      </div>

      {!groupId ? (
        <EmptyState
          size="md"
          icon={Star}
          title={t("teacher.behaviour.selectGroupTitle")}
          description={t("teacher.behaviour.selectGroupDescription")}
        />
      ) : loading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} padding="p-4" className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))
      ) : records.length === 0 ? (
        <EmptyState
          size="md"
          icon={Star}
          title={t("teacher.behaviour.emptyTitle")}
          description={t("teacher.behaviour.emptyDescription")}
        />
      ) : (
        records.map((row) => {
          const tone = behaviourTone(row.points);
          return (
            <Card key={row.id} padding="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="truncate font-display text-base font-semibold text-fg">
                    {row.student_full_name}
                  </h3>
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <CalendarDays size={14} className="text-fg-faint" />
                    {formatDate(row.date)}
                  </p>
                  {row.note && (
                    <p className="text-xs text-fg-secondary line-clamp-2">{row.note}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <Badge variant={tone.badge}>
                    <span className="font-semibold tabular-nums">{signPoints(row.points)}</span>
                  </Badge>
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={Pencil}
                      aria-label={t("teacher.behaviour.edit")}
                      onClick={() => openEditModal(row)}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      aria-label={t("teacher.behaviour.delete")}
                      onClick={() => setDeleteTarget(row)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t("teacher.behaviour.editTitle") : t("teacher.behaviour.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button type="submit" form="teacher-behaviour-form" disabled={submitting}>
              {submitting ? t("teacher.common.saving") : t("teacher.common.save")}
            </Button>
          </>
        }
      >
        <form
          id="teacher-behaviour-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Select
            label={t("teacher.behaviour.studentLabel")}
            value={form.student_id}
            onChange={handleFormChange("student_id")}
            error={errors.student_id}
          >
            <option value="">{t("teacher.behaviour.selectStudent")}</option>
            {students.map((student) => (
              <option key={student.student_id} value={student.student_id}>
                {student.student_full_name}
              </option>
            ))}
          </Select>

          <div className="space-y-2">
            <Input
              label={t("teacher.behaviour.pointsLabel")}
              name="points"
              type="number"
              value={form.points}
              onChange={handleFormChange("points")}
              error={errors.points}
            />
            <div className="flex flex-wrap gap-2">
              {POINT_CHIPS.map((chip) => {
                const isActive = form.points !== "" && Number(form.points) === chip.value;
                const isPositive = chip.tone === "positive";
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, points: chip.value }))}
                    className={cn(
                      "flex items-center gap-1.5 rounded-btn border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? isPositive
                          ? "border-success bg-success text-white"
                          : "border-danger bg-danger text-white"
                        : isPositive
                          ? "border-line-strong text-fg-muted hover:bg-success-bg"
                          : "border-line-strong text-fg-muted hover:bg-danger-bg",
                    )}
                  >
                    <span className="tabular-nums">{signPoints(chip.value)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            label={t("teacher.behaviour.noteLabel")}
            name="note"
            rows={4}
            maxLength={500}
            value={form.note}
            onChange={handleFormChange("note")}
          />

          <DateInput
            label={t("teacher.behaviour.dateLabel")}
            name="date"
            value={form.date}
            onChange={handleFormChange("date")}
            error={errors.date}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("teacher.behaviour.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("teacher.common.saving") : t("teacher.behaviour.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("teacher.behaviour.deleteConfirm")}</p>
      </Modal>
    </div>
  );
}
