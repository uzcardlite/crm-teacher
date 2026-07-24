import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import {
  cancelMyBooking,
  confirmMyBooking,
  createMySlot,
  deleteMySlot,
  listMyBookings,
  listMySlots,
} from "../../api/teacher";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import IconButton from "../../components/ui/IconButton";
import Input from "../../components/ui/Input";
import DateInput from "../../components/ui/DateInput";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import Tabs from "../../components/ui/Tabs";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/format";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";
const EMPTY_FORM = { date: "", start_time: "", end_time: "" };

// pending -> confirmed -> cancelled color mapping (canonical, from designer).
const STATUS_VARIANT = { pending: "warning", confirmed: "success", cancelled: "danger" };

// "09:00:00" -> "09:00". Backend sends "HH:MM:SS" strings.
function hm(time) {
  return time ? time.slice(0, 5) : "";
}

export default function Booking() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("slots");

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Booking action confirmation: { booking, action: "confirm" | "cancel" }.
  const [actionTarget, setActionTarget] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    loadSlots();
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSlots() {
    setSlotsLoading(true);
    try {
      setSlots(await listMySlots());
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.booking.slotsError")));
    } finally {
      setSlotsLoading(false);
    }
  }

  async function loadBookings() {
    setBookingsLoading(true);
    try {
      setBookings(await listMyBookings());
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.booking.bookingsError")));
    } finally {
      setBookingsLoading(false);
    }
  }

  function handleFormChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function openCreateModal() {
    setForm(EMPTY_FORM);
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
    if (!form.date) nextErrors.date = t("teacher.booking.validation.dateRequired");
    if (!form.start_time || !form.end_time) {
      nextErrors.time = t("teacher.booking.validation.timeRequired");
    } else if (form.end_time <= form.start_time) {
      nextErrors.time = t("teacher.booking.validation.timeOrder");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createMySlot({
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
      });
      toast.success(t("teacher.booking.createSlotSuccess"));
      setModalOpen(false);
      await loadSlots();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.booking.createSlotError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMySlot(deleteTarget.id);
      toast.success(t("teacher.booking.deleteSlotSuccess"));
      setDeleteTarget(null);
      await loadSlots();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.booking.deleteSlotError")));
    } finally {
      setDeleting(false);
    }
  }

  async function handleAction() {
    if (!actionTarget) return;
    const { booking, action } = actionTarget;
    setActing(true);
    try {
      if (action === "confirm") {
        await confirmMyBooking(booking.id);
        toast.success(t("teacher.booking.confirmSuccess"));
      } else {
        await cancelMyBooking(booking.id);
        toast.success(t("teacher.booking.cancelSuccess"));
      }
      setActionTarget(null);
      await Promise.all([loadBookings(), loadSlots()]);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          action === "confirm"
            ? t("teacher.booking.confirmError")
            : t("teacher.booking.cancelError"),
        ),
      );
    } finally {
      setActing(false);
    }
  }

  const tabs = [
    { key: "slots", label: t("teacher.booking.tabSlots") },
    { key: "bookings", label: t("teacher.booking.tabBookings") },
  ];

  return (
    <div className={PAGE_CLASS}>
      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

      {activeTab === "slots" ? (
        <>
          <Button variant="secondary" className="w-full" onClick={openCreateModal}>
            <Plus size={16} />
            {t("teacher.booking.newSlot")}
          </Button>

          {slotsLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} padding="p-4" className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </Card>
            ))
          ) : slots.length === 0 ? (
            <EmptyState
              size="md"
              icon={CalendarClock}
              title={t("teacher.booking.emptySlotsTitle")}
              description={t("teacher.booking.emptySlotsDescription")}
            />
          ) : (
            slots.map((slot) => {
              const booked = Boolean(slot.booking);
              return (
                <Card key={slot.id} padding="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex flex-col gap-1">
                      <p className="text-sm font-semibold text-fg">{formatDate(slot.date)}</p>
                      <p className="text-xs text-fg-muted">
                        {hm(slot.start_time)}–{hm(slot.end_time)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-2">
                      <Badge variant={booked ? "neutral" : "success"}>
                        {booked ? t("teacher.booking.slotBooked") : t("teacher.booking.slotFree")}
                      </Badge>
                      <IconButton
                        icon={Trash2}
                        tone="danger"
                        aria-label={t("teacher.booking.deleteSlot")}
                        disabled={booked}
                        onClick={() => setDeleteTarget(slot)}
                      />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </>
      ) : bookingsLoading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} padding="p-4" className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))
      ) : bookings.length === 0 ? (
        <EmptyState
          size="md"
          icon={CalendarClock}
          title={t("teacher.booking.emptyBookingsTitle")}
          description={t("teacher.booking.emptyBookingsDescription")}
        />
      ) : (
        bookings.map((booking) => {
          const meta = [
            formatDate(booking.date),
            `${hm(booking.start_time)}–${hm(booking.end_time)}`,
            booking.parent_phone,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <Card key={booking.id} padding="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="truncate text-sm font-semibold text-fg">
                    {booking.student_name}
                  </h3>
                  <p className="text-xs text-fg-muted">{meta}</p>
                  {booking.note && (
                    <p className="text-xs text-fg-secondary line-clamp-2">{booking.note}</p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[booking.status]}>
                  {t(`teacher.booking.status.${booking.status}`)}
                </Badge>
              </div>
              {booking.status === "pending" && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setActionTarget({ booking, action: "confirm" })}
                  >
                    {t("teacher.booking.confirm")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setActionTarget({ booking, action: "cancel" })}
                  >
                    {t("teacher.booking.cancelBooking")}
                  </Button>
                </div>
              )}
            </Card>
          );
        })
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t("teacher.booking.createSlotTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button type="submit" form="teacher-booking-form" disabled={submitting}>
              {submitting ? t("teacher.common.saving") : t("teacher.common.save")}
            </Button>
          </>
        }
      >
        <form
          id="teacher-booking-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <DateInput
            label={t("teacher.booking.dateLabel")}
            name="date"
            value={form.date}
            onChange={handleFormChange("date")}
            error={errors.date}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("teacher.booking.startLabel")}
              name="start_time"
              type="time"
              value={form.start_time}
              onChange={handleFormChange("start_time")}
              error={errors.time}
            />
            <Input
              label={t("teacher.booking.endLabel")}
              name="end_time"
              type="time"
              value={form.end_time}
              onChange={handleFormChange("end_time")}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("teacher.booking.deleteSlotTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("teacher.common.saving") : t("teacher.booking.deleteSlot")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("teacher.booking.deleteSlotConfirm")}</p>
      </Modal>

      <Modal
        open={Boolean(actionTarget)}
        onClose={() => !acting && setActionTarget(null)}
        title={
          actionTarget?.action === "confirm"
            ? t("teacher.booking.confirmTitle")
            : t("teacher.booking.cancelTitle")
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionTarget(null)} disabled={acting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button
              variant={actionTarget?.action === "confirm" ? "primary" : "danger"}
              onClick={handleAction}
              disabled={acting}
            >
              {acting
                ? t("teacher.common.saving")
                : actionTarget?.action === "confirm"
                  ? t("teacher.booking.confirm")
                  : t("teacher.booking.cancelBooking")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">
          {actionTarget?.action === "confirm"
            ? t("teacher.booking.confirmText")
            : t("teacher.booking.cancelText")}
        </p>
      </Modal>
    </div>
  );
}
