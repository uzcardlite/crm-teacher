import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ShieldCheck } from "lucide-react";
import { createRole, listRoles, toggleRoleModule } from "../../api/roles";
import { listTenants } from "../../api/tenants";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";

const MODULE_KEYS = [
  "auth",
  "students",
  "dashboard",
  "filials",
  "groups",
  "attendance",
  "payments",
  "expenses",
  "academic_years",
  "teachers",
  "rooms",
  "exams",
  "users",
  "telegram_bot",
  "payroll",
  "student_leads",
  "hr",
];

export default function RolesManagement() {
  const { t } = useTranslation();
  const MODULE_CATALOG = MODULE_KEYS.map((key) => ({
    key,
    label: t(`pages.rolesManagement.modules.${key}`),
  }));
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingToggles, setPendingToggles] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listTenants()
      .then(setTenants)
      .catch((error) => toast.error(getErrorMessage(error, t("pages.rolesManagement.tenantsError"))));
  }, []);

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  async function loadRoles() {
    setLoading(true);
    try {
      const data = await listRoles(selectedTenantId || undefined);
      setRoles(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.rolesManagement.rolesError")));
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setRoleName("");
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  async function handleCreateRole(event) {
    event.preventDefault();
    if (!roleName.trim()) return;

    setSubmitting(true);
    try {
      await createRole({
        name: roleName.trim(),
        tenant_id: selectedTenantId || null,
      });
      toast.success(t("pages.rolesManagement.createSuccess"));
      setModalOpen(false);
      await loadRoles();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.rolesManagement.createError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleModule(role, moduleKey, currentValue) {
    const nextValue = !currentValue;
    const pendingKey = `${role.id}:${moduleKey}`;
    setPendingToggles((prev) => ({ ...prev, [pendingKey]: true }));
    setRoles((prev) =>
      prev.map((r) =>
        r.id === role.id
          ? {
              ...r,
              modules: nextValue
                ? [...r.modules, moduleKey]
                : r.modules.filter((m) => m !== moduleKey),
            }
          : r,
      ),
    );

    try {
      await toggleRoleModule(role.id, moduleKey, nextValue);
    } catch (error) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === role.id
            ? {
                ...r,
                modules: currentValue
                  ? [...r.modules, moduleKey]
                  : r.modules.filter((m) => m !== moduleKey),
              }
            : r,
        ),
      );
      toast.error(getErrorMessage(error, t("pages.rolesManagement.toggleError")));
    } finally {
      setPendingToggles((prev) => {
        const next = { ...prev };
        delete next[pendingKey];
        return next;
      });
    }
  }

  return (
    <div className="p-6">
      <PageHeader title={t("pages.rolesManagement.title")}>
        <Button onClick={openModal}>
          <Plus size={16} />
          {t("pages.rolesManagement.newRole")}
        </Button>
      </PageHeader>

      <FilterBar>
        <Select
          label={t("pages.rolesManagement.context")}
          className="w-full max-w-[280px]"
          value={selectedTenantId}
          onChange={(event) => setSelectedTenantId(event.target.value)}
        >
          <option value="">{t("pages.rolesManagement.systemRoles")}</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </Select>
      </FilterBar>

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-4 h-32 w-full" />
            </Card>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("pages.rolesManagement.emptyTitle")}
          description={t("pages.rolesManagement.emptyDescription")}
          actionLabel={t("pages.rolesManagement.newRole")}
          onAction={openModal}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {roles.map((role) => (
            <Card key={role.id}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-fg">{role.name}</h2>
                {role.tenant_id ? (
                  <Badge variant="neutral">{t("pages.rolesManagement.tenantSpecific")}</Badge>
                ) : (
                  <Badge variant="warning">{t("pages.rolesManagement.systemRole")}</Badge>
                )}
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
                {MODULE_CATALOG.map((module) => {
                  const checked = role.modules.includes(module.key);
                  const pendingKey = `${role.id}:${module.key}`;
                  return (
                    <div
                      key={module.key}
                      className="flex items-center justify-between py-2 sm:border-b sm:border-line"
                    >
                      <span className="text-sm text-fg-secondary">{module.label}</span>
                      <ToggleSwitch
                        checked={checked}
                        disabled={Boolean(pendingToggles[pendingKey])}
                        onChange={() => handleToggleModule(role, module.key, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t("pages.rolesManagement.modalTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("pages.rolesManagement.cancel")}
            </Button>
            <Button type="submit" form="create-role-form" disabled={submitting}>
              {submitting ? t("pages.rolesManagement.creating") : t("pages.rolesManagement.create")}
            </Button>
          </>
        }
      >
        <form id="create-role-form" onSubmit={handleCreateRole} className="flex flex-col gap-4" noValidate>
          <Input
            label={t("pages.rolesManagement.roleName")}
            name="name"
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
          />
          <p className="text-xs text-fg-muted">
            {selectedTenantId
              ? t("pages.rolesManagement.tenantScopeHint", {
                  tenantName: tenants.find((tenant) => tenant.id === selectedTenantId)?.name || "",
                })
              : t("pages.rolesManagement.systemScopeHint")}
          </p>
        </form>
      </Modal>
    </div>
  );
}
