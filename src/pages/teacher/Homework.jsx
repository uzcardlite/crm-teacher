import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createMyHomework,
  deleteMyHomework,
  listMyGroups,
  listMyHomework,
  updateMyHomework,
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
import { formatDate, homeworkDueStatus } from "../../utils/format";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";
const EMPTY_FORM = { group_id: "", title: "", description: "", due_date: "" };

export default function Homework() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [homeworks, setHomeworks] = useState([]);
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
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.homework.groupsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId) {
      setHomeworks([]);
      return;
    }
    loadHomeworks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function loadHomeworks() {
    setLoading(true);
    try {
      setHomeworks(await listMyHomework({ group_id: groupId }));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.homework.homeworksError")));
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function openCreateModal() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, group_id: groupId });
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(hw) {
    setEditing(hw);
    setForm({
      group_id: hw.group_id,
      title: hw.title,
      description: hw.description || "",
      due_date: hw.due_date ? hw.due_date.slice(0, 10) : "",
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
    if (!editing && !groupId) nextErrors.group_id = t("teacher.homework.groupError");
    if (!form.title.trim()) nextErrors.title = t("teacher.homework.titleError");
    if (!form.due_date) nextErrors.due_date = t("teacher.homework.dueDateError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      group_id: form.group_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateMyHomework(editing.id, payload);
        toast.success(t("teacher.homework.updateSuccess"));
      } else {
        await createMyHomework(payload);
        toast.success(t("teacher.homework.createSuccess"));
      }
      setModalOpen(false);
      await loadHomeworks();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editing ? t("teacher.homework.updateError") : t("teacher.homework.createError"),
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
      await deleteMyHomework(deleteTarget.id);
      toast.success(t("teacher.homework.deleteSuccess"));
      setDeleteTarget(null);
      await loadHomeworks();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.homework.deleteError")));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={PAGE_CLASS}>
      <div className="flex flex-col gap-3">
        <Select
          label={t("teacher.homework.groupLabel")}
          className="w-full"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          disabled={groups.length === 0}
        >
          <option value="">{t("teacher.homework.selectGroup")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>

        {groupId && (
          <Button variant="secondary" className="w-full" onClick={openCreateModal}>
            <Plus size={16} />
            {t("teacher.homework.newHomework")}
          </Button>
        )}
      </div>

      {!groupId ? (
        <EmptyState
          size="md"
          icon={ClipboardList}
          title={t("teacher.homework.selectGroupTitle")}
          description={t("teacher.homework.selectGroupDescription")}
        />
      ) : loading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} padding="p-4" className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))
      ) : homeworks.length === 0 ? (
        <EmptyState
          size="md"
          icon={ClipboardList}
          title={t("teacher.homework.emptyTitle")}
          description={t("teacher.homework.emptyDescription")}
        />
      ) : (
        homeworks.map((hw) => {
          const status = homeworkDueStatus(hw.due_date);
          return (
            <Card key={hw.id} padding="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="truncate font-display text-base font-semibold text-fg">{hw.title}</h3>
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <CalendarDays size={14} className="text-fg-faint" />
                    {formatDate(hw.due_date)}
                  </p>
                  {hw.description && (
                    <p className="text-xs text-fg-secondary line-clamp-2">{hw.description}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <Badge variant={status.variant}>{t(`teacher.homework.${status.key}`)}</Badge>
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={Pencil}
                      aria-label={t("teacher.homework.edit")}
                      onClick={() => openEditModal(hw)}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      aria-label={t("teacher.homework.delete")}
                      onClick={() => setDeleteTarget(hw)}
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
        title={editing ? t("teacher.homework.editTitle") : t("teacher.homework.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button type="submit" form="teacher-homework-form" disabled={submitting}>
              {submitting ? t("teacher.common.saving") : t("teacher.common.save")}
            </Button>
          </>
        }
      >
        <form
          id="teacher-homework-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label={t("teacher.homework.titleLabel")}
            name="title"
            maxLength={200}
            value={form.title}
            onChange={handleFormChange("title")}
            error={errors.title}
          />
          <Textarea
            label={t("teacher.homework.descriptionLabel")}
            name="description"
            rows={4}
            value={form.description}
            onChange={handleFormChange("description")}
          />
          <DateInput
            label={t("teacher.homework.dueDateLabel")}
            name="due_date"
            value={form.due_date}
            onChange={handleFormChange("due_date")}
            error={errors.due_date}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("teacher.homework.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("teacher.common.saving") : t("teacher.homework.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("teacher.homework.deleteConfirm")}</p>
      </Modal>
    </div>
  );
}
