import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Copy, DoorOpen, LogIn, LogOut, Pencil, Plus, Router, Trash2 } from "lucide-react";
import {
  createDevice,
  createEvent,
  deleteDevice,
  listDevices,
  listEvents,
  updateDevice,
} from "../../api/turnstile";
import { listStudents } from "../../api/students";
import { listFilials } from "../../api/filials";
import { useTenantModules } from "../../context/TenantModulesContext";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
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
import Tabs from "../../components/ui/Tabs";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { formatDateTime } from "../../utils/format";

const PAGE_SIZE = 20;

const VIEW_TABS_KEYS = ["history", "devices"];

const EMPTY_ENTRY_FORM = {
  student_id: "",
  direction: "in",
  event_time: "",
  filial_id: "",
  device_name: "",
};

const EMPTY_DEVICE_FORM = {
  name: "",
  is_active: true,
};

export default function Turnstile() {
  const { t } = useTranslation();
  const { hasPermission } = useTenantModules();
  const canManage = hasPermission("turnstile.manage");

  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const view = VIEW_TABS_KEYS.includes(viewParam) ? viewParam : "history";

  function setView(key) {
    const next = new URLSearchParams(searchParams);
    next.set("view", key);
    setSearchParams(next, { replace: true });
  }

  const VIEW_TABS = [
    { key: "history", label: t("pages.turnstile.tabs.history") },
    { key: "devices", label: t("pages.turnstile.tabs.devices") },
  ];

  // Shared reference data — students and filials feed the filters and the
  // manual-entry form. Capped at 100 like the other admin pages' dropdowns.
  const [students, setStudents] = useState([]);
  const [filials, setFilials] = useState([]);

  // History tab state.
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [studentFilter, setStudentFilter] = useState("");
  const [filialFilter, setFilialFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [entryErrors, setEntryErrors] = useState({});
  const [savingEntry, setSavingEntry] = useState(false);

  // Devices tab state.
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState(EMPTY_DEVICE_FORM);
  const [deviceErrors, setDeviceErrors] = useState({});
  const [savingDevice, setSavingDevice] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Full api_key is returned exactly once (on create) — hold it for the
  // one-time reveal modal, then drop it.
  const [newApiKey, setNewApiKey] = useState(null);

  useEffect(() => {
    listStudents({ page: 1, size: 100 })
      .then((data) => setStudents(data.items))
      .catch(() => setStudents([]));
    listFilials()
      .then(setFilials)
      .catch((error) => {
        if (!isModuleDisabledError(error)) setFilials([]);
      });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [studentFilter, filialFilter, directionFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (view !== "history") return;
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, page, studentFilter, filialFilter, directionFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (view !== "devices") return;
    loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const data = await listEvents({
        page,
        size: PAGE_SIZE,
        student_id: studentFilter || undefined,
        filial_id: filialFilter || undefined,
        direction: directionFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setEvents(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.turnstile.eventsError")));
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadDevices() {
    setLoadingDevices(true);
    try {
      const data = await listDevices();
      setDevices(data.items);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.turnstile.devicesError")));
    } finally {
      setLoadingDevices(false);
    }
  }

  // ---- Manual entry ----
  function openEntryModal() {
    setEntryForm(EMPTY_ENTRY_FORM);
    setEntryErrors({});
    setEntryModalOpen(true);
  }

  function closeEntryModal() {
    if (savingEntry) return;
    setEntryModalOpen(false);
  }

  function handleEntryChange(field) {
    return (event) => setEntryForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleEntrySubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!entryForm.student_id) nextErrors.student_id = t("pages.turnstile.studentError");
    if (!entryForm.direction) nextErrors.direction = t("pages.turnstile.directionError");
    setEntryErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      student_id: entryForm.student_id,
      direction: entryForm.direction,
      event_time: entryForm.event_time || null,
      filial_id: entryForm.filial_id || null,
      device_name: entryForm.device_name.trim() || null,
    };

    setSavingEntry(true);
    try {
      await createEvent(payload);
      toast.success(t("pages.turnstile.entryCreated"));
      setEntryModalOpen(false);
      if (page !== 1) {
        setPage(1);
      } else {
        await loadEvents();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.turnstile.actionError")));
    } finally {
      setSavingEntry(false);
    }
  }

  // ---- Devices ----
  function openCreateDevice() {
    setEditingDevice(null);
    setDeviceForm(EMPTY_DEVICE_FORM);
    setDeviceErrors({});
    setDeviceModalOpen(true);
  }

  function openEditDevice(device) {
    setEditingDevice(device);
    setDeviceForm({ name: device.name, is_active: device.is_active });
    setDeviceErrors({});
    setDeviceModalOpen(true);
  }

  function closeDeviceModal() {
    if (savingDevice) return;
    setDeviceModalOpen(false);
  }

  async function handleDeviceSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!deviceForm.name.trim()) nextErrors.name = t("pages.turnstile.nameError");
    setDeviceErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSavingDevice(true);
    try {
      if (editingDevice) {
        await updateDevice(editingDevice.id, {
          name: deviceForm.name.trim(),
          is_active: deviceForm.is_active,
        });
        toast.success(t("pages.turnstile.deviceUpdated"));
        setDeviceModalOpen(false);
        await loadDevices();
      } else {
        const created = await createDevice({
          name: deviceForm.name.trim(),
          is_active: deviceForm.is_active,
        });
        setDeviceModalOpen(false);
        await loadDevices();
        // The full key lives only in this response — reveal it once.
        setNewApiKey(created.api_key);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.turnstile.actionError")));
    } finally {
      setSavingDevice(false);
    }
  }

  async function handleDeleteDevice() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDevice(deleteTarget.id);
      toast.success(t("pages.turnstile.deviceDeleted"));
      setDeleteTarget(null);
      await loadDevices();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.turnstile.deleteError")));
    } finally {
      setDeleting(false);
    }
  }

  function copyApiKey() {
    if (!newApiKey) return;
    navigator.clipboard?.writeText(newApiKey);
    toast.success(t("pages.turnstile.keyCopied"));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(
    studentFilter || filialFilter || directionFilter || dateFrom || dateTo,
  );

  const columns = [
    {
      key: "student",
      header: t("pages.turnstile.columns.student"),
      truncate: true,
      render: (row) => (
        <span className="flex items-center gap-2">
          <Avatar photoUrl={row.photo_url} name={row.student_full_name} size="sm" zoomOnHover />
          <span className="truncate">{row.student_full_name}</span>
        </span>
      ),
    },
    {
      key: "direction",
      header: t("pages.turnstile.columns.direction"),
      nowrap: true,
      render: (row) =>
        row.direction === "in" ? (
          <Badge variant="success">
            <LogIn size={12} className="mr-1" />
            {t("pages.turnstile.in")}
          </Badge>
        ) : (
          <Badge variant="neutral">
            <LogOut size={12} className="mr-1" />
            {t("pages.turnstile.out")}
          </Badge>
        ),
    },
    {
      key: "event_time",
      header: t("pages.turnstile.columns.time"),
      nowrap: true,
      className: "tabular-nums",
      render: (row) => formatDateTime(row.event_time),
    },
    { key: "device_name", header: t("pages.turnstile.columns.device") },
    { key: "filial_name", header: t("pages.turnstile.columns.filial") },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("nav.turnstile")}>
        {canManage && view === "history" && (
          <Button onClick={openEntryModal}>
            <Plus size={16} />
            {t("pages.turnstile.addManual")}
          </Button>
        )}
        {canManage && view === "devices" && (
          <Button onClick={openCreateDevice}>
            <Plus size={16} />
            {t("pages.turnstile.newDevice")}
          </Button>
        )}
      </PageHeader>

      <Tabs className="mb-4 w-fit" tabs={VIEW_TABS} value={view} onChange={setView} />

      {view === "history" ? (
        <>
          <FilterBar
            onClear={
              hasFilters
                ? () => {
                    setStudentFilter("");
                    setFilialFilter("");
                    setDirectionFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }
                : undefined
            }
          >
            <Select
              label={t("pages.turnstile.columns.student")}
              className="w-full max-w-[240px]"
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
            >
              <option value="">{t("pages.turnstile.allStudents")}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </Select>
            <Select
              label={t("pages.turnstile.columns.filial")}
              className="w-full max-w-[200px]"
              value={filialFilter}
              onChange={(event) => setFilialFilter(event.target.value)}
            >
              <option value="">{t("pages.turnstile.allFilials")}</option>
              {filials.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.name}
                </option>
              ))}
            </Select>
            <Select
              label={t("pages.turnstile.columns.direction")}
              className="w-full max-w-[160px]"
              value={directionFilter}
              onChange={(event) => setDirectionFilter(event.target.value)}
            >
              <option value="">{t("pages.turnstile.allDirections")}</option>
              <option value="in">{t("pages.turnstile.in")}</option>
              <option value="out">{t("pages.turnstile.out")}</option>
            </Select>
            <DateInput
              label={t("pages.turnstile.dateFrom")}
              className="w-full max-w-[170px]"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <DateInput
              label={t("pages.turnstile.dateTo")}
              className="w-full max-w-[170px]"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </FilterBar>

          <Table
            columns={columns}
            data={events}
            loading={loadingEvents}
            rowKey={(row) => row.id}
            emptyState={
              <EmptyState
                icon={DoorOpen}
                title={t("pages.turnstile.emptyHistoryTitle")}
                description={t("pages.turnstile.emptyHistoryDescription")}
              />
            }
          />

          {!loadingEvents && events.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          )}
        </>
      ) : loadingDevices ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="h-11 w-11 flex-shrink-0 rounded-btn bg-surface-sunken" />
                <div className="h-5 w-2/3 rounded bg-surface-sunken" />
              </div>
              <div className="mt-1 h-8 w-full border-t border-line" />
            </Card>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          icon={Router}
          title={t("pages.turnstile.emptyDevicesTitle")}
          description={t("pages.turnstile.emptyDevicesDescription")}
          actionLabel={canManage ? t("pages.turnstile.newDevice") : undefined}
          onAction={canManage ? openCreateDevice : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Card key={device.id} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-btn bg-accent-light/30 text-accent-dark dark:text-accent">
                  <Router size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-fg">{device.name}</h3>
                  {device.api_key_masked && (
                    <span className="font-mono text-xs text-fg-faint">{device.api_key_masked}</span>
                  )}
                </div>
                {canManage && (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <IconButton
                      icon={Pencil}
                      aria-label={t("pages.turnstile.edit")}
                      onClick={() => openEditDevice(device)}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      aria-label={t("pages.turnstile.delete")}
                      onClick={() => setDeleteTarget(device)}
                    />
                  </div>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
                {device.is_active ? (
                  <Badge variant="success">{t("pages.turnstile.active")}</Badge>
                ) : (
                  <Badge variant="neutral">{t("pages.turnstile.inactive")}</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Manual entry modal */}
      <Modal
        open={entryModalOpen}
        onClose={closeEntryModal}
        title={t("pages.turnstile.addManual")}
        footer={
          <>
            <Button variant="secondary" onClick={closeEntryModal} disabled={savingEntry}>
              {t("pages.turnstile.cancel")}
            </Button>
            <Button type="submit" form="turnstile-entry-form" disabled={savingEntry}>
              {savingEntry ? t("pages.turnstile.saving") : t("pages.turnstile.save")}
            </Button>
          </>
        }
      >
        <form
          id="turnstile-entry-form"
          onSubmit={handleEntrySubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Select
            label={t("pages.turnstile.columns.student")}
            name="student_id"
            value={entryForm.student_id}
            onChange={handleEntryChange("student_id")}
            error={entryErrors.student_id}
          >
            <option value="">{t("pages.turnstile.selectStudent")}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name}
              </option>
            ))}
          </Select>
          <Select
            label={t("pages.turnstile.columns.direction")}
            name="direction"
            value={entryForm.direction}
            onChange={handleEntryChange("direction")}
            error={entryErrors.direction}
          >
            <option value="in">{t("pages.turnstile.in")}</option>
            <option value="out">{t("pages.turnstile.out")}</option>
          </Select>
          <Input
            label={t("pages.turnstile.time")}
            name="event_time"
            type="datetime-local"
            value={entryForm.event_time}
            onChange={handleEntryChange("event_time")}
          />
          <Select
            label={t("pages.turnstile.columns.filial")}
            name="filial_id"
            value={entryForm.filial_id}
            onChange={handleEntryChange("filial_id")}
          >
            <option value="">{t("pages.turnstile.filialOptional")}</option>
            {filials.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.name}
              </option>
            ))}
          </Select>
          <Input
            label={t("pages.turnstile.deviceName")}
            name="device_name"
            value={entryForm.device_name}
            onChange={handleEntryChange("device_name")}
          />
        </form>
      </Modal>

      {/* Device create/edit modal */}
      <Modal
        open={deviceModalOpen}
        onClose={closeDeviceModal}
        title={editingDevice ? t("pages.turnstile.editDevice") : t("pages.turnstile.newDevice")}
        footer={
          <>
            <Button variant="secondary" onClick={closeDeviceModal} disabled={savingDevice}>
              {t("pages.turnstile.cancel")}
            </Button>
            <Button type="submit" form="turnstile-device-form" disabled={savingDevice}>
              {savingDevice ? t("pages.turnstile.saving") : t("pages.turnstile.save")}
            </Button>
          </>
        }
      >
        <form
          id="turnstile-device-form"
          onSubmit={handleDeviceSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label={t("pages.turnstile.deviceName")}
            name="name"
            value={deviceForm.name}
            onChange={(event) =>
              setDeviceForm((prev) => ({ ...prev, name: event.target.value }))
            }
            error={deviceErrors.name}
          />
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={deviceForm.is_active}
              onChange={() =>
                setDeviceForm((prev) => ({ ...prev, is_active: !prev.is_active }))
              }
            />
            <span className="text-sm text-fg-secondary">{t("pages.turnstile.active")}</span>
          </div>
        </form>
      </Modal>

      {/* One-time api_key reveal modal */}
      <Modal
        open={Boolean(newApiKey)}
        onClose={() => setNewApiKey(null)}
        title={t("pages.turnstile.apiKeyTitle")}
        footer={<Button onClick={() => setNewApiKey(null)}>{t("pages.turnstile.understood")}</Button>}
      >
        <div className="flex items-center gap-3 rounded-btn bg-surface-sunken p-4">
          <code className="flex-1 break-all font-mono text-sm text-fg">{newApiKey}</code>
          <IconButton icon={Copy} aria-label={t("pages.turnstile.copyKey")} onClick={copyApiKey} />
        </div>
        <p className="mt-2 text-sm text-fg-muted">{t("pages.turnstile.apiKeyWarning")}</p>
      </Modal>

      {/* Delete device confirm modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("pages.turnstile.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("pages.turnstile.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDeleteDevice} disabled={deleting}>
              {deleting ? t("pages.turnstile.deleting") : t("pages.turnstile.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <Trans
            i18nKey="pages.turnstile.deleteConfirm"
            values={{ name: deleteTarget?.name }}
            components={{ strong: <span className="font-medium text-fg" /> }}
          />
        </p>
      </Modal>
    </div>
  );
}
