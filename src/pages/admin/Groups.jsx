import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Building2,
  Clock,
  Pencil,
  Plus,
  Trash2,
  User,
  UserPlus,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import {
  addStudentsToGroupBulk,
  createGroup,
  deleteGroup,
  listGroupStudents,
  listGroups,
  removeStudentFromGroup,
  updateGroup,
} from "../../api/groups";
import { listFilials } from "../../api/filials";
import { listRooms, createRoom } from "../../api/rooms";
import { listAcademicYears } from "../../api/academicYears";
import { listTeachers, createTeacher } from "../../api/teachers";
import { listStudents } from "../../api/students";
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
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { capacityVariant } from "../../constants/status";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { cn } from "../../utils/cn";
import { colorForGroup } from "../../utils/groupColor";

const PAGE_SIZE = 12;

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const EMPTY_FORM = {
  name: "",
  filial_id: "",
  room_id: "",
  academic_year_id: "",
  teacher_id: "",
  price_per_month: "",
  capacity: "",
  scheduleDays: [],
  scheduleTime: "",
};

function formatSchedule(schedule, t, dayLabels) {
  if (!schedule || !Array.isArray(schedule.days) || schedule.days.length === 0) {
    return t("pages.groups.noSchedule");
  }
  const days = schedule.days.map((d) => dayLabels[d] || d).join(", ");
  return schedule.time ? `${days} • ${schedule.time}` : days;
}

function formatPrice(value, t) {
  if (value === null || value === undefined) return t("pages.groups.notSet");
  return t("pages.groups.priceValue", { value: Number(value).toLocaleString("uz-UZ") });
}

// The four icon+text lines inside a group card share one shape.
function MetaRow({ icon: Icon, children, strong = false }) {
  return (
    <div className="flex items-center gap-2 text-sm text-fg-muted">
      <Icon size={14} className="flex-shrink-0 text-fg-faint" />
      <span className={cn("truncate", strong && "font-medium text-fg")}>{children}</span>
    </div>
  );
}

// Wraps a group-form Select with a header row carrying an inline "+" toggle,
// so a missing room/teacher can be created without leaving the modal.
function FieldWithAdd({ label, open, onToggle, addLabel, disabled, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-fg-secondary">{label}</label>
        <IconButton
          icon={open ? X : Plus}
          tone="accent"
          aria-label={addLabel}
          onClick={onToggle}
          disabled={disabled}
        />
      </div>
      {children}
    </div>
  );
}

export default function Groups() {
  const { t } = useTranslation();
  const DAYS = DAY_KEYS.map((key) => ({ key, label: t(`pages.groups.days.${key}`) }));
  const DAY_LABELS = Object.fromEntries(DAYS.map((d) => [d.key, d.label]));
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filials, setFilials] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const filialMap = useMemo(
    () => Object.fromEntries(filials.map((f) => [f.id, f.name])),
    [filials],
  );

  const [filialFilter, setFilialFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Inline "quick add" panels nested inside the group modal.
  const [roomQuickOpen, setRoomQuickOpen] = useState(false);
  const [roomQuickName, setRoomQuickName] = useState("");
  const [roomQuickSaving, setRoomQuickSaving] = useState(false);

  const [teacherQuickOpen, setTeacherQuickOpen] = useState(false);
  const [teacherQuickForm, setTeacherQuickForm] = useState({
    full_name: "",
    phone: "",
    subject: "",
    filial_id: "",
    salary_type: "fixed",
    salary_amount: "",
  });
  const [teacherQuickSaving, setTeacherQuickSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [detailGroup, setDetailGroup] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [groupStudentsLoading, setGroupStudentsLoading] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [joinedDateToAdd, setJoinedDateToAdd] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState(null);

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.groups.filialsError")));
        }
      });
    listAcademicYears()
      .then(setAcademicYears)
      .catch((error) => toast.error(getErrorMessage(error, t("pages.groups.academicYearsError"))));
    listTeachers({ size: 100 })
      .then((data) => setTeachers(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.groups.teachersError"))));
  }, []);

  // Load rooms for the filial selected inside the modal; clears when no filial.
  useEffect(() => {
    if (!modalOpen || !form.filial_id) {
      setRooms([]);
      return;
    }
    listRooms({ filial_id: form.filial_id })
      .then(setRooms)
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.groups.roomsError")));
        }
      });
  }, [modalOpen, form.filial_id]);

  useEffect(() => {
    setPage(1);
  }, [filialFilter, academicYearFilter]);

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filialFilter, academicYearFilter]);

  async function loadGroups() {
    setLoading(true);
    try {
      const data = await listGroups({
        page,
        size: PAGE_SIZE,
        filial_id: filialFilter || undefined,
        academic_year_id: academicYearFilter || undefined,
      });
      setGroups(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.groups.listError")));
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingGroup(null);
    setForm(EMPTY_FORM);
    setErrors({});
    closeRoomQuick();
    closeTeacherQuick();
    setModalOpen(true);
  }

  function openEditModal(group) {
    setEditingGroup(group);
    setForm({
      name: group.name,
      filial_id: group.filial_id,
      room_id: group.room_id || "",
      academic_year_id: group.academic_year_id,
      teacher_id: group.teacher_id || "",
      price_per_month: group.price_per_month ?? "",
      capacity: group.capacity ?? "",
      scheduleDays: group.schedule?.days || [],
      scheduleTime: group.schedule?.time || "",
    });
    setErrors({});
    closeRoomQuick();
    closeTeacherQuick();
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  // Changing the filial invalidates the current room (rooms belong to a filial).
  function handleFilialChange(event) {
    const filial_id = event.target.value;
    setForm((prev) => ({ ...prev, filial_id, room_id: "" }));
  }

  // --- Inline room quick-add ---
  function toggleRoomQuick() {
    setRoomQuickOpen((prev) => {
      const next = !prev;
      if (next) setRoomQuickName("");
      return next;
    });
  }

  function closeRoomQuick() {
    setRoomQuickOpen(false);
    setRoomQuickName("");
  }

  async function handleRoomQuickSave() {
    if (roomQuickSaving) return;
    const name = roomQuickName.trim();
    if (!name) {
      toast.error(t("grp.inlineRoom.nameError"));
      return;
    }
    setRoomQuickSaving(true);
    try {
      const room = await createRoom({ name, filial_id: form.filial_id });
      setRooms((prev) => [...prev, room]);
      setForm((f) => ({ ...f, room_id: room.id }));
      closeRoomQuick();
      toast.success(t("grp.inlineRoom.created"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("grp.inlineRoom.error")));
    } finally {
      setRoomQuickSaving(false);
    }
  }

  // --- Inline teacher quick-add ---
  function toggleTeacherQuick() {
    setTeacherQuickOpen((prev) => {
      const next = !prev;
      if (next) {
        setTeacherQuickForm({
          full_name: "",
          phone: "",
          subject: "",
          filial_id: form.filial_id || filials[0]?.id || "",
          salary_type: "fixed",
          salary_amount: "",
        });
      }
      return next;
    });
  }

  function closeTeacherQuick() {
    setTeacherQuickOpen(false);
    setTeacherQuickForm({
      full_name: "",
      phone: "",
      subject: "",
      filial_id: "",
      salary_type: "fixed",
      salary_amount: "",
    });
  }

  function handleTeacherQuickChange(field) {
    return (event) =>
      setTeacherQuickForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleTeacherQuickSave() {
    if (teacherQuickSaving) return;
    const { full_name, phone, subject, filial_id, salary_type, salary_amount } =
      teacherQuickForm;
    if (!full_name.trim()) {
      toast.error(t("grp.inlineTeacher.nameError"));
      return;
    }
    if (salary_amount === "" || Number(salary_amount) <= 0) {
      toast.error(t("grp.inlineTeacher.salaryError"));
      return;
    }
    if (!filial_id) {
      toast.error(t("grp.inlineTeacher.filialError"));
      return;
    }
    setTeacherQuickSaving(true);
    try {
      const teacher = await createTeacher({
        full_name: full_name.trim(),
        filial_id,
        salary_type,
        salary_amount: Number(salary_amount),
        phone: phone.trim() || null,
        subject: subject.trim() || null,
      });
      setTeachers((prev) => [...prev, teacher]);
      setForm((f) => ({ ...f, teacher_id: teacher.id }));
      closeTeacherQuick();
      toast.success(t("grp.inlineTeacher.created"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("grp.inlineTeacher.error")));
    } finally {
      setTeacherQuickSaving(false);
    }
  }

  function toggleScheduleDay(dayKey) {
    setForm((prev) => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(dayKey)
        ? prev.scheduleDays.filter((d) => d !== dayKey)
        : [...prev.scheduleDays, dayKey],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t("pages.groups.nameError");
    if (!form.filial_id) nextErrors.filial_id = t("pages.groups.filialError");
    if (!form.academic_year_id) nextErrors.academic_year_id = t("pages.groups.academicYearError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      filial_id: form.filial_id,
      room_id: form.room_id || null,
      academic_year_id: form.academic_year_id,
      teacher_id: form.teacher_id || null,
      price_per_month: form.price_per_month === "" ? null : form.price_per_month,
      capacity: form.capacity === "" ? null : Number(form.capacity),
      schedule: form.scheduleDays.length > 0
        ? { days: form.scheduleDays, time: form.scheduleTime || null }
        : null,
    };

    setSubmitting(true);
    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, payload);
      } else {
        await createGroup(payload);
      }
      toast.success(editingGroup ? t("pages.groups.updateSuccess") : t("pages.groups.createSuccess"));
      setModalOpen(false);
      await loadGroups();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.groups.actionError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGroup(deleteTarget.id);
      toast.success(t("pages.groups.deleteSuccess"));
      setDeleteTarget(null);
      await loadGroups();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.groups.deleteError")));
    } finally {
      setDeleting(false);
    }
  }

  async function openDetailModal(group) {
    setDetailGroup(group);
    setSelectedStudentIds([]);
    setGroupStudentsLoading(true);
    try {
      const [students, allStudentsData] = await Promise.all([
        listGroupStudents(group.id),
        listStudents({ page: 1, size: 100 }),
      ]);
      setGroupStudents(students);
      setAllStudents(allStudentsData.items);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.groups.studentsLoadError")));
    } finally {
      setGroupStudentsLoading(false);
    }
  }

  function closeDetailModal() {
    setDetailGroup(null);
    setGroupStudents([]);
    setAllStudents([]);
  }

  const capacityFull =
    detailGroup?.capacity != null && detailGroup.current_students_count >= detailGroup.capacity;

  const availableStudents = useMemo(() => {
    const activeIds = new Set(groupStudents.map((s) => s.student_id));
    return allStudents.filter((s) => !activeIds.has(s.id));
  }, [allStudents, groupStudents]);

  function updateGroupCountEverywhere(groupId, delta) {
    setDetailGroup((prev) =>
      prev ? { ...prev, current_students_count: Math.max(0, prev.current_students_count + delta) } : prev,
    );
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, current_students_count: Math.max(0, g.current_students_count + delta) }
          : g,
      ),
    );
  }

  function toggleStudentSelection(studentId) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  }

  async function handleAddStudents() {
    if (selectedStudentIds.length === 0 || !detailGroup) return;
    setAddingStudent(true);
    try {
      const result = await addStudentsToGroupBulk(
        detailGroup.id,
        selectedStudentIds,
        joinedDateToAdd || undefined,
      );
      if (result.added.length > 0) {
        setGroupStudents((prev) => [...prev, ...result.added]);
        // The count only moves by the students that were actually enrolled,
        // not by how many were selected -- some may already be in the group.
        updateGroupCountEverywhere(detailGroup.id, result.total_added);
      }
      setSelectedStudentIds([]);
      setJoinedDateToAdd("");

      if (result.total_added === 0) {
        toast.error(t("grp.addStudents.allAlreadyActive"));
      } else if (result.already_active.length > 0) {
        toast.success(
          t("grp.addStudents.addedWithSkipped", {
            added: result.total_added,
            skipped: result.already_active.length,
          }),
        );
      } else {
        toast.success(t("grp.addStudents.added", { count: result.total_added }));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.groups.studentAddError")));
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleRemoveStudent(studentId) {
    if (!detailGroup) return;
    setRemovingStudentId(studentId);
    try {
      await removeStudentFromGroup(detailGroup.id, studentId);
      setGroupStudents((prev) => prev.filter((s) => s.student_id !== studentId));
      updateGroupCountEverywhere(detailGroup.id, -1);
      toast.success(t("pages.groups.studentRemoved"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.groups.studentRemoveError")));
    } finally {
      setRemovingStudentId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(filialFilter || academicYearFilter);

  return (
    <div className="p-6">
      <PageHeader title={t("nav.groups")}>
        <span className="text-sm tabular-nums text-fg-muted">
          {t("common.recordsCount", { count: total })}
        </span>
        <Button onClick={openCreateModal}>
          <Plus size={16} />
          {t("pages.groups.newGroup")}
        </Button>
      </PageHeader>

      <FilterBar
        onClear={
          hasFilters
            ? () => {
                setFilialFilter("");
                setAcademicYearFilter("");
              }
            : undefined
        }
      >
        <Select
          label={t("nav.filials")}
          className="w-full max-w-[220px]"
          value={filialFilter}
          onChange={(event) => setFilialFilter(event.target.value)}
        >
          <option value="">{t("pages.groups.allFilials")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("pages.groups.academicYear")}
          className="w-full max-w-[220px]"
          value={academicYearFilter}
          onChange={(event) => setAcademicYearFilter(event.target.value)}
        >
          <option value="">{t("pages.groups.allAcademicYears")}</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </Select>
      </FilterBar>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={hasFilters ? t("pages.groups.noFilterResultsTitle") : t("pages.groups.emptyTitle")}
          description={
            hasFilters
              ? t("pages.groups.noFilterResultsDescription")
              : t("pages.groups.emptyDescription")
          }
          actionLabel={hasFilters ? undefined : t("pages.groups.newGroup")}
          onAction={hasFilters ? undefined : openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const full = group.capacity != null && group.current_students_count >= group.capacity;
            // Each group keeps a stable colour derived from its id, so the
            // same group is recognisable at a glance here and on the Schedule
            // board rather than colour being a random decoration.
            const color = colorForGroup(group.id);
            const capacityPct =
              group.capacity != null && group.capacity > 0
                ? Math.min(100, Math.round((group.current_students_count / group.capacity) * 100))
                : null;
            const variant = capacityVariant(group.current_students_count, group.capacity);
            return (
              <Card
                key={group.id}
                hoverable
                padding="p-0"
                className="flex cursor-pointer flex-col overflow-hidden"
                onClick={() => openDetailModal(group)}
              >
                <div className={cn("h-1.5 w-full", color.bg)} aria-hidden="true" />
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn",
                          color.bg,
                          color.text,
                        )}
                      >
                        <UsersRound size={18} />
                      </div>
                      <h3 className="truncate text-base font-semibold text-fg">{group.name}</h3>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <IconButton
                        icon={Pencil}
                        aria-label={t("pages.groups.edit")}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(group);
                        }}
                      />
                      <IconButton
                        icon={Trash2}
                        tone="danger"
                        aria-label={t("pages.groups.delete")}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(group);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <MetaRow icon={User}>
                      {group.teacher_name || t("pages.schedule.noTeacherAssigned")}
                    </MetaRow>
                    <MetaRow icon={Clock}>{formatSchedule(group.schedule, t, DAY_LABELS)}</MetaRow>
                    <MetaRow icon={Wallet} strong>
                      {formatPrice(group.price_per_month, t)}
                    </MetaRow>
                    <MetaRow icon={Building2}>{filialMap[group.filial_id] || "—"}</MetaRow>
                  </div>

                  <div className="mt-1">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <UsersRound size={14} className="text-fg-faint" />
                        <span className="font-medium tabular-nums text-fg">
                          {group.current_students_count}
                          {group.capacity != null ? ` / ${group.capacity}` : ""}
                        </span>
                      </div>
                      {full && <Badge variant={variant}>{t("status.full")}</Badge>}
                    </div>
                    {capacityPct != null && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <div
                          className={cn(
                            "h-full rounded-full transition-colors",
                            variant === "warning" ? "bg-accent" : "bg-success",
                          )}
                          style={{ width: `${capacityPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && groups.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title={editingGroup ? t("pages.groups.editTitle") : t("pages.groups.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("pages.groups.cancel")}
            </Button>
            <Button type="submit" form="group-form" disabled={submitting}>
              {submitting ? t("pages.groups.saving") : t("pages.groups.save")}
            </Button>
          </>
        }
      >
        <form id="group-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label={t("pages.groups.name")}
            name="name"
            value={form.name}
            onChange={handleChange("name")}
            error={errors.name}
          />
          <Select
            label={t("nav.filials")}
            name="filial_id"
            value={form.filial_id}
            onChange={handleFilialChange}
            error={errors.filial_id}
          >
            <option value="">{t("pages.groups.selectFilial")}</option>
            {filials.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.name}
              </option>
            ))}
          </Select>
          <FieldWithAdd
            label={t("pages.groups.roomOptional")}
            open={roomQuickOpen}
            onToggle={toggleRoomQuick}
            addLabel={t("grp.inlineRoom.addAria")}
            disabled={!form.filial_id}
          >
            <Select
              aria-label={t("pages.groups.roomOptional")}
              name="room_id"
              value={form.room_id}
              onChange={handleChange("room_id")}
              disabled={!form.filial_id}
              className={cn(!form.filial_id && "cursor-not-allowed bg-surface-sunken text-fg-faint")}
            >
              <option value="">
                {form.filial_id ? t("pages.groups.roomNotSelected") : t("pages.groups.selectFilialFirst")}
              </option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
            {roomQuickOpen && (
              <div className="flex flex-col gap-3 rounded-btn border border-line bg-surface-sunken p-4">
                <h4 className="text-sm font-medium text-fg">{t("grp.inlineRoom.title")}</h4>
                <Input
                  label={t("grp.inlineRoom.nameLabel")}
                  value={roomQuickName}
                  onChange={(event) => setRoomQuickName(event.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-fg-secondary">
                    {t("grp.inlineRoom.filialLabel")}
                  </span>
                  <div className="rounded-btn border border-line-strong bg-surface-sunken px-3 py-2 text-sm text-fg-faint">
                    {filialMap[form.filial_id]}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={closeRoomQuick}
                  >
                    {t("grp.inlineRoom.cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleRoomQuickSave}
                    disabled={roomQuickSaving}
                  >
                    {t("grp.inlineRoom.save")}
                  </Button>
                </div>
              </div>
            )}
          </FieldWithAdd>
          <Select
            label={t("pages.groups.academicYear")}
            name="academic_year_id"
            value={form.academic_year_id}
            onChange={handleChange("academic_year_id")}
            error={errors.academic_year_id}
          >
            <option value="">{t("pages.groups.selectAcademicYear")}</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>
          <FieldWithAdd
            label={t("pages.groups.teacher")}
            open={teacherQuickOpen}
            onToggle={toggleTeacherQuick}
            addLabel={t("grp.inlineTeacher.addAria")}
          >
            <Select
              aria-label={t("pages.groups.teacher")}
              name="teacher_id"
              value={form.teacher_id}
              onChange={handleChange("teacher_id")}
            >
              <option value="">{t("pages.schedule.noTeacherAssigned")}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </Select>
            {teacherQuickOpen && (
              <div className="flex flex-col gap-3 rounded-btn border border-line bg-surface-sunken p-4">
                <h4 className="text-sm font-medium text-fg">{t("grp.inlineTeacher.title")}</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label={t("grp.inlineTeacher.nameLabel")}
                    value={teacherQuickForm.full_name}
                    onChange={handleTeacherQuickChange("full_name")}
                  />
                  <Input
                    label={t("grp.inlineTeacher.phoneLabel")}
                    placeholder="+998901234567"
                    value={teacherQuickForm.phone}
                    onChange={handleTeacherQuickChange("phone")}
                  />
                  <Select
                    label={t("grp.inlineTeacher.filialLabel")}
                    value={teacherQuickForm.filial_id}
                    onChange={handleTeacherQuickChange("filial_id")}
                  >
                    <option value="">{t("pages.groups.selectFilial")}</option>
                    {filials.map((filial) => (
                      <option key={filial.id} value={filial.id}>
                        {filial.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label={t("grp.inlineTeacher.subjectLabel")}
                    value={teacherQuickForm.subject}
                    onChange={handleTeacherQuickChange("subject")}
                  />
                  <Select
                    label={t("grp.inlineTeacher.salaryTypeLabel")}
                    value={teacherQuickForm.salary_type}
                    onChange={handleTeacherQuickChange("salary_type")}
                  >
                    <option value="fixed">{t("grp.inlineTeacher.salaryTypeFixed")}</option>
                    <option value="hourly">{t("grp.inlineTeacher.salaryTypeHourly")}</option>
                  </Select>
                  <Input
                    label={t("grp.inlineTeacher.salaryAmountLabel")}
                    type="number"
                    min="0"
                    value={teacherQuickForm.salary_amount}
                    onChange={handleTeacherQuickChange("salary_amount")}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={closeTeacherQuick}
                  >
                    {t("grp.inlineTeacher.cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTeacherQuickSave}
                    disabled={teacherQuickSaving}
                  >
                    {t("grp.inlineTeacher.save")}
                  </Button>
                </div>
              </div>
            )}
          </FieldWithAdd>
          <Input
            label={t("pages.groups.priceLabel")}
            name="price_per_month"
            type="number"
            min="0"
            value={form.price_per_month}
            onChange={handleChange("price_per_month")}
          />
          <Input
            label={t("pages.groups.capacityLabel")}
            name="capacity"
            type="number"
            min="1"
            value={form.capacity}
            onChange={handleChange("capacity")}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg-secondary">{t("pages.groups.schedule")}</span>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleScheduleDay(day.key)}
                  className={cn(
                    "rounded-btn border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    form.scheduleDays.includes(day.key)
                      ? "border-accent bg-accent-light/30 text-accent-dark"
                      : "border-line-strong text-fg-muted hover:bg-surface-sunken",
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <Input
              type="time"
              name="scheduleTime"
              className="mt-1 max-w-[160px]"
              value={form.scheduleTime}
              onChange={handleChange("scheduleTime")}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("pages.groups.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("pages.groups.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("pages.groups.deleting") : t("pages.groups.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <Trans
            i18nKey="pages.groups.deleteConfirm"
            values={{ name: deleteTarget?.name }}
            components={{ strong: <span className="font-medium text-fg" /> }}
          />
        </p>
      </Modal>

      <Modal
        open={Boolean(detailGroup)}
        onClose={closeDetailModal}
        title={detailGroup?.name || ""}
        size="lg"
      >
        {groupStudentsLoading ? (
          <div className="flex flex-col gap-3 py-2">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm text-fg-muted">
              <span>
                {t("pages.groups.studentsLabel")}{" "}
                <span className="font-medium text-fg">{detailGroup?.current_students_count}</span>
                {detailGroup?.capacity != null ? ` / ${detailGroup.capacity}` : ""}
              </span>
              {capacityFull && (
                <Badge
                  variant={capacityVariant(
                    detailGroup?.current_students_count,
                    detailGroup?.capacity,
                  )}
                >
                  {t("pages.groups.capacityFull")}
                </Badge>
              )}
            </div>

            {groupStudents.length === 0 ? (
              <EmptyState
                size="sm"
                icon={UsersRound}
                title={t("pages.groups.noStudentsTitle")}
                description={t("pages.groups.noStudentsDescription")}
              />
            ) : (
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {groupStudents.map((gs) => (
                  <li
                    key={gs.student_id}
                    className="flex items-center justify-between rounded-btn px-2 py-2 hover:bg-surface-sunken"
                  >
                    <span className="text-sm text-fg-secondary">{gs.student_full_name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(gs.student_id)}
                      disabled={removingStudentId === gs.student_id}
                      className="flex items-center gap-1 rounded-btn px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={12} />
                      {removingStudentId === gs.student_id ? "..." : t("pages.groups.remove")}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-line pt-4">
              {capacityFull ? (
                <p className="text-sm text-danger">
                  {t("pages.groups.capacityFullHint")}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-fg">
                      {t("grp.addStudents.label")}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {t("grp.addStudents.selectedCount", { count: selectedStudentIds.length })}
                    </span>
                  </div>

                  {availableStudents.length === 0 ? (
                    <p className="text-sm text-fg-muted">{t("grp.addStudents.noAvailable")}</p>
                  ) : (
                    <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-btn border border-line p-2">
                      {availableStudents.map((student) => (
                        <li key={student.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-btn px-2 py-1.5 text-sm text-fg-secondary hover:bg-surface-sunken">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="h-4 w-4 rounded border-line-strong text-accent focus:ring-accent/40"
                            />
                            {student.full_name}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-end gap-2">
                    {/* Optional: left empty the backend defaults to today. Set it
                        when the students actually started earlier in the month,
                        so the first month is billed only for the lessons left. */}
                    <div className="w-40">
                      <DateInput
                        label={t("pages.groups.joinedDateOptional")}
                        max={new Date().toISOString().slice(0, 10)}
                        value={joinedDateToAdd}
                        onChange={(event) => setJoinedDateToAdd(event.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleAddStudents}
                      disabled={selectedStudentIds.length === 0 || addingStudent}
                    >
                      <UserPlus size={16} />
                      {addingStudent ? "..." : t("grp.addStudents.submit")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
