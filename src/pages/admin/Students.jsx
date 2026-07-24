import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Building2, Pencil, Plus, Search, Trash2, Users, UsersRound } from "lucide-react";
import {
  createStudent,
  deleteStudent,
  listStudents,
  updateStudent,
  uploadStudentPhoto,
} from "../../api/students";
import { listFilials } from "../../api/filials";
import { addStudentToGroup, listGroups } from "../../api/groups";
import { useTelegramLinkedMap } from "../../hooks/useTelegramLinkedMap";
import Avatar from "../../components/ui/Avatar";
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
import StatCard from "../../components/ui/StatCard";
import StatGrid from "../../components/ui/StatGrid";
import Table from "../../components/ui/Table";
import Tabs from "../../components/ui/Tabs";
import Toggle from "../../components/ui/Toggle";
import { toast } from "../../components/ui/Toast";
import { activeVariant, linkedVariant } from "../../constants/status";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import StudentLeadsBoard from "../../components/students/StudentLeadsBoard";

const PAGE_SIZE = 20;

const VALID_TABS = ["students", "leads"];

const EMPTY_FORM = {
  full_name: "",
  birth_date: "",
  parent_name: "",
  parent_phone: "",
  filial_id: "",
  group_id: "",
  joined_mid_month: false,
  joined_date: "",
};

export default function Students() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { telegramLinkedMap, telegramBotEnabled } = useTelegramLinkedMap();

  // Tab lives in the URL so a reload or a shared link (e.g. Marketing's
  // "?tab=leads&post_id=...") lands on the same view.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : "students";

  const [leadModalOpen, setLeadModalOpen] = useState(false);

  function setActiveTab(key) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: true });
  }

  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filials, setFilials] = useState([]);
  const filialMap = useMemo(
    () => Object.fromEntries(filials.map((f) => [f.id, f.name])),
    [filials],
  );

  const [groups, setGroups] = useState([]);
  // Real backend total, not `groups.length` — the fetch below caps at 100
  // items for the filter dropdown, but the total count must stay honest.
  const [groupsTotal, setGroupsTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filialFilter, setFilialFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.students.filialsError")));
        }
      });
    listGroups({ page: 1, size: 100 })
      .then((data) => {
        setGroups(data.items);
        setGroupsTotal(data.total);
      })
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    if (location.state?.prefill) {
      setEditingStudent(null);
      setForm({ ...EMPTY_FORM, ...location.state.prefill });
      setErrors({});
      setPhotoFile(null);
      setPhotoPreview(null);
      setModalOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, filialFilter, groupFilter]);

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filialFilter, groupFilter]);

  async function loadStudents() {
    setLoading(true);
    try {
      const data = await listStudents({
        page,
        size: PAGE_SIZE,
        search: search || undefined,
        filial_id: filialFilter || undefined,
        group_id: groupFilter || undefined,
      });
      setStudents(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.students.listError")));
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(null);
    setModalOpen(true);
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setForm({
      full_name: student.full_name,
      birth_date: student.birth_date || "",
      parent_name: student.parent_name || "",
      parent_phone: student.parent_phone || "",
      filial_id: student.filial_id,
      group_id: "",
    });
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(student.photo_url || null);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = t("pages.students.nameError");
    if (!form.filial_id) nextErrors.filial_id = t("pages.students.filialError");
    // The checkbox is meaningless without a date, and sending none would
    // silently fall back to today — the opposite of what the user asked for.
    if (form.joined_mid_month && !form.joined_date) {
      nextErrors.joined_date = t("pages.students.joinedDateError");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      full_name: form.full_name.trim(),
      filial_id: form.filial_id,
      birth_date: form.birth_date || null,
      parent_name: form.parent_name.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
    };

    setSubmitting(true);
    try {
      let studentId = editingStudent?.id;
      if (editingStudent) {
        await updateStudent(editingStudent.id, payload);
      } else {
        const created = await createStudent(payload);
        studentId = created.id;
      }

      if (photoFile && studentId) {
        await uploadStudentPhoto(studentId, photoFile);
      }

      if (!editingStudent && form.group_id && studentId) {
        try {
          await addStudentToGroup(
            form.group_id,
            studentId,
            form.joined_mid_month ? form.joined_date : undefined
          );
        } catch (error) {
          toast.error(getErrorMessage(error, t("pages.students.addToGroupError")));
        }
      }

      toast.success(editingStudent ? t("pages.students.updateSuccess") : t("pages.students.createSuccess"));
      setModalOpen(false);
      await loadStudents();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.students.actionError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      toast.success(t("pages.students.deleteSuccess"));
      setDeleteTarget(null);
      await loadStudents();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.students.deleteError")));
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search || filialFilter || groupFilter);

  const columns = [
    {
      // Photo and name read as one identity unit rather than two separate
      // columns — the row's "who" at a glance.
      key: "student",
      header: t("pages.students.columns.fullName"),
      truncate: true,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar photoUrl={row.photo_url} name={row.full_name} size="md" zoomOnHover />
          <span className="truncate font-medium text-fg" title={row.full_name}>
            {row.full_name}
          </span>
        </div>
      ),
    },
    { key: "parent_phone", header: t("pages.students.columns.phone"), nowrap: true },
    {
      key: "filial",
      header: t("nav.filials"),
      truncate: true,
      render: (row) => filialMap[row.filial_id],
    },
    {
      key: "status",
      header: t("pages.students.columns.status"),
      nowrap: true,
      render: (row) => (
        <Badge variant={activeVariant(row.is_active)}>
          {row.is_active ? t("status.active") : t("status.inactive")}
        </Badge>
      ),
    },
    ...(telegramBotEnabled
      ? [
          {
            key: "telegram_status",
            header: t("pages.students.columns.botStatus"),
            nowrap: true,
            render: (row) => (
              <Badge variant={linkedVariant(telegramLinkedMap[row.id])}>
                {telegramLinkedMap[row.id] ? t("status.linked") : t("status.unlinked")}
              </Badge>
            ),
          },
        ]
      : []),
    {
      key: "actions",
      header: t("pages.students.columns.actions"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton icon={Pencil} aria-label={t("pages.students.edit")} onClick={() => openEditModal(row)} />
          <IconButton
            icon={Trash2}
            tone="danger"
            aria-label={t("pages.students.delete")}
            onClick={() => setDeleteTarget(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <PageHeader title={t("nav.students")}>
        {activeTab === "students" && (
          <>
            <span className="text-sm tabular-nums text-fg-muted">
              {t("common.recordsCount", { count: total })}
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                setActiveTab("leads");
                setLeadModalOpen(true);
              }}
            >
              <Plus size={16} />
              {t("pages.students.addAsLead")}
            </Button>
            <Button onClick={openCreateModal}>
              <Plus size={16} />
              {t("pages.students.newStudent")}
            </Button>
          </>
        )}
        {activeTab === "leads" && (
          <Button onClick={() => setLeadModalOpen(true)}>
            <Plus size={16} />
            {t("pages.students.newLead")}
          </Button>
        )}
      </PageHeader>

      <StatGrid className="mb-6" count={3}>
        <StatCard
          icon={Users}
          variant="blue"
          label={t("stu.stats.totalStudents")}
          value={total}
        />
        <StatCard
          icon={UsersRound}
          variant="purple"
          label={t("stu.stats.totalGroups")}
          value={groupsTotal}
        />
        <StatCard
          icon={Building2}
          label={t("stu.stats.totalFilials")}
          value={filials.length}
        />
      </StatGrid>

      <Tabs
        className="mb-4 w-fit"
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: "students", label: t("pages.students.tabs.students") },
          { key: "leads", label: t("pages.students.tabs.leads") },
        ]}
      />

      {activeTab === "leads" ? (
        <StudentLeadsBoard
          modalOpen={leadModalOpen}
          onOpenModal={() => setLeadModalOpen(true)}
          onCloseModal={() => setLeadModalOpen(false)}
        />
      ) : (
        <>
          <FilterBar
        onClear={
          hasFilters
            ? () => {
                setSearchInput("");
                setFilialFilter("");
                setGroupFilter("");
              }
            : undefined
        }
      >
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          <label htmlFor="student-search" className="text-sm font-medium text-fg-secondary">
            {t("pages.students.search")}
          </label>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
            />
            <Input
              id="student-search"
              className="w-full pl-9"
              placeholder={t("pages.students.searchPlaceholder")}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>
        <Select
          label={t("nav.filials")}
          className="w-full max-w-[220px]"
          value={filialFilter}
          onChange={(event) => setFilialFilter(event.target.value)}
        >
          <option value="">{t("pages.students.allFilials")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("pages.students.group")}
          className="w-full max-w-[220px]"
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          <option value="">{t("pages.students.allGroups")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
      </FilterBar>

      <Table
        columns={columns}
        data={students}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Users}
            title={hasFilters ? t("pages.students.noSearchResultsTitle") : t("pages.students.emptyTitle")}
            description={
              hasFilters
                ? t("pages.students.noSearchResultsDescription")
                : t("pages.students.emptyDescription")
            }
            actionLabel={hasFilters ? undefined : t("pages.students.newStudent")}
            onAction={hasFilters ? undefined : openCreateModal}
          />
        }
      />

      {!loading && students.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title={editingStudent ? t("pages.students.editTitle") : t("pages.students.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("pages.students.cancel")}
            </Button>
            <Button type="submit" form="student-form" disabled={submitting}>
              {submitting ? t("pages.students.saving") : t("pages.students.save")}
            </Button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
              {photoPreview ? (
                <img src={photoPreview} alt={t("pages.students.photoAlt")} className="h-full w-full object-cover" />
              ) : (
                <Users size={24} className="text-fg-faint" />
              )}
            </span>
            <label className="inline-flex cursor-pointer items-center rounded-btn border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-sunken">
              {t("pages.students.choosePhoto")}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>

          <Input
            label={t("pages.students.name")}
            name="full_name"
            value={form.full_name}
            onChange={handleChange("full_name")}
            error={errors.full_name}
          />
          <DateInput
            label={t("pages.students.birthDate")}
            name="birth_date"
            value={form.birth_date}
            onChange={handleChange("birth_date")}
          />
          <Input
            label={t("pages.students.parentName")}
            name="parent_name"
            value={form.parent_name}
            onChange={handleChange("parent_name")}
          />
          <Input
            label={t("pages.students.parentPhone")}
            name="parent_phone"
            type="tel"
            placeholder="+998901234567"
            value={form.parent_phone}
            onChange={handleChange("parent_phone")}
          />
          <Select
            label={t("nav.filials")}
            name="filial_id"
            value={form.filial_id}
            onChange={handleChange("filial_id")}
            error={errors.filial_id}
          >
            <option value="">{t("pages.students.selectFilial")}</option>
            {filials.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.name}
              </option>
            ))}
          </Select>
          {!editingStudent && groups.length > 0 && (
            <Select
              label={t("pages.students.addToGroupOptional")}
              name="group_id"
              value={form.group_id}
              onChange={handleChange("group_id")}
            >
              <option value="">{t("pages.students.groupNotSelected")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          )}
          {!editingStudent && form.group_id && (
            <div className="md:col-span-2">
              <Toggle
                checked={form.joined_mid_month}
                onChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    joined_mid_month: checked,
                    joined_date: checked ? prev.joined_date : "",
                  }))
                }
                label={t("pages.students.joinedMidMonth")}
                description={t("pages.students.joinedMidMonthHint")}
              />
              {form.joined_mid_month && (
                <>
                  <DateInput
                    label={t("pages.students.joinedDate")}
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.joined_date}
                    onChange={handleChange("joined_date")}
                    error={errors.joined_date}
                  />
                  {form.joined_date && (
                    <p className="mt-1.5 text-xs text-fg-muted">
                      {t("pages.students.joinedDateEffect")}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("pages.students.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("pages.students.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("pages.students.deleting") : t("pages.students.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <Trans
            i18nKey="pages.students.deleteConfirm"
            values={{ name: deleteTarget?.full_name }}
            components={{ strong: <span className="font-medium text-fg" /> }}
          />
        </p>
      </Modal>
        </>
      )}
    </div>
  );
}
