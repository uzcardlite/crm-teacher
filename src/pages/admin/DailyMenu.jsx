import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { createMenu, deleteMenu, listMenus, updateMenu } from "../../api/menu";
import { listFilials } from "../../api/filials";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import IconButton from "../../components/ui/IconButton";
import DateInput from "../../components/ui/DateInput";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { useTenantModules } from "../../context/TenantModulesContext";
import { formatDate } from "../../utils/format";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  date: "",
  filial_id: "",
  items: "",
  note: "",
};

export default function DailyMenu() {
  const { t } = useTranslation();
  const { hasPermission } = useTenantModules();

  const [filials, setFilials] = useState([]);
  const [filialFilter, setFilialFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
    listFilials()
      .then((res) => setFilials(res))
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.dailyMenu.listError")));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filialFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filialFilter, dateFrom, dateTo]);

  async function loadMenus() {
    setLoading(true);
    try {
      const res = await listMenus({
        page,
        size: PAGE_SIZE,
        filial_id: filialFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setData(res.items);
      setTotal(res.total);
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.dailyMenu.listError")));
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
      date: row.date ?? "",
      filial_id: row.filial_id ?? "",
      items: row.items ?? "",
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
    if (!form.date) nextErrors.date = t("pages.dailyMenu.dateRequired");
    if (!form.items.trim()) nextErrors.items = t("pages.dailyMenu.itemsRequired");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      date: form.date,
      filial_id: form.filial_id || null,
      items: form.items,
      note: form.note.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateMenu(editing.id, payload);
      } else {
        await createMenu(payload);
      }
      toast.success(editing ? t("pages.dailyMenu.updateSuccess") : t("pages.dailyMenu.createSuccess"));
      setModalOpen(false);
      await loadMenus();
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.dailyMenu.actionError")));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMenu(deleteTarget.id);
      toast.success(t("pages.dailyMenu.deleteSuccess"));
      setDeleteTarget(null);
      await loadMenus();
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.dailyMenu.deleteError")));
      }
    } finally {
      setDeleting(false);
    }
  }

  function clearFilters() {
    setFilialFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters = Boolean(filialFilter || dateFrom || dateTo);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canUpdate = hasPermission("daily_menu.update");
  const canDelete = hasPermission("daily_menu.delete");
  const canCreate = hasPermission("daily_menu.create");

  const columns = [
    {
      key: "date",
      header: t("pages.dailyMenu.columns.date"),
      nowrap: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: "filial",
      header: t("pages.dailyMenu.columns.filial"),
      truncate: true,
      render: (row) =>
        row.filial_id == null ? (
          <Badge variant="info">{t("pages.dailyMenu.generalBadge")}</Badge>
        ) : (
          row.filial_name
        ),
    },
    { key: "items", header: t("pages.dailyMenu.columns.items"), truncate: true },
    { key: "note", header: t("pages.dailyMenu.columns.note"), truncate: true },
  ];

  if (canUpdate || canDelete) {
    columns.push({
      key: "actions",
      header: t("pages.dailyMenu.columns.actions"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <IconButton
              icon={Pencil}
              aria-label={t("pages.dailyMenu.edit")}
              onClick={() => openEditModal(row)}
            />
          )}
          {canDelete && (
            <IconButton
              icon={Trash2}
              tone="danger"
              aria-label={t("pages.dailyMenu.delete")}
              onClick={() => setDeleteTarget(row)}
            />
          )}
        </div>
      ),
    });
  }

  return (
    <div className="p-6">
      <PageHeader title={t("nav.dailyMenu")}>
        {canCreate && (
          <Button onClick={openCreateModal}>
            <Plus size={16} />
            {t("pages.dailyMenu.newMenu")}
          </Button>
        )}
      </PageHeader>

      <FilterBar onClear={hasFilters ? clearFilters : undefined}>
        <Select
          label={t("pages.dailyMenu.columns.filial")}
          className="w-full max-w-[240px]"
          value={filialFilter}
          onChange={(event) => setFilialFilter(event.target.value)}
        >
          <option value="">{t("pages.dailyMenu.allFilials")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <DateInput
          label={t("pages.dailyMenu.dateFrom")}
          className="w-full max-w-[180px]"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
        />
        <DateInput
          label={t("pages.dailyMenu.dateTo")}
          className="w-full max-w-[180px]"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
        />
      </FilterBar>

      <Table
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={UtensilsCrossed}
            title={hasFilters ? t("pages.dailyMenu.emptyFilteredTitle") : t("pages.dailyMenu.emptyTitle")}
            description={
              hasFilters
                ? t("pages.dailyMenu.emptyFilteredDescription")
                : t("pages.dailyMenu.emptyDescription")
            }
            actionLabel={!hasFilters && canCreate ? t("pages.dailyMenu.newMenu") : undefined}
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
        title={editing ? t("pages.dailyMenu.editTitle") : t("pages.dailyMenu.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("pages.dailyMenu.cancel")}
            </Button>
            <Button type="submit" form="menu-form" disabled={submitting}>
              {submitting ? t("pages.dailyMenu.saving") : t("pages.dailyMenu.save")}
            </Button>
          </>
        }
      >
        <form id="menu-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <DateInput
            label={t("pages.dailyMenu.columns.date")}
            name="date"
            value={form.date}
            onChange={handleChange("date")}
            error={errors.date}
          />
          <Select
            label={t("pages.dailyMenu.filial")}
            name="filial_id"
            value={form.filial_id}
            onChange={handleChange("filial_id")}
          >
            <option value="">{t("pages.dailyMenu.allFilialsGeneral")}</option>
            {filials.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.name}
              </option>
            ))}
          </Select>
          <Textarea
            label={t("pages.dailyMenu.items")}
            name="items"
            value={form.items}
            onChange={handleChange("items")}
            placeholder={t("pages.dailyMenu.itemsPlaceholder")}
            error={errors.items}
          />
          <Textarea
            label={t("pages.dailyMenu.note")}
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
        title={t("pages.dailyMenu.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("pages.dailyMenu.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("pages.dailyMenu.deleting") : t("pages.dailyMenu.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <Trans
            i18nKey="pages.dailyMenu.deleteConfirm"
            values={{
              date: formatDate(deleteTarget?.date),
              filial: deleteTarget?.filial_name ?? t("pages.dailyMenu.generalBadge"),
            }}
            components={{ strong: <span className="font-medium text-fg" /> }}
          />
        </p>
      </Modal>
    </div>
  );
}
