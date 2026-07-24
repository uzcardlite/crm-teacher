import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Lock, User as UserIcon } from "lucide-react";
import { getMyTenant, updateMyTenant } from "../../api/tenants";
import { changePassword, updateMe, uploadMyPhoto } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const EMPTY_TENANT_FORM = { phone: "", address: "" };
const EMPTY_PASSWORD_FORM = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export default function Profile() {
  const { t } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role_name === "admin";

  const [activeTab, setActiveTab] = useState("shaxsiy");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setActiveTab(params.get("tab") === "markaz" ? "markaz" : "shaxsiy");
  }, [location.search]);

  function switchTab(tab) {
    navigate(tab === "markaz" ? "/app/profile?tab=markaz" : "/app/profile", {
      replace: true,
    });
  }

  // --- Shaxsiy: name/phone/avatar ---
  const [personalForm, setPersonalForm] = useState({ full_name: "", phone: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [personalSaving, setPersonalSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPersonalForm({ full_name: user.full_name || "", phone: user.phone || "" });
      setPhotoPreview(user.photo_url || null);
    }
  }, [user]);

  function handlePersonalChange(field) {
    return (event) =>
      setPersonalForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handlePersonalSubmit(event) {
    event.preventDefault();
    setPersonalSaving(true);
    try {
      await updateMe({
        full_name: personalForm.full_name.trim(),
        phone: personalForm.phone.trim(),
      });
      if (photoFile) {
        await uploadMyPhoto(photoFile);
        setPhotoFile(null);
      }
      await refreshUser();
      toast.success(t("pages.profile.updateSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.profile.saveError")));
    } finally {
      setPersonalSaving(false);
    }
  }

  // --- Password ---
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  function handlePasswordChange(field) {
    return (event) =>
      setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!passwordForm.current_password) {
      nextErrors.current_password = t("pages.profile.currentPasswordError");
    }
    if (!passwordForm.new_password) {
      nextErrors.new_password = t("pages.profile.newPasswordError");
    } else if (passwordForm.new_password.length < 6) {
      nextErrors.new_password = t("pages.profile.newPasswordLengthError");
    }
    if (passwordForm.confirm_password !== passwordForm.new_password) {
      nextErrors.confirm_password = t("pages.profile.passwordMismatchError");
    }
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordSaving(true);
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success(t("pages.profile.passwordUpdateSuccess"));
      logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.profile.passwordUpdateError")));
    } finally {
      setPasswordSaving(false);
    }
  }

  // --- Markaz: tenant info (admin only) ---
  const [tenant, setTenant] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantForm, setTenantForm] = useState(EMPTY_TENANT_FORM);
  const [tenantSaving, setTenantSaving] = useState(false);

  useEffect(() => {
    if (activeTab === "markaz" && isAdmin && tenant === null) {
      loadTenant();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  async function loadTenant() {
    setTenantLoading(true);
    try {
      const data = await getMyTenant();
      setTenant(data);
      setTenantForm({ phone: data.phone || "", address: data.address || "" });
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.profile.tenantLoadError")));
    } finally {
      setTenantLoading(false);
    }
  }

  function handleTenantChange(field) {
    return (event) =>
      setTenantForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleTenantSubmit(event) {
    event.preventDefault();
    setTenantSaving(true);
    try {
      const updated = await updateMyTenant({
        phone: tenantForm.phone.trim() || null,
        address: tenantForm.address.trim() || null,
      });
      setTenant(updated);
      toast.success(t("pages.profile.tenantUpdateSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.profile.saveError")));
    } finally {
      setTenantSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-lg font-semibold text-fg">{t("pages.profile.title")}</h1>

      <div className="mb-6 flex items-center gap-1 rounded-btn bg-surface-sunken p-1">
        <button
          type="button"
          onClick={() => switchTab("shaxsiy")}
          className={cn(
            "rounded-btn px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "shaxsiy" ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
          )}
        >
          {t("pages.profile.tabs.personal")}
        </button>
        <button
          type="button"
          onClick={() => switchTab("markaz")}
          className={cn(
            "rounded-btn px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "markaz" ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
          )}
        >
          {t("pages.profile.tabs.center")}
        </button>
      </div>

      {activeTab === "shaxsiy" ? (
        <div className="flex max-w-xl flex-col gap-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-fg">
              {t("pages.profile.personalInfo")}
            </h2>
            <form onSubmit={handlePersonalSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 flex-shrink-0">
                  <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon size={32} className="text-fg-faint" />
                    )}
                  </span>
                  <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-accent text-accent-dark shadow-card transition-colors hover:bg-accent-light">
                    <Camera size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
              </div>

              <Input
                label={t("pages.profile.name")}
                name="full_name"
                value={personalForm.full_name}
                onChange={handlePersonalChange("full_name")}
              />
              <Input
                label={t("pages.profile.phone")}
                name="phone"
                value={personalForm.phone}
                onChange={handlePersonalChange("phone")}
                placeholder="+998901234567"
              />
              <Button type="submit" className="self-start" disabled={personalSaving}>
                {personalSaving ? t("pages.profile.saving") : t("pages.profile.save")}
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-fg">
              {t("pages.profile.changePassword")}
            </h2>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4" noValidate>
              <Input
                label={t("pages.profile.currentPassword")}
                name="current_password"
                type="password"
                value={passwordForm.current_password}
                onChange={handlePasswordChange("current_password")}
                error={passwordErrors.current_password}
                autoComplete="current-password"
              />
              <Input
                label={t("pages.profile.newPassword")}
                name="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={handlePasswordChange("new_password")}
                error={passwordErrors.new_password}
                autoComplete="new-password"
              />
              <Input
                label={t("pages.profile.confirmNewPassword")}
                name="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={handlePasswordChange("confirm_password")}
                error={passwordErrors.confirm_password}
                autoComplete="new-password"
              />
              <Button type="submit" className="self-start" disabled={passwordSaving}>
                {passwordSaving ? t("pages.profile.saving") : t("pages.profile.save")}
              </Button>
            </form>
          </Card>
        </div>
      ) : !isAdmin ? (
        <EmptyState
          icon={Lock}
          title={t("pages.profile.adminOnlyTitle")}
          description={t("pages.profile.adminOnlyDescription")}
        />
      ) : (
        <div className="max-w-xl">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-fg">
              {t("pages.profile.centerInfo")}
            </h2>
            {tenantLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleTenantSubmit} className="flex flex-col gap-4">
                <Input label={t("pages.profile.centerName")} value={tenant?.name || ""} disabled />
                <Input
                  label={t("pages.profile.phone")}
                  name="phone"
                  value={tenantForm.phone}
                  onChange={handleTenantChange("phone")}
                  placeholder="+998901234567"
                />
                <Input
                  label={t("pages.profile.address")}
                  name="address"
                  value={tenantForm.address}
                  onChange={handleTenantChange("address")}
                  placeholder={t("pages.profile.addressPlaceholder")}
                />
                <Button type="submit" className="self-start" disabled={tenantSaving}>
                  {tenantSaving ? t("pages.profile.saving") : t("pages.profile.save")}
                </Button>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
