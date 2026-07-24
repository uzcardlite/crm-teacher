import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createBlogger, updateBlogger } from "../../api/marketing";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import { toast } from "../ui/Toast";
import { getErrorMessage, getFieldErrors } from "../../utils/apiError";
import { CHANNEL_LABELS } from "../../constants/marketing";

const EMPTY_FORM = {
  username: "",
  channel: "",
  display_name: "",
  profile_url: "",
  followers: "",
  phone: "",
  tags: "",
  notes: "",
  is_active: "true",
};

function formFromBlogger(blogger) {
  if (!blogger) return { ...EMPTY_FORM };
  return {
    username: blogger.username || "",
    channel: blogger.channel || "",
    display_name: blogger.display_name || "",
    profile_url: blogger.profile_url || "",
    followers: blogger.followers === null || blogger.followers === undefined ? "" : String(blogger.followers),
    phone: blogger.phone || "",
    tags: (blogger.tags || []).join(", "),
    notes: blogger.notes || "",
    is_active: blogger.is_active === false ? "false" : "true",
  };
}

export default function BloggerFormModal({ open, blogger, onClose, onSaved }) {
  const { t } = useTranslation();
  const editing = Boolean(blogger);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromBlogger(blogger));
      setErrors({});
    }
  }, [open, blogger]);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function closeModal() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // The backend stores the username without "@", so strip it client-side too.
    const username = form.username.trim().replace(/^@+/, "").trim();
    const profileUrl = form.profile_url.trim();
    const phone = form.phone.trim();

    const nextErrors = {};
    if (!username) nextErrors.username = t("growth.bloggerForm.errors.usernameRequired");
    else if (username.length > 120) nextErrors.username = t("growth.bloggerForm.errors.usernameTooLong");
    if (!form.channel) nextErrors.channel = t("growth.bloggerForm.errors.channelRequired");
    if (profileUrl && !/^https?:\/\//i.test(profileUrl)) {
      nextErrors.profile_url = t("growth.bloggerForm.errors.profileUrlInvalid");
    }
    if (form.followers !== "" && Number(form.followers) < 0) {
      nextErrors.followers = t("growth.common.negativeValueError");
    }
    if (phone && !/^\+998\d{9}$/.test(phone)) {
      nextErrors.phone = t("growth.bloggerForm.errors.phoneInvalid");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      username,
      channel: form.channel,
      display_name: form.display_name.trim() || null,
      profile_url: profileUrl || null,
      followers: form.followers === "" ? null : Number(form.followers),
      phone: phone || null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: form.notes.trim() || null,
      is_active: form.is_active === "true",
    };

    setSubmitting(true);
    try {
      const saved = editing ? await updateBlogger(blogger.id, payload) : await createBlogger(payload);
      toast.success(editing ? t("growth.bloggerForm.toastSavedEdit") : t("growth.bloggerForm.toastSavedCreate"));
      onClose();
      await onSaved?.(saved);
    } catch (error) {
      // A 422 keeps the modal open with the typed data intact.
      setErrors(getFieldErrors(error));
      toast.error(getErrorMessage(error, t("growth.bloggerForm.toastSaveError")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={editing ? t("growth.bloggerForm.titleEdit") : t("growth.bloggerForm.titleCreate")}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal} disabled={submitting}>
            {t("growth.common.cancel")}
          </Button>
          <Button type="submit" form="marketing-blogger-form" disabled={submitting}>
            {submitting ? t("growth.common.saving") : t("growth.common.save")}
          </Button>
        </>
      }
    >
      <form
        id="marketing-blogger-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label={t("growth.bloggerForm.fields.username")}
            placeholder={t("growth.bloggerForm.fields.usernamePlaceholder")}
            maxLength={120}
            value={form.username}
            onChange={handleChange("username")}
            error={errors.username}
          />
          <Select
            label={t("growth.bloggerForm.fields.channel")}
            value={form.channel}
            onChange={handleChange("channel")}
            error={errors.channel}
          >
            <option value="">{t("growth.bloggerForm.fields.selectChannel")}</option>
            {Object.entries(CHANNEL_LABELS).map(([key, labelKey]) => (
              <option key={key} value={key}>
                {t(labelKey)}
              </option>
            ))}
          </Select>
          <Input
            label={t("growth.bloggerForm.fields.displayName")}
            maxLength={120}
            value={form.display_name}
            onChange={handleChange("display_name")}
            error={errors.display_name}
          />
          <Input
            label={t("growth.bloggerForm.fields.profileUrl")}
            type="url"
            placeholder="https://..."
            value={form.profile_url}
            onChange={handleChange("profile_url")}
            error={errors.profile_url}
          />
          <Input
            label={t("growth.bloggerForm.fields.followers")}
            type="number"
            min="0"
            value={form.followers}
            onChange={handleChange("followers")}
            error={errors.followers}
          />
          <Input
            label={t("growth.bloggerForm.fields.phone")}
            type="tel"
            placeholder="+998901234567"
            value={form.phone}
            onChange={handleChange("phone")}
            error={errors.phone}
          />
          {editing && (
            <Select
              label={t("growth.bloggerForm.fields.status")}
              value={form.is_active}
              onChange={handleChange("is_active")}
            >
              <option value="true">{t("growth.bloggerForm.fields.active")}</option>
              <option value="false">{t("growth.bloggerForm.fields.inactive")}</option>
            </Select>
          )}
          <div className="md:col-span-2">
            <Input
              label={t("growth.bloggerForm.fields.tags")}
              placeholder={t("growth.bloggerForm.fields.tagsPlaceholder")}
              value={form.tags}
              onChange={handleChange("tags")}
              error={errors.tags}
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label={t("growth.bloggerForm.fields.notes")}
              rows={2}
              maxLength={2000}
              value={form.notes}
              onChange={handleChange("notes")}
              error={errors.notes}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
