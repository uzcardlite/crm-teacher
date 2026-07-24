import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { isTeacherUser } from "../../utils/authRole";
import { PHONE_PREFIX, normalizePhoneValue } from "../../utils/phone";

// Label + input + one line of error text — the height is reserved up front.
const FIELD_SLOT_CLASS = "min-h-[86px]";

export default function Login() {
  const { t } = useTranslation();
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState(PHONE_PREFIX);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (phone.replace(PHONE_PREFIX, "").length < 9) {
      nextErrors.phone = t("auth.login.phoneError");
    }
    if (!password) nextErrors.password = t("auth.login.passwordError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const me = await login(phone.trim(), password);
      // This app is the teacher cabinet only. Anyone who is not a teacher
      // (admin, super admin) is signed straight back out with a message —
      // they belong in the main CRM, not here.
      if (!isTeacherUser(me)) {
        logout();
        toast.error(t("auth.login.notTeacher"));
        return;
      }
      const requestedPath = location.state?.from?.pathname;
      const destination =
        requestedPath && requestedPath.startsWith("/teacher") ? requestedPath : "/teacher/dashboard";
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, t("auth.login.genericError")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-card">
            <img src="/logo.svg" alt="Logo" className="h-full w-full object-cover" />
          </span>
          <h1 className="text-xl font-semibold text-fg">{t("auth.login.heading")}</h1>
          <p className="text-sm text-fg-muted">{t("auth.login.subheading")}</p>
        </div>

        <Card padding="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
            {/* Each field reserves the height of its error line, so showing a
                validation message never shifts the rest of the form. */}
            <div className={FIELD_SLOT_CLASS}>
              <Input
                label={t("auth.login.phoneLabel")}
                name="phone"
                type="tel"
                placeholder="+998901234567"
                value={phone}
                onChange={(event) => setPhone(normalizePhoneValue(event.target.value))}
                error={errors.phone}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className={FIELD_SLOT_CLASS}>
              <Input
                label={t("auth.login.passwordLabel")}
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={errors.password}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
              {submitting && <Spinner size={16} />}
              {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
