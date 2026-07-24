import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Plus } from "lucide-react";
import { createTenant, listTenants } from "../../api/tenants";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { subscriptionVariant } from "../../constants/status";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/format";

const EMPTY_FORM = {
  name: "",
  slug: "",
  admin_full_name: "",
  admin_phone: "",
  admin_password: "",
  demo_days: 14,
};

// Subscription badge label. Days-aware so an active tenant near expiry reads
// "Muddat yaqin". Null/old tenant falls back to the neutral "Aktiv" label.
function subscriptionLabel(status, daysRemaining, t) {
  if (status === "demo") return t("pages.tenantsList.subDemo");
  if (status === "expired") return t("pages.tenantsList.subExpired");
  if (status === "active" && daysRemaining != null && daysRemaining <= 7) {
    return t("pages.tenantsList.subExpiring");
  }
  return t("pages.tenantsList.active");
}

export default function TenantsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function loadTenants() {
    setLoading(true);
    try {
      const data = await listTenants();
      setTenants(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.tenantsList.listError")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  function openModal() {
    setForm(EMPTY_FORM);
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
    if (!form.name.trim()) nextErrors.name = t("pages.tenantsList.nameError");
    if (!form.slug.trim()) nextErrors.slug = t("pages.tenantsList.slugError");
    if (!form.admin_full_name.trim())
      nextErrors.admin_full_name = t("pages.tenantsList.adminNameError");
    if (!form.admin_phone.trim()) nextErrors.admin_phone = t("pages.tenantsList.adminPhoneError");
    if (!form.admin_password) nextErrors.admin_password = t("pages.tenantsList.adminPasswordError");
    // demo_days is optional (backend defaults to 14 when blank), but when
    // filled it must be a whole number in 1..365.
    const rawDemo = String(form.demo_days ?? "").trim();
    if (rawDemo !== "") {
      const demo = Number(rawDemo);
      if (!Number.isInteger(demo) || demo <= 0 || demo > 365) {
        nextErrors.demo_days = t("pages.tenantsList.demoDaysError");
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const { demo_days, ...rest } = form;
      const trimmedDemo = String(demo_days ?? "").trim();
      const payload =
        trimmedDemo === "" ? rest : { ...rest, demo_days: Number(trimmedDemo) };
      await createTenant(payload);
      toast.success(t("pages.tenantsList.createSuccess"));
      setModalOpen(false);
      await loadTenants();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.tenantsList.createError")));
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    { key: "name", header: t("pages.tenantsList.columns.name"), truncate: true },
    { key: "slug", header: "Slug", nowrap: true },
    {
      key: "status",
      header: t("pages.tenantsList.columns.status"),
      nowrap: true,
      // A blocked tenant (is_active === false) is a separate, higher-priority
      // concern than the subscription state, so it wins and stays danger.
      // Otherwise show the subscription badge + remaining days.
      render: (row) => {
        if (!row.is_active) {
          return <Badge variant="danger">{t("pages.tenantsList.blocked")}</Badge>;
        }
        return (
          <div className="flex items-center">
            <Badge variant={subscriptionVariant(row.subscription_status, row.days_remaining)}>
              {subscriptionLabel(row.subscription_status, row.days_remaining, t)}
            </Badge>
            {row.days_remaining != null && (
              <span className="ml-1.5 text-xs text-fg-muted">
                {t("pages.tenantsList.daysLeft", { days: row.days_remaining })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "created_at",
      header: t("pages.tenantsList.columns.createdAt"),
      nowrap: true,
      render: (row) => formatDate(row.created_at),
    },
    {
      key: "actions",
      header: t("pages.tenantsList.columns.actions"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/superadmin/tenants/${row.id}`)}
        >
          {t("pages.tenantsList.details")}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("pages.tenantsList.title")}>
        <Button onClick={openModal}>
          <Plus size={16} />
          {t("pages.tenantsList.newTenant")}
        </Button>
      </PageHeader>

      <Table
        columns={columns}
        data={tenants}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Building2}
            title={t("pages.tenantsList.emptyTitle")}
            description={t("pages.tenantsList.emptyDescription")}
            actionLabel={t("pages.tenantsList.newTenant")}
            onAction={openModal}
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title={t("pages.tenantsList.modalTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("pages.tenantsList.cancel")}
            </Button>
            <Button type="submit" form="create-tenant-form" disabled={submitting}>
              {submitting ? t("pages.tenantsList.creating") : t("pages.tenantsList.create")}
            </Button>
          </>
        }
      >
        <form
          id="create-tenant-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label={t("pages.tenantsList.columns.name")}
            name="name"
            value={form.name}
            onChange={handleChange("name")}
            error={errors.name}
          />
          <Input
            label="Slug"
            name="slug"
            value={form.slug}
            onChange={handleChange("slug")}
            error={errors.slug}
          />
          <Input
            label={t("pages.tenantsList.adminFullName")}
            name="admin_full_name"
            value={form.admin_full_name}
            onChange={handleChange("admin_full_name")}
            error={errors.admin_full_name}
          />
          <Input
            label={t("pages.tenantsList.adminPhone")}
            name="admin_phone"
            type="tel"
            placeholder="+998901234567"
            value={form.admin_phone}
            onChange={handleChange("admin_phone")}
            error={errors.admin_phone}
          />
          <Input
            label={t("pages.tenantsList.adminPassword")}
            name="admin_password"
            type="password"
            value={form.admin_password}
            onChange={handleChange("admin_password")}
            error={errors.admin_password}
          />
          <Input
            label={t("pages.tenantsList.demoDays")}
            name="demo_days"
            type="number"
            min={1}
            max={365}
            value={form.demo_days}
            onChange={handleChange("demo_days")}
            error={errors.demo_days}
          />
        </form>
      </Modal>
    </div>
  );
}
