import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { remindDebtors } from "../../api/finance";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import Textarea from "../ui/Textarea";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { CHANNEL_LABELS, monthToApi } from "../../constants/moliya";

// Three states inside one modal: setup -> sending -> per-student result list.
export default function ReminderModal({ open, onClose, students, month, onSent }) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState("telegram");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setChannel("telegram");
    setMessage("");
    setSending(false);
    setResult(null);
  }, [open]);

  async function handleSend() {
    if (students.length === 0) {
      toast.error(t("finance.reminder.atLeastOne"));
      return;
    }
    setSending(true);
    try {
      const data = await remindDebtors({
        student_ids: students.map((student) => student.student_id),
        month: monthToApi(month),
        channel,
        message: message.trim() || null,
      });
      setResult(data);
      toast.success(t("finance.reminder.sent"));
      await onSent?.();
    } catch (error) {
      toast.error(getErrorMessage(error, t("finance.reminder.sendError")));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !sending && onClose()}
      title={t("finance.reminder.title")}
      size="lg"
      footer={
        result ? (
          <Button onClick={onClose}>{t("common.close")}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              {t("finance.common.cancel")}
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? t("finance.reminder.sending") : t("finance.reminder.send")}
            </Button>
          </>
        )
      }
    >
      {sending ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted">{t("finance.reminder.sendingList")}</p>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      ) : result ? (
        <>
          <p className="mb-3 text-sm text-fg-muted">
            {t("finance.reminder.resultSummary", {
              sent: result.sent,
              failed: result.failed + result.skipped,
            })}
          </p>
          <ul className="max-h-64 divide-y divide-line overflow-y-auto">
            {result.results.map((item) => (
              <li
                key={item.student_id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="truncate text-sm text-fg-secondary">{item.student_full_name}</span>
                {item.status === "sent" ? (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-success">
                    <Check size={14} /> {t("finance.reminder.statusSent")}
                  </span>
                ) : (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-danger">
                    <X size={14} /> {item.error || t("finance.reminder.statusFailed")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-muted">
            <Trans
              i18nKey="finance.reminder.recipientsInfo"
              count={students.length}
              values={{ count: students.length }}
              components={{ bold: <span className="font-medium text-fg" /> }}
            />
          </p>
          <Select
            label={t("finance.reminder.channelLabel")}
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            {Object.entries(CHANNEL_LABELS).map(([key, labelKey]) => (
              <option key={key} value={key}>
                {t(labelKey)}
              </option>
            ))}
          </Select>
          <Textarea
            label={t("finance.reminder.messageLabel")}
            rows={3}
            maxLength={500}
            placeholder={t("finance.reminder.messagePlaceholder")}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <p className="text-xs text-fg-faint">{t("finance.reminder.telegramNote")}</p>
        </div>
      )}
    </Modal>
  );
}
