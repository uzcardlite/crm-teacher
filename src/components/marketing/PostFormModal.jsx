import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createMarketingPost, listBloggers, updateMarketingPost } from "../../api/marketing";
import { listFilials } from "../../api/filials";
import Button from "../ui/Button";
import Input from "../ui/Input";
import DateInput from "../ui/DateInput";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import { toast } from "../ui/Toast";
import { getErrorMessage, getFieldErrors, isModuleDisabledError } from "../../utils/apiError";
import { formatMoney, todayValue } from "../../constants/moliya";
import {
  DEFAULT_STATUS,
  POST_TYPE_LABELS,
  PUBLISHED_STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
} from "../../constants/marketing";

const BLOGGER_OPTIONS_SIZE = 100;

const EMPTY_FORM = {
  blogger_id: "",
  post_type: "",
  planned_date: "",
  published_date: "",
  status: DEFAULT_STATUS,
  filial_id: "",
  topic: "",
  cost: "",
  reach: "",
  clicks: "",
  manual_leads: "",
  content_note: "",
};

function formFromPost(post) {
  if (!post) return { ...EMPTY_FORM };
  return {
    blogger_id: post.blogger?.id || "",
    post_type: post.post_type || "",
    planned_date: post.planned_date || "",
    published_date: post.published_date || "",
    status: post.status || DEFAULT_STATUS,
    filial_id: post.filial_id || "",
    topic: post.topic || "",
    cost: post.cost === null || post.cost === undefined ? "" : String(post.cost),
    reach: post.reach === null || post.reach === undefined ? "" : String(post.reach),
    clicks: post.clicks === null || post.clicks === undefined ? "" : String(post.clicks),
    // PostOut carries no manual_leads field: a manual post's leads_count IS the
    // manually entered number, a linked post's number comes from student leads.
    manual_leads: post.leads_source === "manual" ? String(post.leads_count ?? "") : "",
    content_note: post.content_note || "",
  };
}

export default function PostFormModal({ open, post, onClose, onSaved }) {
  const { t } = useTranslation();
  const editing = Boolean(post);
  const leadsLinked = post?.leads_source === "linked";

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [bloggers, setBloggers] = useState([]);
  const [filials, setFilials] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(formFromPost(post));
    setErrors({});
  }, [open, post]);

  useEffect(() => {
    if (!open) return;
    listBloggers({ page: 1, size: BLOGGER_OPTIONS_SIZE, is_active: true })
      .then((data) => setBloggers(data.items || []))
      .catch((error) => {
        setBloggers([]);
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("growth.postForm.toastBloggersError")));
        }
      });
    listFilials()
      .then(setFilials)
      .catch((error) => {
        setFilials([]);
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("growth.postForm.toastFilialsError")));
        }
      });
  }, [open, t]);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function closeModal() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.blogger_id) nextErrors.blogger_id = t("growth.postForm.errors.bloggerRequired");
    if (!form.post_type) nextErrors.post_type = t("growth.postForm.errors.postTypeRequired");
    if (!form.planned_date) nextErrors.planned_date = t("growth.postForm.errors.plannedDateRequired");
    if (form.status === PUBLISHED_STATUS && !form.published_date) {
      nextErrors.published_date = t("growth.postForm.errors.publishedDateRequired");
    }
    if (
      form.published_date &&
      form.planned_date &&
      form.published_date < form.planned_date
    ) {
      nextErrors.published_date = t("growth.postForm.errors.publishedBeforePlanned");
    }
    if (form.cost === "") nextErrors.cost = t("growth.postForm.errors.costRequired");
    else if (Number(form.cost) < 0) nextErrors.cost = t("growth.common.negativeValueError");
    if (form.reach !== "" && Number(form.reach) < 0) {
      nextErrors.reach = t("growth.common.negativeValueError");
    }
    if (form.clicks !== "" && Number(form.clicks) < 0) {
      nextErrors.clicks = t("growth.common.negativeValueError");
    }
    if (form.manual_leads !== "" && Number(form.manual_leads) < 0) {
      nextErrors.manual_leads = t("growth.common.negativeValueError");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      blogger_id: form.blogger_id,
      filial_id: form.filial_id || null,
      topic: form.topic.trim() || null,
      post_type: form.post_type,
      status: form.status,
      planned_date: form.planned_date,
      published_date: form.published_date || null,
      cost: Number(form.cost),
      reach: form.reach === "" ? 0 : Number(form.reach),
      clicks: form.clicks === "" ? 0 : Number(form.clicks),
      content_note: form.content_note.trim() || null,
    };
    // Linked leads are owned by the student-leads module, never by this form.
    if (!leadsLinked) {
      payload.manual_leads = form.manual_leads === "" ? null : Number(form.manual_leads);
    }

    setSubmitting(true);
    try {
      const saved = editing
        ? await updateMarketingPost(post.id, payload)
        : await createMarketingPost(payload);
      toast.success(editing ? t("growth.postForm.toastSavedEdit") : t("growth.postForm.toastSavedCreate"));
      onClose();
      await onSaved?.(saved);
    } catch (error) {
      // A 422 keeps the modal open with the typed data intact.
      setErrors(getFieldErrors(error));
      toast.error(getErrorMessage(error, t("growth.postForm.toastSaveError")));
    } finally {
      setSubmitting(false);
    }
  }

  const leadsForCpl = leadsLinked ? Number(post?.leads_count || 0) : Number(form.manual_leads || 0);
  const costForCpl = Number(form.cost || 0);
  const liveCpl = leadsForCpl > 0 ? formatMoney(Math.round(costForCpl / leadsForCpl)) : "—";

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={editing ? t("growth.postForm.titleEdit") : t("growth.postForm.titleCreate")}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={closeModal} disabled={submitting}>
            {t("growth.common.cancel")}
          </Button>
          <Button type="submit" form="marketing-post-form" disabled={submitting}>
            {submitting ? t("growth.common.saving") : t("growth.common.save")}
          </Button>
        </>
      }
    >
      <form
        id="marketing-post-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label={t("growth.postForm.fields.blogger")}
            value={form.blogger_id}
            onChange={handleChange("blogger_id")}
            error={errors.blogger_id}
          >
            <option value="">{t("growth.postForm.fields.selectBlogger")}</option>
            {bloggers.map((blogger) => (
              <option key={blogger.id} value={blogger.id}>
                {blogger.display_name ? `@${blogger.username} — ${blogger.display_name}` : `@${blogger.username}`}
              </option>
            ))}
          </Select>
          <Select
            label={t("growth.postForm.fields.postType")}
            value={form.post_type}
            onChange={handleChange("post_type")}
            error={errors.post_type}
          >
            <option value="">{t("growth.postForm.fields.selectPostType")}</option>
            {Object.entries(POST_TYPE_LABELS).map(([key, labelKey]) => (
              <option key={key} value={key}>
                {t(labelKey)}
              </option>
            ))}
          </Select>
          <DateInput
            label={t("growth.postForm.fields.plannedDate")}
            value={form.planned_date}
            onChange={handleChange("planned_date")}
            error={errors.planned_date}
          />
          <DateInput
            label={t("growth.postForm.fields.publishedDate")}
            min={form.planned_date || undefined}
            max={todayValue()}
            value={form.published_date}
            onChange={handleChange("published_date")}
            error={errors.published_date}
          />
          <Select
            label={t("growth.postForm.fields.status")}
            value={form.status}
            onChange={handleChange("status")}
            error={errors.status}
          >
            {STATUS_ORDER.map((key) => (
              <option key={key} value={key}>
                {t(STATUS_LABELS[key])}
              </option>
            ))}
          </Select>
          <Select
            label={t("growth.postForm.fields.filial")}
            value={form.filial_id}
            onChange={handleChange("filial_id")}
            error={errors.filial_id}
          >
            <option value="">{t("growth.postForm.fields.filialGeneral")}</option>
            {filials.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.name}
              </option>
            ))}
          </Select>
          <div className="md:col-span-2">
            <Input
              label={t("growth.postForm.fields.topic")}
              maxLength={200}
              value={form.topic}
              onChange={handleChange("topic")}
              error={errors.topic}
            />
          </div>
          <Input
            label={t("growth.postForm.fields.cost")}
            type="number"
            min="0"
            value={form.cost}
            onChange={handleChange("cost")}
            error={errors.cost}
          />
          <Input
            label={t("growth.postForm.fields.reach")}
            type="number"
            min="0"
            value={form.reach}
            onChange={handleChange("reach")}
            error={errors.reach}
          />
          <Input
            label={t("growth.postForm.fields.clicks")}
            type="number"
            min="0"
            value={form.clicks}
            onChange={handleChange("clicks")}
            error={errors.clicks}
          />
          <div className="flex flex-col gap-1">
            <Input
              label={t("growth.postForm.fields.manualLeads")}
              type="number"
              min="0"
              disabled={leadsLinked}
              value={leadsLinked ? String(post?.leads_count ?? "") : form.manual_leads}
              onChange={handleChange("manual_leads")}
              error={errors.manual_leads}
            />
            {leadsLinked && (
              <p className="text-xs text-fg-muted">
                {t("growth.postForm.fields.manualLeadsHint")}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <Textarea
              label={t("growth.postForm.fields.contentNote")}
              rows={2}
              maxLength={2000}
              value={form.content_note}
              onChange={handleChange("content_note")}
              error={errors.content_note}
            />
          </div>
          <p className="text-xs text-fg-muted md:col-span-2">CPL: {liveCpl}</p>
        </div>
      </form>
    </Modal>
  );
}
