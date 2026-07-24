import { useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

const EMPTY_FORM = { subject: "", message: "" };

export default function ContactAdmin() {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.subject.trim()) nextErrors.subject = t("pages.contactAdmin.subjectError");
    if (!form.message.trim()) nextErrors.message = t("pages.contactAdmin.messageError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSending(true);
    try {
      // This feature is not yet wired to the backend — coming soon.
      await new Promise((resolve) => setTimeout(resolve, 400));
      toast.error(t("pages.contactAdmin.notReady"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-lg font-semibold text-fg">{t("pages.contactAdmin.title")}</h1>

      <div className="max-w-xl">
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label={t("pages.contactAdmin.subjectLabel")}
              name="subject"
              value={form.subject}
              onChange={handleChange("subject")}
              error={errors.subject}
              placeholder={t("pages.contactAdmin.subjectPlaceholder")}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-sm font-medium text-fg-secondary">
                {t("pages.contactAdmin.messageLabel")}
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange("message")}
                placeholder={t("pages.contactAdmin.messagePlaceholder")}
                className="rounded-btn border border-line-strong px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {errors.message && (
                <p className="text-xs text-danger">{errors.message}</p>
              )}
            </div>
            <Button type="submit" className="self-start" disabled={sending}>
              {sending ? t("pages.contactAdmin.sending") : t("pages.contactAdmin.send")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
