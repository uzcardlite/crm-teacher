import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Users } from "lucide-react";
import { createStaff, listStaff, listStaffRoles } from "../../api/staff";
import { createTeacherLogin } from "../../api/teachers";
import { listFilials } from "../../api/filials";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Input from "../ui/Input";
import DateInput from "../ui/DateInput";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Table from "../ui/Table";
import Textarea from "../ui/Textarea";
import Pagination from "../ui/Pagination";
import ToggleSwitch from "../ui/ToggleSwitch";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { activeVariant } from "../../constants/status";
import { formatMoney, EMPTY_VALUE } from "../../utils/format";
import { todayValue, ROLE_LABELS } from "../../constants/hr";

const PAGE_SIZE = 20;

const SALARY_TYPE_LABEL_KEYS = {
  fixed: "staff.teachers.salaryType.fixed",
  hourly: "staff.teachers.salaryType.hourly",
};

// `position` holds the selected role.name ("teacher" | "kassa" | "qabul" |
// "hr" | "admin"); it both fills employee.position and drives the dynamic
// B-block. `addUser` is the optional teacher-cabinet login toggle (teacher
// role only); the salary/login fields are reused across branches.
const EMPTY_FORM = {
  full_name: "",
  phone: "",
  position: "",
  filial_id: "",
  hired_at: "",
  birth_date: "",
  notes: "",
  teacher_subject: "",
  teacher_salary_type: "fixed",
  teacher_salary_amount: "",
  addUser: false,
  user_phone: "",
  user_password: "",
};

// Unified "Xodimlar" list: one row per person, merging Employee/Teacher/User
// records. A person can be several of these at once (see api/staff.js /
// app/crud/staff.py on the backend for the dedup rule).
export default function StaffTab({ canManage, modalOpen, onOpenModal, onCloseModal, onDataChanged }) {
  const { t } = useTranslation();

  const [staff, setStaff] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filials, setFilials] = useState([]);
  const filialMap = useMemo(
    () => Object.fromEntries(filials.map((f) => [f.id, f.name])),
    [filials],
  );
  const [roles, setRoles] = useState([]);

  const [filterFilialId, setFilterFilialId] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [searchInput, setSearchInput] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // "Login yaratish" — attach a teacher-cabinet login to a teacher who has
  // none yet (row.is_teacher && !row.is_user).
  const [loginTarget, setLoginTarget] = useState(null);
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch((error) =>
        toast.error(getErrorMessage(error, t("staff.common.filialsLoadError"))),
      );
    listStaffRoles()
      .then(setRoles)
      .catch((error) => toast.error(getErrorMessage(error, t("staff.staffTab.rolesLoadError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 300ms debounce so typing in the search box does not fire a request per key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listStaff({
        page,
        size: PAGE_SIZE,
        filial_id: filterFilialId || undefined,
        status: filterStatus || undefined,
        search: filterSearch || undefined,
      });
      setStaff(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      setStaff([]);
      setTotal(0);
      toast.error(getErrorMessage(error, t("staff.staffTab.loadError")));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterFilialId, filterStatus, filterSearch]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    if (modalOpen) {
      setForm(EMPTY_FORM);
      setErrors({});
    }
  }, [modalOpen]);

  function clearFilters() {
    setFilterFilialId("");
    setFilterStatus("active");
    setSearchInput("");
    setFilterSearch("");
    setPage(1);
  }

  const hasFilters = Boolean(filterFilialId || filterSearch || filterStatus !== "active");

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function closeModal() {
    if (submitting) return;
    onCloseModal();
  }

  // Switching the position resets the dynamic branch fields so a leftover
  // teacher salary can never leak into a system-user payload (and vice versa).
  function handlePositionChange(event) {
    const position = event.target.value;
    setForm((prev) => ({
      ...prev,
      position,
      teacher_subject: "",
      teacher_salary_type: "fixed",
      teacher_salary_amount: "",
      addUser: false,
      user_phone: "",
      user_password: "",
    }));
    setErrors({});
  }

  function toggleUser() {
    setForm((prev) => ({ ...prev, addUser: !prev.addUser }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const isTeacher = form.position === "teacher";
    const isSystemRole = Boolean(form.position) && !isTeacher;
    // Teacher-cabinet login inputs are shown when addUser is on (teacher) or
    // are mandatory for every system role.
    const needsLogin = isSystemRole || (isTeacher && form.addUser);

    const nextErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = t("staff.common.validation.fullName");
    if (!form.position) nextErrors.position = t("staff.staffTab.validation.position");
    if (!form.filial_id) nextErrors.filial_id = t("staff.common.validation.filial");
    if (form.phone.trim() && !/^\+998\d{9}$/.test(form.phone.trim())) {
      nextErrors.phone = t("staff.employees.validation.phone");
    }
    if (!form.hired_at) {
      nextErrors.hired_at = t("staff.employees.validation.hiredAtRequired");
    } else if (form.hired_at > todayValue()) {
      nextErrors.hired_at = t("staff.common.dateFutureError");
    }
    if (form.birth_date && form.birth_date > todayValue()) {
      nextErrors.birth_date = t("staff.common.dateFutureError");
    }

    // Salary amount is required for both branches (teacher + system role).
    if (isTeacher || isSystemRole) {
      if (!form.teacher_salary_amount || Number(form.teacher_salary_amount) <= 0) {
        nextErrors.teacher_salary_amount = t("staff.teachers.validation.salaryAmount");
      }
    }

    if (needsLogin) {
      if (!form.user_phone.trim()) {
        nextErrors.user_phone = t("staff.systemUsers.validation.phone");
      } else if (!/^\+998\d{9}$/.test(form.user_phone.trim())) {
        nextErrors.user_phone = t("staff.employees.validation.phone");
      }
      if (!form.user_password || form.user_password.length < 6) {
        nextErrors.user_password = t("staff.systemUsers.validation.password");
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      employee: {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        position: form.position,
        filial_id: form.filial_id,
        hired_at: form.hired_at,
        birth_date: form.birth_date || null,
        notes: form.notes.trim() || null,
      },
      teacher: isTeacher
        ? {
            filial_id: form.filial_id,
            subject: form.teacher_subject.trim() || null,
            salary_type: form.teacher_salary_type,
            salary_amount: form.teacher_salary_amount,
          }
        : undefined,
      user: needsLogin
        ? isTeacher
          ? {
              phone: form.user_phone.trim(),
              password: form.user_password,
              role_key: "teacher",
            }
          : {
              phone: form.user_phone.trim(),
              password: form.user_password,
              role_key: form.position,
              salary_type: form.teacher_salary_type,
              salary_amount: form.teacher_salary_amount,
            }
        : undefined,
    };

    setSubmitting(true);
    try {
      await createStaff(payload);
      toast.success(t("staff.staffTab.created"));
      onCloseModal();
      await loadStaff();
      await onDataChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("staff.staffTab.saveError")));
    } finally {
      setSubmitting(false);
    }
  }

  function openLoginModal(row) {
    setLoginTarget(row);
    setLoginForm({ phone: "", password: "" });
    setLoginErrors({});
  }

  function closeLoginModal() {
    if (loginSubmitting) return;
    setLoginTarget(null);
  }

  function handleLoginChange(field) {
    return (event) => setLoginForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleCreateLogin(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!/^\+998\d{9}$/.test(loginForm.phone.trim())) {
      nextErrors.phone = t("staff.systemUsers.validation.phone");
    }
    if (!loginForm.password || loginForm.password.length < 6) {
      nextErrors.password = t("staff.systemUsers.validation.password");
    }
    setLoginErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoginSubmitting(true);
    try {
      // Role is forced to "teacher" by the backend — only phone + password sent.
      await createTeacherLogin(loginTarget.teacher_id, {
        phone: loginForm.phone.trim(),
        password: loginForm.password,
      });
      toast.success(t("staff.teacherLogin.created"));
      setLoginTarget(null);
      await loadStaff();
      await onDataChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("staff.teacherLogin.saveError")));
    } finally {
      setLoginSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    {
      key: "full_name",
      header: t("staff.staffTab.columnPerson"),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar photoUrl={row.photo_url} name={row.full_name} size="sm" />
          <div className="min-w-0">
            <span className="font-medium text-fg">{row.full_name}</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {row.is_employee && <Badge variant="info">{t("staff.staffTab.badgeEmployee")}</Badge>}
              {row.is_teacher && <Badge variant="teal">{t("staff.staffTab.badgeTeacher")}</Badge>}
              {row.is_user && <Badge variant="violet">{t("staff.staffTab.badgeUser")}</Badge>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "position",
      header: t("staff.common.position"),
      render: (row) => (row.position ? <Badge variant="neutral">{row.position}</Badge> : EMPTY_VALUE),
    },
    { key: "phone", header: t("staff.common.phone"), nowrap: true },
    {
      key: "filial",
      header: t("staff.common.filial"),
      render: (row) => filialMap[row.filial_id],
    },
    {
      key: "teacherInfo",
      header: t("staff.staffTab.columnTeacherInfo"),
      render: (row) => {
        if (!row.is_teacher) return EMPTY_VALUE;
        const labelKey = SALARY_TYPE_LABEL_KEYS[row.teacher_salary_type];
        const salaryTypeLabel = labelKey ? t(labelKey) : row.teacher_salary_type;
        return `${row.teacher_subject || EMPTY_VALUE} — ${salaryTypeLabel} ${formatMoney(row.teacher_salary_amount)}`;
      },
    },
    {
      key: "role",
      header: t("staff.systemUsers.columnRole"),
      render: (row) => (row.is_user ? row.user_role_name : EMPTY_VALUE),
    },
    {
      key: "status",
      header: t("staff.common.statusLabel"),
      render: (row) => (
        <Badge variant={activeVariant(row.is_active)}>
          {row.is_active ? t("status.active") : t("status.inactive")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: t("staff.common.actions"),
      align: "right",
      nowrap: true,
      render: (row) =>
        canManage && row.is_teacher && !row.is_user && row.teacher_id ? (
          <Button size="sm" variant="secondary" onClick={() => openLoginModal(row)}>
            <KeyRound size={14} />
            {t("staff.teacherLogin.action")}
          </Button>
        ) : (
          EMPTY_VALUE
        ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label={t("staff.common.filial")}
          className="w-full max-w-[180px]"
          value={filterFilialId}
          onChange={(event) => {
            setFilterFilialId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("staff.common.allFilials")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("staff.common.statusLabel")}
          className="w-full max-w-[160px]"
          value={filterStatus}
          onChange={(event) => {
            setFilterStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="active">{t("status.active")}</option>
          <option value="inactive">{t("status.inactive")}</option>
          <option value="all">{t("staff.common.all")}</option>
        </Select>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-secondary">{t("staff.common.search")}</span>
          <Input
            placeholder={t("staff.employees.searchPlaceholder")}
            className="w-48"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            {t("common.clear")}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        data={staff}
        loading={loading}
        rowKey={(row) => `${row.employee_id || ""}-${row.teacher_id || ""}-${row.user_id || ""}`}
        emptyState={
          <EmptyState
            icon={Users}
            title={hasFilters ? t("staff.staffTab.emptyFilteredTitle") : t("staff.staffTab.emptyTitle")}
            description={hasFilters ? t("staff.common.emptyFilterHint") : t("staff.staffTab.emptyDescription")}
            actionLabel={canManage && !hasFilters ? t("staff.staffTab.addNew") : undefined}
            onAction={canManage && !hasFilters ? onOpenModal : undefined}
          />
        }
      />

      {!loading && staff.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t("staff.staffTab.modalTitle")}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("staff.common.cancel")}
            </Button>
            <Button type="submit" form="hr-staff-form" disabled={submitting}>
              {submitting ? t("staff.common.saving") : t("staff.common.save")}
            </Button>
          </>
        }
      >
        <form id="hr-staff-form" onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-fg">{t("staff.staffTab.sectionEmployee")}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={t("staff.common.fullName")}
                value={form.full_name}
                onChange={handleChange("full_name")}
                error={errors.full_name}
                maxLength={120}
              />
              <Input
                label={t("staff.common.phone")}
                type="tel"
                placeholder="+998901234567"
                value={form.phone}
                onChange={handleChange("phone")}
                error={errors.phone}
              />
              <Select
                label={t("staff.common.position")}
                value={form.position}
                onChange={handlePositionChange}
                error={errors.position}
              >
                <option value="">{t("staff.common.choosePosition")}</option>
                {roles.map((role) => (
                  <option key={role.name} value={role.name}>
                    {ROLE_LABELS[role.name] ? t(ROLE_LABELS[role.name]) : role.label || role.name}
                  </option>
                ))}
              </Select>
              <Select
                label={t("staff.common.filial")}
                value={form.filial_id}
                onChange={handleChange("filial_id")}
                error={errors.filial_id}
              >
                <option value="">{t("staff.common.chooseFilial")}</option>
                {filials.map((filial) => (
                  <option key={filial.id} value={filial.id}>
                    {filial.name}
                  </option>
                ))}
              </Select>
              <DateInput
                label={t("staff.employees.hiredAtLabel")}
                max={todayValue()}
                value={form.hired_at}
                onChange={handleChange("hired_at")}
                error={errors.hired_at}
              />
              <DateInput
                label={t("staff.employees.birthDateLabel")}
                max={todayValue()}
                value={form.birth_date}
                onChange={handleChange("birth_date")}
                error={errors.birth_date}
              />
              <div className="md:col-span-2">
                <Textarea
                  label={t("staff.common.notes")}
                  rows={2}
                  maxLength={2000}
                  value={form.notes}
                  onChange={handleChange("notes")}
                />
              </div>
            </div>
          </div>

          {form.position === "teacher" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-card border border-line p-4">
                <h3 className="mb-3 text-sm font-semibold text-fg">
                  {t("staff.staffTab.sectionTeacherInfo")}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label={t("staff.teachers.subjectLabel")}
                    value={form.teacher_subject}
                    onChange={handleChange("teacher_subject")}
                  />
                  <Select
                    label={t("staff.teachers.salaryTypeLabel")}
                    value={form.teacher_salary_type}
                    onChange={handleChange("teacher_salary_type")}
                  >
                    <option value="fixed">{t("staff.teachers.salaryType.fixed")}</option>
                    <option value="hourly">{t("staff.teachers.salaryType.hourly")}</option>
                  </Select>
                  <Input
                    label={t("staff.teachers.salaryAmountLabel")}
                    type="number"
                    min="0"
                    value={form.teacher_salary_amount}
                    onChange={handleChange("teacher_salary_amount")}
                    error={errors.teacher_salary_amount}
                  />
                </div>
              </div>

              <div className="rounded-card border border-line p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-fg">
                      {t("staff.staffTab.sectionTeacherLogin")}
                    </h3>
                    <p className="text-xs text-fg-muted">
                      {t("staff.staffTab.sectionTeacherLoginHint")}
                    </p>
                  </div>
                  <ToggleSwitch checked={form.addUser} onChange={toggleUser} />
                </div>
                {form.addUser && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label={t("staff.staffTab.loginPhoneLabel")}
                      type="tel"
                      placeholder="+998901234567"
                      value={form.user_phone}
                      onChange={handleChange("user_phone")}
                      error={errors.user_phone}
                    />
                    <Input
                      label={t("staff.systemUsers.passwordLabel")}
                      type="password"
                      value={form.user_password}
                      onChange={handleChange("user_password")}
                      error={errors.user_password}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {Boolean(form.position) && form.position !== "teacher" && (
            <div className="rounded-card border border-line p-4">
              <h3 className="mb-3 text-sm font-semibold text-fg">
                {t("staff.staffTab.sectionAccessSalary")}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label={t("staff.teachers.salaryTypeLabel")}
                  value={form.teacher_salary_type}
                  onChange={handleChange("teacher_salary_type")}
                >
                  <option value="fixed">{t("staff.teachers.salaryType.fixed")}</option>
                  <option value="hourly">{t("staff.teachers.salaryType.hourly")}</option>
                </Select>
                <Input
                  label={t("staff.teachers.salaryAmountLabel")}
                  type="number"
                  min="0"
                  value={form.teacher_salary_amount}
                  onChange={handleChange("teacher_salary_amount")}
                  error={errors.teacher_salary_amount}
                />
                <Input
                  label={t("staff.staffTab.loginPhoneLabel")}
                  type="tel"
                  placeholder="+998901234567"
                  value={form.user_phone}
                  onChange={handleChange("user_phone")}
                  error={errors.user_phone}
                />
                <Input
                  label={t("staff.systemUsers.passwordLabel")}
                  type="password"
                  value={form.user_password}
                  onChange={handleChange("user_password")}
                  error={errors.user_password}
                />
              </div>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(loginTarget)}
        onClose={closeLoginModal}
        title={t("staff.teacherLogin.modalTitle", { name: loginTarget?.full_name || "" })}
        footer={
          <>
            <Button variant="secondary" onClick={closeLoginModal} disabled={loginSubmitting}>
              {t("staff.common.cancel")}
            </Button>
            <Button type="submit" form="teacher-login-form" disabled={loginSubmitting}>
              {loginSubmitting ? t("staff.common.saving") : t("staff.common.save")}
            </Button>
          </>
        }
      >
        <form
          id="teacher-login-form"
          onSubmit={handleCreateLogin}
          className="flex flex-col gap-4"
          noValidate
        >
          <p className="text-xs text-fg-muted">{t("staff.teacherLogin.hint")}</p>
          <Input
            label={t("staff.staffTab.loginPhoneLabel")}
            type="tel"
            placeholder="+998901234567"
            value={loginForm.phone}
            onChange={handleLoginChange("phone")}
            error={loginErrors.phone}
          />
          <Input
            label={t("staff.systemUsers.passwordLabel")}
            type="password"
            value={loginForm.password}
            onChange={handleLoginChange("password")}
            error={loginErrors.password}
          />
        </form>
      </Modal>
    </div>
  );
}
