import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  Camera,
  FileText,
  History,
  Palmtree,
  Plus,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import {
  deactivateEmployee,
  deleteEmployeeDocument,
  getEmployee,
  getLeaveBalance,
  listEmployeeDocuments,
  listEmployeeHistory,
  listLeaveRequests,
  reactivateEmployee,
  updateEmployee,
  uploadEmployeeDocument,
  uploadEmployeePhoto,
} from "../../api/hr";
import { listFilials } from "../../api/filials";
import { listUsers } from "../../api/users";
import { listTeachers } from "../../api/teachers";
import { useTenantModules } from "../../context/TenantModulesContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import DateInput from "../../components/ui/DateInput";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import Tabs from "../../components/ui/Tabs";
import Textarea from "../../components/ui/Textarea";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import LeaveRequestsTable from "../../components/hr/LeaveRequestsTable";
import {
  DOC_ALLOWED_MIME,
  DOC_MAX_SIZE_BYTES,
  DOC_TYPE_LABELS,
  EDUCATION_LEVEL_LABELS,
  EVENT_BADGE,
  EVENT_LABELS,
  formatDate,
  formatSize,
  toDateInputValue,
  tenure,
  todayValue,
} from "../../constants/hr";

const PHONE_RE = /^\+998\d{9}$/;

const EMPTY_DOC_FORM = { doc_type: "contract", title: "", file: null };

function buildForm(data) {
  return {
    full_name: data.full_name || "",
    phone: data.phone || "",
    position: data.position || "",
    filial_id: data.filial_id || "",
    hired_at: toDateInputValue(data.hired_at),
    birth_date: toDateInputValue(data.birth_date),
    passport_series: data.passport_series || "",
    pinfl: data.pinfl || "",
    address: data.address || "",
    education_level: data.education_level || "",
    education_institution: data.education_institution || "",
    specialty: data.specialty || "",
    contract_number: data.contract_number || "",
    contract_start_date: toDateInputValue(data.contract_start_date),
    contract_end_date: toDateInputValue(data.contract_end_date),
    annual_leave_days:
      data.annual_leave_days === null || data.annual_leave_days === undefined
        ? ""
        : String(data.annual_leave_days),
    emergency_contact_name: data.emergency_contact_name || "",
    emergency_contact_phone: data.emergency_contact_phone || "",
    emergency_contact_relation: data.emergency_contact_relation || "",
    notes: data.notes || "",
    user_id: data.user_id || "",
    teacher_id: data.teacher_id || "",
  };
}

function ageFrom(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export default function HrEmployeeProfile() {
  const { t } = useTranslation();
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useTenantModules();
  const canManage = hasPermission("hr.manage");

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [profileTab, setProfileTab] = useState("info");

  const [filials, setFilials] = useState([]);
  const [users, setUsers] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] = useState(null);
  const [initialForm, setInitialForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState(EMPTY_DOC_FORM);
  const [docErrors, setDocErrors] = useState({});
  const [docUploading, setDocUploading] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [docDeleting, setDocDeleting] = useState(false);

  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [balance, setBalance] = useState(null);

  const filialName = useMemo(
    () => filials.find((f) => f.id === employee?.filial_id)?.name || "",
    [filials, employee],
  );

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch(() => {});
    listUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
    listTeachers({ size: 200 })
      .then((data) => setTeachers(data.items || []))
      .catch(() => {});
  }, []);

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await getEmployee(employeeId);
      setEmployee(data);
      const nextForm = buildForm(data);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (error) {
      if (error?.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.loadError")));
      }
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await listEmployeeHistory(employeeId);
      setHistory(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      setHistory([]);
      toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.historyError")));
    } finally {
      setHistoryLoading(false);
    }
  }, [employeeId]);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const data = await listEmployeeDocuments(employeeId);
      setDocs(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      setDocs([]);
      toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.docsError")));
    } finally {
      setDocsLoading(false);
    }
  }, [employeeId]);

  const loadLeaves = useCallback(async () => {
    setLeavesLoading(true);
    try {
      const [list, bal] = await Promise.all([
        listLeaveRequests({ employee_id: employeeId, size: 100 }),
        getLeaveBalance(employeeId).catch(() => null),
      ]);
      setLeaves(list.items || []);
      setBalance(bal);
    } catch (error) {
      setLeaves([]);
      toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.leavesError")));
    } finally {
      setLeavesLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadEmployee();
    loadHistory();
    loadDocs();
  }, [loadEmployee, loadHistory, loadDocs]);

  useEffect(() => {
    if (profileTab === "leaves") loadLeaves();
  }, [profileTab, loadLeaves]);

  async function handleToggleActive() {
    if (!employee || !canManage) return;
    setToggling(true);
    const nextActive = !employee.is_active;
    try {
      const updated = nextActive
        ? await reactivateEmployee(employee.id)
        : await deactivateEmployee(employee.id);
      setEmployee(updated);
      toast.success(
        nextActive ? t("pages.hrEmployeeProfile.reactivated") : t("pages.hrEmployeeProfile.deactivated"),
      );
      await loadHistory();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.statusError")));
    } finally {
      setToggling(false);
    }
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("pages.hrEmployeeProfile.onlyImageError"));
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setUploadingPhoto(true);
    try {
      const updated = await uploadEmployeePhoto(employeeId, formData);
      setEmployee(updated);
      toast.success(t("pages.hrEmployeeProfile.photoUploaded"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.photoUploadError")));
    } finally {
      setUploadingPhoto(false);
    }
  }

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFormChange(field) {
    return (event) => setField(field, event.target.value);
  }

  function validate() {
    const next = {};
    const name = form.full_name.trim();
    if (name.length < 2 || name.length > 120)
      next.full_name = t("pages.hrEmployeeProfile.validation.nameLength");
    if (!form.position.trim()) next.position = t("pages.hrEmployeeProfile.validation.positionRequired");
    if (!form.filial_id) next.filial_id = t("pages.hrEmployeeProfile.validation.filialRequired");
    if (!form.hired_at) {
      next.hired_at = t("pages.hrEmployeeProfile.validation.dateRequired");
    } else if (form.hired_at > todayValue()) {
      next.hired_at = t("pages.hrEmployeeProfile.validation.dateNotFuture");
    }
    if (form.birth_date) {
      if (form.birth_date > todayValue()) {
        next.birth_date = t("pages.hrEmployeeProfile.validation.dateNotFuture");
      } else if (ageFrom(form.birth_date) < 16) {
        next.birth_date = t("pages.hrEmployeeProfile.validation.minAge");
      }
    }
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) {
      next.phone = t("pages.hrEmployeeProfile.validation.phoneFormat");
    }
    if (form.pinfl.trim() && !/^\d{14}$/.test(form.pinfl.trim())) {
      next.pinfl = t("pages.hrEmployeeProfile.validation.pinflFormat");
    }
    if (form.emergency_contact_name.trim() && !form.emergency_contact_phone.trim()) {
      next.emergency_contact_phone = t("pages.hrEmployeeProfile.validation.emergencyPhoneRequired");
    }
    if (
      form.emergency_contact_phone.trim() &&
      !PHONE_RE.test(form.emergency_contact_phone.trim())
    ) {
      next.emergency_contact_phone = t("pages.hrEmployeeProfile.validation.phoneFormat");
    }
    if (
      form.contract_start_date &&
      form.contract_end_date &&
      form.contract_end_date < form.contract_start_date
    ) {
      next.contract_end_date = t("pages.hrEmployeeProfile.validation.contractEndBeforeStart");
    }
    if (form.annual_leave_days !== "" && Number(form.annual_leave_days) < 0) {
      next.annual_leave_days = t("pages.hrEmployeeProfile.validation.notNegative");
    }
    return next;
  }

  // Only changed fields are sent so a concurrent edit of untouched fields is
  // never overwritten. Empty strings become null (backend clears the column).
  function buildPatch() {
    const patch = {};
    Object.keys(form).forEach((key) => {
      const raw = typeof form[key] === "string" ? form[key].trim() : form[key];
      const initialRaw =
        typeof initialForm[key] === "string" ? initialForm[key].trim() : initialForm[key];
      if (raw === initialRaw) return;
      if (key === "annual_leave_days") {
        patch[key] = raw === "" ? null : Number(raw);
        return;
      }
      patch[key] = raw === "" ? null : raw;
    });
    return patch;
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canManage) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      toast.success(t("pages.hrEmployeeProfile.noChanges"));
      return;
    }

    setSaving(true);
    try {
      const updated = await updateEmployee(employeeId, patch);
      setEmployee(updated);
      const nextForm = buildForm(updated);
      setForm(nextForm);
      setInitialForm(nextForm);
      toast.success(t("pages.hrEmployeeProfile.saved"));
      await loadHistory();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.saveError")));
    } finally {
      setSaving(false);
    }
  }

  function openUpload() {
    setDocForm(EMPTY_DOC_FORM);
    setDocErrors({});
    setDocModalOpen(true);
  }

  function closeUpload() {
    if (docUploading) return;
    setDocModalOpen(false);
  }

  async function handleDocSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!docForm.doc_type) next.doc_type = t("pages.hrEmployeeProfile.validation.docTypeRequired");
    if (!docForm.file) {
      next.file = t("pages.hrEmployeeProfile.validation.fileRequired");
    } else if (!DOC_ALLOWED_MIME.includes(docForm.file.type)) {
      next.file = t("pages.hrEmployeeProfile.validation.fileTypeError");
    } else if (docForm.file.size > DOC_MAX_SIZE_BYTES) {
      next.file = t("pages.hrEmployeeProfile.validation.fileSizeError");
    }
    setDocErrors(next);
    if (Object.keys(next).length > 0) return;

    const formData = new FormData();
    formData.append("doc_type", docForm.doc_type);
    if (docForm.title.trim()) formData.append("title", docForm.title.trim());
    formData.append("file", docForm.file);

    setDocUploading(true);
    try {
      await uploadEmployeeDocument(employeeId, formData);
      toast.success(t("pages.hrEmployeeProfile.docUploaded"));
      setDocModalOpen(false);
      await loadDocs();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.docUploadError")));
    } finally {
      setDocUploading(false);
    }
  }

  async function handleDocDelete() {
    if (!docToDelete) return;
    setDocDeleting(true);
    try {
      await deleteEmployeeDocument(docToDelete.id);
      toast.success(t("pages.hrEmployeeProfile.docDeleted"));
      setDocToDelete(null);
      await loadDocs();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.hrEmployeeProfile.docDeleteError")));
    } finally {
      setDocDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (notFound || !employee || !form) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("pages.hrEmployeeProfile.notFoundTitle")}
          description={t("pages.hrEmployeeProfile.notFoundDescription")}
          actionLabel={t("pages.hrEmployeeProfile.backToList")}
          onAction={() => navigate("/app/hr?tab=employees")}
        />
      </div>
    );
  }

  const profileTabs = [
    { key: "info", label: t("pages.hrEmployeeProfile.tabs.info") },
    { key: "documents", label: t("pages.hrEmployeeProfile.tabs.documents"), count: docs.length || undefined },
    { key: "leaves", label: t("pages.hrEmployeeProfile.tabs.leaves") },
    { key: "history", label: t("pages.hrEmployeeProfile.tabs.history") },
  ];

  const tenureText = tenure(employee.hired_at, employee.terminated_at, t);

  return (
    <div className="p-6">
      <button
        type="button"
        onClick={() => navigate("/app/hr?tab=employees")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={16} />
        {t("pages.hrEmployeeProfile.backToList")}
      </button>

      <Card className="mb-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative h-20 w-20 flex-shrink-0">
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
              {employee.photo_url ? (
                <img src={employee.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon size={28} className="text-fg-faint" />
              )}
            </span>
            {canManage && (
              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-accent text-accent-dark shadow-card transition-colors hover:bg-accent-light">
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={handlePhotoChange}
                />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-fg">{employee.full_name}</h1>
            <p className="text-sm text-fg-muted">{employee.position}</p>
            <p className="mt-1 text-xs text-fg-muted">
              {[filialName, tenureText, employee.phone].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={employee.is_active ? "success" : "danger"}>
              {employee.is_active ? t("status.active") : t("status.inactive")}
            </Badge>
            {canManage && (
              <ToggleSwitch
                checked={employee.is_active}
                disabled={toggling}
                onChange={handleToggleActive}
              />
            )}
          </div>
        </div>
      </Card>

      <Tabs className="mb-4" tabs={profileTabs} value={profileTab} onChange={setProfileTab} />

      {profileTab === "info" && (
        <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-fg">{t("pages.hrEmployeeProfile.personalInfo")}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={t("pages.students.name")}
                value={form.full_name}
                onChange={handleFormChange("full_name")}
                error={errors.full_name}
                maxLength={120}
                disabled={!canManage}
              />
              <Input
                label={t("pages.parents.columns.phone")}
                type="tel"
                placeholder="+998901234567"
                value={form.phone}
                onChange={handleFormChange("phone")}
                error={errors.phone}
                disabled={!canManage}
              />
              <DateInput
                label={t("pages.students.birthDate")}
                max={todayValue()}
                value={form.birth_date}
                onChange={handleFormChange("birth_date")}
                error={errors.birth_date}
                disabled={!canManage}
              />
              <Input
                label={t("pages.hrEmployeeProfile.passportSeries")}
                value={form.passport_series}
                onChange={(event) =>
                  setField("passport_series", event.target.value.toUpperCase())
                }
                maxLength={20}
                disabled={!canManage}
              />
              <Input
                label={t("pages.hrEmployeeProfile.pinfl")}
                inputMode="numeric"
                value={form.pinfl}
                onChange={(event) =>
                  setField("pinfl", event.target.value.replace(/\D/g, "").slice(0, 14))
                }
                error={errors.pinfl}
                disabled={!canManage}
              />
              <Select
                label={t("pages.hrEmployeeProfile.educationLevel")}
                value={form.education_level}
                onChange={handleFormChange("education_level")}
                disabled={!canManage}
              >
                <option value="">{t("pages.hrEmployeeProfile.notSelected")}</option>
                {Object.entries(EDUCATION_LEVEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                label={t("pages.hrEmployeeProfile.educationInstitution")}
                value={form.education_institution}
                onChange={handleFormChange("education_institution")}
                maxLength={200}
                disabled={!canManage}
              />
              <Input
                label={t("pages.hrEmployeeProfile.specialty")}
                value={form.specialty}
                onChange={handleFormChange("specialty")}
                maxLength={200}
                disabled={!canManage}
              />
              <div className="md:col-span-2">
                <Textarea
                  label={t("pages.profile.address")}
                  rows={2}
                  maxLength={500}
                  value={form.address}
                  onChange={handleFormChange("address")}
                  disabled={!canManage}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-fg">{t("pages.hrEmployeeProfile.workInfo")}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={t("pages.hrEmployeeProfile.position")}
                value={form.position}
                onChange={handleFormChange("position")}
                error={errors.position}
                disabled={!canManage}
              />
              <Select
                label={t("nav.filials")}
                value={form.filial_id}
                onChange={handleFormChange("filial_id")}
                error={errors.filial_id}
                disabled={!canManage}
              >
                <option value="">{t("pages.groups.selectFilial")}</option>
                {filials.map((filial) => (
                  <option key={filial.id} value={filial.id}>
                    {filial.name}
                  </option>
                ))}
              </Select>
              <DateInput
                label={t("pages.hrEmployeeProfile.hiredAt")}
                max={todayValue()}
                value={form.hired_at}
                onChange={handleFormChange("hired_at")}
                error={errors.hired_at}
                disabled={!canManage}
              />
              <Input
                label={t("pages.hrEmployeeProfile.contractNumber")}
                value={form.contract_number}
                onChange={handleFormChange("contract_number")}
                maxLength={60}
                disabled={!canManage}
              />
              <DateInput
                label={t("pages.hrEmployeeProfile.contractStartDate")}
                value={form.contract_start_date}
                onChange={handleFormChange("contract_start_date")}
                disabled={!canManage}
              />
              <DateInput
                label={t("pages.hrEmployeeProfile.contractEndDate")}
                value={form.contract_end_date}
                onChange={handleFormChange("contract_end_date")}
                error={errors.contract_end_date}
                disabled={!canManage}
              />
              <Input
                label={t("pages.hrEmployeeProfile.annualLeaveDays")}
                type="number"
                min="0"
                value={form.annual_leave_days}
                onChange={handleFormChange("annual_leave_days")}
                error={errors.annual_leave_days}
                disabled={!canManage}
              />
              <Select
                label={t("pages.hrEmployeeProfile.systemUser")}
                value={form.user_id}
                onChange={handleFormChange("user_id")}
                disabled={!canManage}
              >
                <option value="">{t("pages.hrEmployeeProfile.notLinked")}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username || user.email}
                  </option>
                ))}
              </Select>
              <Select
                label={t("pages.hrEmployeeProfile.teacherCard")}
                value={form.teacher_id}
                onChange={handleFormChange("teacher_id")}
                disabled={!canManage}
              >
                <option value="">{t("pages.hrEmployeeProfile.notLinked")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </Select>
              <div className="md:col-span-2">
                <Textarea
                  label={t("pages.hrEmployeeProfile.notes")}
                  rows={3}
                  maxLength={2000}
                  value={form.notes}
                  onChange={handleFormChange("notes")}
                  disabled={!canManage}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-fg">{t("pages.hrEmployeeProfile.emergencyContact")}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={t("pages.hrEmployeeProfile.contactPerson")}
                value={form.emergency_contact_name}
                onChange={handleFormChange("emergency_contact_name")}
                maxLength={120}
                disabled={!canManage}
              />
              <Input
                label={t("pages.parents.columns.phone")}
                type="tel"
                placeholder="+998901234567"
                value={form.emergency_contact_phone}
                onChange={handleFormChange("emergency_contact_phone")}
                error={errors.emergency_contact_phone}
                disabled={!canManage}
              />
              <Input
                label={t("pages.parents.columns.relationship")}
                value={form.emergency_contact_relation}
                onChange={handleFormChange("emergency_contact_relation")}
                maxLength={60}
                disabled={!canManage}
              />
            </div>
          </Card>

          {canManage && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? t("pages.hrEmployeeProfile.saving") : t("pages.hrEmployeeProfile.save")}
              </Button>
            </div>
          )}
        </form>
      )}

      {profileTab === "documents" &&
        (docsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="flex flex-col gap-3">
                <Skeleton className="h-9 w-9 rounded-btn" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("pages.hrEmployeeProfile.noDocsTitle")}
            description={t("pages.hrEmployeeProfile.noDocsDescription")}
            actionLabel={canManage ? t("pages.hrEmployeeProfile.addDoc") : undefined}
            onAction={canManage ? openUpload : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-btn bg-surface-sunken text-fg-muted">
                    <FileText size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {doc.title || doc.file_name}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {formatSize(doc.size_bytes)} · {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <Badge variant="neutral" className="self-start">
                  {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(doc.file_url, "_blank", "noopener")}
                  >
                    {t("pages.hrEmployeeProfile.open")}
                  </Button>
                  {canManage && (
                    <Button size="sm" variant="danger" onClick={() => setDocToDelete(doc)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {canManage && (
              <button
                type="button"
                onClick={openUpload}
                className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong bg-surface p-4 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-sunken"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-light/30 text-accent-dark dark:text-accent">
                  <Plus size={18} />
                </span>
                {t("pages.hrEmployeeProfile.addDoc")}
              </button>
            )}
          </div>
        ))}

      {profileTab === "leaves" && (
        <div>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              compact
              variant="blue"
              icon={CalendarDays}
              label={t("pages.hrEmployeeProfile.annualQuota")}
              value={balance ? t("pages.hrEmployeeProfile.daysCount", { count: balance.entitled_days }) : "-"}
            />
            <StatCard
              compact
              variant="orange"
              icon={Palmtree}
              label={t("pages.hrEmployeeProfile.used")}
              value={balance ? t("pages.hrEmployeeProfile.daysCount", { count: balance.used_days }) : "-"}
            />
            <StatCard
              compact
              variant="teal"
              icon={CalendarCheck}
              label={t("pages.hrEmployeeProfile.remaining")}
              value={balance ? t("pages.hrEmployeeProfile.daysCount", { count: balance.remaining_days }) : "-"}
            />
          </div>
          <LeaveRequestsTable
            rows={leaves}
            loading={leavesLoading}
            canManage={canManage}
            includeEmployee={false}
            onChanged={loadLeaves}
          />
        </div>
      )}

      {profileTab === "history" && (
        <Table
          columns={[
            {
              key: "event_type",
              header: t("pages.hrEmployeeProfile.eventType"),
              render: (row) => (
                <Badge variant={EVENT_BADGE[row.event_type] || "neutral"}>
                  {EVENT_LABELS[row.event_type] || row.event_type}
                </Badge>
              ),
            },
            { key: "position", header: t("pages.hrEmployeeProfile.position"), render: (row) => row.position },
            { key: "event_date", header: t("pages.exams.columns.date"), render: (row) => formatDate(row.event_date) },
          ]}
          data={history}
          loading={historyLoading}
          rowKey={(row) => row.id}
          emptyState={<EmptyState icon={History} title={t("pages.hrEmployeeProfile.historyEmpty")} />}
        />
      )}

      <Modal
        open={docModalOpen}
        onClose={closeUpload}
        title={t("pages.hrEmployeeProfile.uploadDocTitle")}
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeUpload} disabled={docUploading}>
              {t("pages.hrEmployeeProfile.cancel")}
            </Button>
            <Button type="submit" form="hr-doc-form" disabled={docUploading}>
              {docUploading ? t("pages.hrEmployeeProfile.uploading") : t("pages.hrEmployeeProfile.upload")}
            </Button>
          </>
        }
      >
        <form id="hr-doc-form" onSubmit={handleDocSubmit} className="flex flex-col gap-4" noValidate>
          <Select
            label={t("pages.hrEmployeeProfile.docType")}
            value={docForm.doc_type}
            onChange={(event) =>
              setDocForm((prev) => ({ ...prev, doc_type: event.target.value }))
            }
            error={docErrors.doc_type}
          >
            {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label={t("pages.hrEmployeeProfile.file")}
            type="file"
            accept={DOC_ALLOWED_MIME.join(",")}
            onChange={(event) =>
              setDocForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
            }
            error={docErrors.file}
          />
          <Textarea
            label={t("pages.hrEmployeeProfile.notes")}
            rows={2}
            maxLength={200}
            value={docForm.title}
            onChange={(event) => setDocForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(docToDelete)}
        onClose={() => !docDeleting && setDocToDelete(null)}
        title={t("pages.hrEmployeeProfile.deleteDocTitle")}
        className="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDocToDelete(null)}
              disabled={docDeleting}
            >
              {t("pages.hrEmployeeProfile.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDocDelete} disabled={docDeleting}>
              {docDeleting ? t("pages.hrEmployeeProfile.deleting") : t("pages.hrEmployeeProfile.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          {t("pages.hrEmployeeProfile.deleteDocConfirm", {
            name: docToDelete?.title || docToDelete?.file_name,
          })}
        </p>
      </Modal>
    </div>
  );
}
