import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Camera,
  Check,
  Eye,
  EyeOff,
  Headset,
  Info,
  LayoutGrid,
  Lock,
  Palette,
  Send,
  Star,
  User as UserIcon,
} from "lucide-react";
import { changePassword, updateMe, updateTabBarPrefs, uploadMyPhoto } from "../../api/auth";
import {
  getGradingSettings,
  getNotificationSettings,
  updateGradingSettings,
  updateNotificationSettings,
} from "../../api/teacher";
import { useAuth } from "../../context/AuthContext";
import { useTenantModules } from "../../context/TenantModulesContext";
import { TEACHER_NAV_ITEMS } from "../../constants/teacherNav";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";
import {
  getStoredTheme,
  setLanguage as applyLanguage,
  setTheme as applyTheme,
} from "../../utils/appearance";
import { getStoredLang } from "../../i18n";
import {
  DAILY_GRADE_PRESETS,
  MAX_DAILY_GRADE_MAX,
  MIN_DAILY_GRADE_MAX,
} from "../../utils/grading";
import { normalizePrefs, orderNavItems } from "../../utils/tabBarPrefs";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// Section shell: an icon + title strip over the card body, so the screen reads
// as a short list of topics rather than one long form.
function Section({ icon: Icon, title, description, children }) {
  return (
    <Card padding="p-4">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-btn bg-accent-light/25 text-accent-dark dark:text-accent">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-fg">{title}</h2>
          {description && <p className="text-xs text-fg-muted">{description}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors",
        checked ? "bg-accent" : "bg-line-strong",
        disabled && "opacity-50",
      )}
    >
      <span
        className={cn(
          "h-4 w-4 rounded-full bg-white shadow-card transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

// A row of mutually exclusive choices (theme, language, grading preset).
function ChoiceRow({ options, value, onChange, columns = 3 }) {
  return (
    <div className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {options.map((option) => {
        const isActive = String(option.value) === String(value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-btn border px-2 text-sm font-medium transition-colors",
              isActive
                ? "border-accent bg-accent-light/25 text-accent-dark dark:text-accent"
                : "border-line-strong text-fg-secondary hover:bg-surface-sunken",
            )}
          >
            {isActive && <Check size={14} className="shrink-0" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const { hasPermission } = useTenantModules();
  const fileInputRef = useRef(null);

  // --- Profil ---
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileForm({ full_name: user.full_name || "", phone: user.phone || "" });
    setPhotoPreview(user.photo_url || null);
  }, [user]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileSaving(true);
    try {
      await updateMe({
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim(),
      });
      if (photoFile) {
        await uploadMyPhoto(photoFile);
        setPhotoFile(null);
      }
      await refreshUser();
      toast.success(t("teacher.settings.profileSaved"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.settings.saveError")));
    } finally {
      setProfileSaving(false);
    }
  }

  // --- Xavfsizlik ---
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    const errors = {};
    if (!passwordForm.current_password) {
      errors.current_password = t("teacher.settings.currentPasswordError");
    }
    if (passwordForm.new_password.length < 6) {
      errors.new_password = t("teacher.settings.newPasswordLengthError");
    }
    if (passwordForm.confirm_password !== passwordForm.new_password) {
      errors.confirm_password = t("teacher.settings.passwordMismatchError");
    }
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPasswordSaving(true);
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      // The backend rotates the refresh token, so the current session is no
      // longer valid — sign out rather than leave a half-dead session behind.
      toast.success(t("teacher.settings.passwordSaved"));
      logout();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.settings.passwordError")));
    } finally {
      setPasswordSaving(false);
    }
  }

  // --- Baholash ---
  const [grading, setGrading] = useState(null);
  const [gradingLoading, setGradingLoading] = useState(true);
  const [customScale, setCustomScale] = useState("");
  const [examScale, setExamScale] = useState("");

  useEffect(() => {
    getGradingSettings()
      .then((data) => {
        setGrading(data);
        setExamScale(String(Number(data.exam_grade_max)));
        if (!DAILY_GRADE_PRESETS.includes(data.daily_grade_max)) {
          setCustomScale(String(data.daily_grade_max));
        }
      })
      .catch((error) =>
        toast.error(getErrorMessage(error, t("teacher.settings.loadError"))),
      )
      .finally(() => setGradingLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveGrading(payload, previous) {
    setGrading((prev) => ({ ...prev, ...payload }));
    try {
      setGrading(await updateGradingSettings(payload));
    } catch (error) {
      setGrading(previous); // roll the control back to what the server still holds
      toast.error(getErrorMessage(error, t("teacher.settings.saveError")));
    }
  }

  function handleDailyScale(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return;
    if (parsed < MIN_DAILY_GRADE_MAX || parsed > MAX_DAILY_GRADE_MAX) {
      toast.error(
        t("teacher.settings.scaleRangeError", {
          min: MIN_DAILY_GRADE_MAX,
          max: MAX_DAILY_GRADE_MAX,
        }),
      );
      return;
    }
    saveGrading({ daily_grade_max: parsed }, grading);
  }

  // --- Ko'rinish ---
  const [theme, setThemeState] = useState(getStoredTheme);
  const [lang, setLangState] = useState(getStoredLang);

  // --- Tab-bar tartibi ---
  const allowedNavItems = useMemo(
    () =>
      TEACHER_NAV_ITEMS.filter(
        (item) =>
          !item.headerOnly && (!item.permission || hasPermission(item.permission)),
      ),
    [hasPermission],
  );
  const [navPrefs, setNavPrefs] = useState(() => normalizePrefs(user?.sidebar_prefs));

  useEffect(() => {
    setNavPrefs(normalizePrefs(user?.sidebar_prefs));
  }, [user?.sidebar_prefs]);

  const orderedNav = useMemo(
    () => orderNavItems(allowedNavItems, navPrefs),
    [allowedNavItems, navPrefs],
  );

  async function persistNavPrefs(next) {
    const previous = navPrefs;
    setNavPrefs(next);
    try {
      await updateTabBarPrefs(next);
      await refreshUser();
    } catch (error) {
      setNavPrefs(previous);
      toast.error(getErrorMessage(error, t("teacher.settings.saveError")));
    }
  }

  function moveNavItem(path, direction) {
    const order = orderedNav.map((item) => item.to);
    const index = order.indexOf(path);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    persistNavPrefs({ ...navPrefs, order });
  }

  function toggleNavHidden(path) {
    const hidden = navPrefs.hidden.includes(path)
      ? navPrefs.hidden.filter((item) => item !== path)
      : [...navPrefs.hidden, path];
    // Keep the current visual order, otherwise hiding an item would also
    // silently reshuffle the rest on the next render.
    persistNavPrefs({ order: orderedNav.map((item) => item.to), hidden });
  }

  // --- Bildirishnomalar ---
  const [notifications, setNotifications] = useState(null);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    getNotificationSettings()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setNotificationsLoading(false));
  }, []);

  async function toggleNotification(value) {
    const previous = notifications;
    setNotifications((prev) => ({ ...prev, notify_parent_message: value }));
    try {
      setNotifications(await updateNotificationSettings({ notify_parent_message: value }));
    } catch (error) {
      setNotifications(previous);
      toast.error(getErrorMessage(error, t("teacher.settings.saveError")));
    }
  }

  return (
    <div className={PAGE_CLASS}>
      {/* Profil */}
      <Section icon={UserIcon} title={t("teacher.settings.profileTitle")}>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative shrink-0 rounded-full transition-opacity hover:opacity-80"
              aria-label={t("teacher.settings.changePhoto")}
            >
              <Avatar photoUrl={photoPreview} name={profileForm.full_name} size="lg" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg shadow-card">
                <Camera size={12} />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(file));
              }}
            />
            <p className="text-xs text-fg-muted">{t("teacher.settings.photoHint")}</p>
          </div>

          <Input
            label={t("teacher.settings.fullName")}
            value={profileForm.full_name}
            onChange={(event) =>
              setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))
            }
          />
          <Input
            label={t("teacher.settings.phone")}
            value={profileForm.phone}
            onChange={(event) =>
              setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
            }
          />
          <Button type="submit" disabled={profileSaving} className="w-full">
            {profileSaving ? t("teacher.common.saving") : t("teacher.settings.save")}
          </Button>
        </form>
      </Section>

      {/* Baholash */}
      <Section
        icon={Star}
        title={t("teacher.settings.gradingTitle")}
        description={t("teacher.settings.gradingDescription")}
      >
        {gradingLoading || !grading ? (
          <Skeleton className="h-24 w-full rounded-btn" />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-secondary">
                {t("teacher.settings.dailyScale")}
              </span>
              <ChoiceRow
                columns={2}
                value={grading.daily_grade_max}
                onChange={(value) => {
                  setCustomScale("");
                  handleDailyScale(value);
                }}
                options={DAILY_GRADE_PRESETS.map((preset) => ({
                  value: preset,
                  label: t("teacher.settings.scaleOption", { max: preset }),
                }))}
              />
              <div className="flex items-end gap-2">
                <Input
                  label={t("teacher.settings.customScale")}
                  type="number"
                  min={MIN_DAILY_GRADE_MAX}
                  max={MAX_DAILY_GRADE_MAX}
                  value={customScale}
                  onChange={(event) => setCustomScale(event.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={() => handleDailyScale(customScale)}
                  disabled={!customScale}
                >
                  {t("teacher.settings.apply")}
                </Button>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Input
                label={t("teacher.settings.examScale")}
                type="number"
                min={1}
                max={1000}
                value={examScale}
                onChange={(event) => setExamScale(event.target.value)}
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={() =>
                  saveGrading({ exam_grade_max: Number(examScale) }, grading)
                }
                disabled={!examScale}
              >
                {t("teacher.settings.apply")}
              </Button>
            </div>

            {/* The single most important thing to know before touching these
                controls, so nobody fears losing last month's marks. */}
            <p className="rounded-btn bg-surface-sunken px-3 py-2 text-xs text-fg-muted">
              {t("teacher.settings.scaleNotice")}
            </p>
          </>
        )}
      </Section>

      {/* Ko'rinish */}
      <Section icon={Palette} title={t("teacher.settings.appearanceTitle")}>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-secondary">
            {t("teacher.settings.theme")}
          </span>
          <ChoiceRow
            value={theme}
            onChange={(value) => setThemeState(applyTheme(value))}
            options={[
              { value: "light", label: t("teacher.settings.themeLight") },
              { value: "dark", label: t("teacher.settings.themeDark") },
              { value: "system", label: t("teacher.settings.themeSystem") },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-secondary">
            {t("profile.language")}
          </span>
          <ChoiceRow
            columns={2}
            value={lang}
            onChange={(value) => setLangState(applyLanguage(value))}
            options={[
              { value: "uz", label: t("profile.languageUz") },
              { value: "ru", label: t("profile.languageRu") },
            ]}
          />
        </div>
      </Section>

      {/* Tab-bar */}
      <Section
        icon={LayoutGrid}
        title={t("teacher.settings.tabBarTitle")}
        description={t("teacher.settings.tabBarDescription")}
      >
        <ul className="flex flex-col gap-1">
          {orderedNav.map((item, index) => {
            const isHidden = navPrefs.hidden.includes(item.to);
            return (
              <li
                key={item.to}
                className="flex items-center gap-2 rounded-btn px-1 py-1.5"
              >
                <item.icon
                  size={18}
                  className={cn("shrink-0", isHidden ? "text-fg-faint" : "text-fg-muted")}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    isHidden ? "text-fg-faint line-through" : "text-fg-secondary",
                  )}
                >
                  {t(item.labelKey)}
                </span>
                <button
                  type="button"
                  onClick={() => moveNavItem(item.to, -1)}
                  disabled={index === 0}
                  aria-label={t("teacher.settings.moveUp")}
                  className="flex h-8 w-8 items-center justify-center rounded-btn text-fg-muted transition-colors hover:bg-surface-sunken disabled:opacity-30"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveNavItem(item.to, 1)}
                  disabled={index === orderedNav.length - 1}
                  aria-label={t("teacher.settings.moveDown")}
                  className="flex h-8 w-8 items-center justify-center rounded-btn text-fg-muted transition-colors hover:bg-surface-sunken disabled:opacity-30"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleNavHidden(item.to)}
                  aria-label={t("teacher.settings.toggleVisibility")}
                  className="flex h-8 w-8 items-center justify-center rounded-btn text-fg-muted transition-colors hover:bg-surface-sunken"
                >
                  {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Bildirishnomalar */}
      <Section icon={Bell} title={t("teacher.settings.notificationsTitle")}>
        {notificationsLoading || !notifications ? (
          <Skeleton className="h-16 w-full rounded-btn" />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Send size={16} className="shrink-0 text-fg-faint" />
              <span className="min-w-0 flex-1 text-sm text-fg-secondary">
                {t("teacher.settings.telegramStatus")}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  notifications.telegram_linked
                    ? "bg-success-bg text-success"
                    : "bg-surface-sunken text-fg-muted",
                )}
              >
                {notifications.telegram_linked
                  ? t("teacher.settings.telegramLinked")
                  : t("teacher.settings.telegramNotLinked")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 text-sm text-fg-secondary">
                {t("teacher.settings.notifyParentMessage")}
              </span>
              <Switch
                checked={notifications.notify_parent_message}
                onChange={toggleNotification}
                label={t("teacher.settings.notifyParentMessage")}
              />
            </div>

            {/* Without a linked chat the switch above changes a stored value
                that nothing can act on — say so rather than imply otherwise. */}
            {!notifications.telegram_linked && (
              <p className="rounded-btn bg-surface-sunken px-3 py-2 text-xs text-fg-muted">
                {t("teacher.settings.telegramHint")}
              </p>
            )}
          </>
        )}
      </Section>

      {/* Xavfsizlik */}
      <Section
        icon={Lock}
        title={t("teacher.settings.securityTitle")}
        description={t("teacher.settings.securityDescription")}
      >
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <Input
            label={t("teacher.settings.currentPassword")}
            type="password"
            value={passwordForm.current_password}
            error={passwordErrors.current_password}
            onChange={(event) =>
              setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))
            }
          />
          <Input
            label={t("teacher.settings.newPassword")}
            type="password"
            value={passwordForm.new_password}
            error={passwordErrors.new_password}
            onChange={(event) =>
              setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))
            }
          />
          <Input
            label={t("teacher.settings.confirmPassword")}
            type="password"
            value={passwordForm.confirm_password}
            error={passwordErrors.confirm_password}
            onChange={(event) =>
              setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))
            }
          />
          <Button type="submit" variant="secondary" disabled={passwordSaving} className="w-full">
            {passwordSaving ? t("teacher.common.saving") : t("teacher.settings.changePassword")}
          </Button>
        </form>
      </Section>

      {/* Ilova haqida */}
      <Section icon={Info} title={t("teacher.settings.aboutTitle")}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-secondary">{t("teacher.settings.version")}</span>
          <span className="tabular-nums text-fg-muted">{APP_VERSION}</span>
        </div>
        <a
          href="https://t.me/ncrm_support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-btn border border-line-strong px-3 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-sunken"
        >
          <Headset size={16} className="shrink-0 text-fg-faint" />
          {t("teacher.settings.contactAdmin")}
        </a>
      </Section>
    </div>
  );
}
