import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Building2, CreditCard, DoorOpen, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { createFilial, deleteFilial, listFilials, updateFilial } from "../../api/filials";
import { listRooms } from "../../api/rooms";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import IconButton from "../../components/ui/IconButton";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

// The two icon+text lines inside a filial card share one shape (same pattern
// as the group cards on the Groups page).
function MetaRow({ icon: Icon, children, muted = false }) {
  return (
    <div className="flex items-center gap-2 text-sm text-fg-muted">
      <Icon size={14} className="flex-shrink-0 text-fg-faint" />
      <span className={cn("truncate", muted && "italic text-fg-faint")}>{children}</span>
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  address: "",
  phone: "",
  card_number: "",
  card_holder_name: "",
};

export default function Filials() {
  const { t } = useTranslation();
  const [filials, setFilials] = useState([]);
  const [loading, setLoading] = useState(true);
  // Real room count per filial, sourced from the rooms endpoint. `null` means
  // it could not be loaded (e.g. no permission) — in that case we simply
  // don't render the stat rather than showing a fabricated number.
  const [roomCounts, setRoomCounts] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadFilials();
  }, []);

  async function loadFilials() {
    setLoading(true);
    try {
      const data = await listFilials();
      setFilials(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.filials.listError")));
    } finally {
      setLoading(false);
    }

    // Room counts are a nice-to-have infographic figure, not core data —
    // fetch them separately so a permission/module error here never blocks
    // the filials list itself from rendering.
    try {
      const rooms = await listRooms();
      const counts = {};
      for (const room of rooms) {
        counts[room.filial_id] = (counts[room.filial_id] || 0) + 1;
      }
      setRoomCounts(counts);
    } catch {
      setRoomCounts(null);
    }
  }

  function openCreateModal() {
    setEditingFilial(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(filial) {
    setEditingFilial(filial);
    setForm({
      name: filial.name,
      address: filial.address || "",
      phone: filial.phone || "",
      card_number: filial.card_number || "",
      card_holder_name: filial.card_holder_name || "",
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
    if (!form.name.trim()) nextErrors.name = t("pages.filials.nameError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      card_number: form.card_number.trim() || null,
      card_holder_name: form.card_holder_name.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editingFilial) {
        await updateFilial(editingFilial.id, payload);
      } else {
        await createFilial(payload);
      }
      toast.success(editingFilial ? t("pages.filials.updateSuccess") : t("pages.filials.createSuccess"));
      setModalOpen(false);
      await loadFilials();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.filials.actionError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFilial(deleteTarget.id);
      toast.success(t("pages.filials.deleteSuccess"));
      setDeleteTarget(null);
      await loadFilials();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.filials.deleteError")));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-fg">{t("nav.filials")}</h1>
        <Button onClick={openCreateModal}>
          <Plus size={16} />
          {t("pages.filials.newFilial")}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : filials.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("pages.filials.emptyTitle")}
          description={t("pages.filials.emptyDescription")}
          actionLabel={t("pages.filials.newFilial")}
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filials.map((filial) => {
            const roomCount = roomCounts ? roomCounts[filial.id] || 0 : null;
            return (
              <Card key={filial.id} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-btn bg-accent-light/30 text-accent-dark dark:text-accent">
                    <Building2 size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-fg">{filial.name}</h3>
                    <MetaRow icon={MapPin} muted={!filial.address}>
                      {filial.address || t("fil.notProvided")}
                    </MetaRow>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <IconButton
                      icon={Pencil}
                      aria-label={t("pages.filials.edit")}
                      onClick={() => openEditModal(filial)}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      aria-label={t("pages.filials.delete")}
                      onClick={() => setDeleteTarget(filial)}
                    />
                  </div>
                </div>

                <MetaRow icon={Phone} muted={!filial.phone}>
                  {filial.phone || t("fil.notProvided")}
                </MetaRow>

                <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
                  {roomCount === null ? (
                    <MetaRow icon={DoorOpen}>—</MetaRow>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-btn bg-surface-sunken text-fg-muted">
                        <DoorOpen size={16} />
                      </span>
                      <div>
                        <p className="text-lg font-semibold leading-tight text-fg">{roomCount}</p>
                        <p className="text-xs leading-tight text-fg-faint">{t("fil.roomsLabel")}</p>
                      </div>
                    </div>
                  )}
                  {filial.card_number ? (
                    <Badge variant="success">
                      <CreditCard size={12} className="mr-1" />
                      {t("pages.filials.cardEntered")}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">{t("pages.filials.cardNotEntered")}</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingFilial ? t("pages.filials.editTitle") : t("pages.filials.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("pages.filials.cancel")}
            </Button>
            <Button type="submit" form="filial-form" disabled={submitting}>
              {submitting ? t("pages.filials.saving") : t("pages.filials.save")}
            </Button>
          </>
        }
      >
        <form id="filial-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label={t("pages.filials.columns.name")}
            name="name"
            value={form.name}
            onChange={handleChange("name")}
            error={errors.name}
          />
          <Input
            label={t("pages.filials.columns.address")}
            name="address"
            value={form.address}
            onChange={handleChange("address")}
          />
          <Input
            label={t("pages.filials.columns.phone")}
            name="phone"
            type="tel"
            placeholder="+998901234567"
            value={form.phone}
            onChange={handleChange("phone")}
          />
          <Input
            label={t("pages.filials.cardNumber")}
            name="card_number"
            placeholder="8600 1234 5678 9012"
            value={form.card_number}
            onChange={handleChange("card_number")}
          />
          <Input
            label={t("pages.filials.cardHolderName")}
            name="card_holder_name"
            value={form.card_holder_name}
            onChange={handleChange("card_holder_name")}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("pages.filials.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("pages.filials.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("pages.filials.deleting") : t("pages.filials.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <Trans
            i18nKey="pages.filials.deleteConfirm"
            values={{ name: deleteTarget?.name }}
            components={{ strong: <span className="font-medium text-fg" /> }}
          />
        </p>
      </Modal>
    </div>
  );
}
