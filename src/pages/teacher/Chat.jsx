import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessagesSquare, Plus } from "lucide-react";
import {
  createChatThread,
  listChatThreads,
  listMyGroups,
  listMyGroupStudents,
} from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatChatTimestamp } from "../../utils/format";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-3 px-4 pb-24 pt-4";

// Teacher-side chat inbox: a list of parent conversations, newest first
// (ordered by the backend), plus a "new conversation" modal that opens or
// reuses a thread for a chosen student.
export default function Chat() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ group_id: "", student_id: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listChatThreads()
      .then(setThreads)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.chat.loadError"))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNewChat() {
    setForm({ group_id: "", student_id: "" });
    setStudents([]);
    setErrors({});
    setModalOpen(true);
    if (groups.length === 0) {
      listMyGroups()
        .then(setGroups)
        .catch((error) => toast.error(getErrorMessage(error, t("teacher.chat.loadError"))));
    }
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function handleGroupChange(event) {
    const groupId = event.target.value;
    setForm({ group_id: groupId, student_id: "" });
    setErrors({});
    setStudents([]);
    if (!groupId) return;
    listMyGroupStudents(groupId)
      .then(setStudents)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.chat.loadError"))));
  }

  async function handleStart(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.group_id) nextErrors.group_id = t("teacher.chat.groupError");
    if (!form.student_id) nextErrors.student_id = t("teacher.chat.studentError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const thread = await createChatThread({ student_id: form.student_id });
      setModalOpen(false);
      navigate(`/teacher/chat/${thread.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.chat.createError")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={PAGE_CLASS}>
      <Button variant="secondary" className="w-full" onClick={openNewChat}>
        <Plus size={16} />
        {t("teacher.chat.newThread")}
      </Button>

      {loading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} padding="p-4" className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </Card>
        ))
      ) : threads.length === 0 ? (
        <EmptyState
          size="md"
          icon={MessagesSquare}
          title={t("teacher.chat.emptyTitle")}
          description={t("teacher.chat.emptyDescription")}
        />
      ) : (
        threads.map((thread) => (
          <Card
            key={thread.id}
            padding="p-4"
            hoverable
            className="flex cursor-pointer items-center gap-3"
            onClick={() => navigate(`/teacher/chat/${thread.id}`)}
          >
            <Avatar photoUrl={thread.photo_url} name={thread.student_full_name} size="sm" />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm text-fg",
                  thread.unread_count > 0 ? "font-semibold" : "font-medium",
                )}
              >
                {thread.student_full_name}
              </p>
              <p
                className={cn(
                  "truncate text-xs line-clamp-1",
                  thread.unread_count > 0 ? "font-medium text-fg" : "text-fg-muted",
                )}
              >
                {thread.last_message_body || t("teacher.chat.noMessages")}
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <span className="text-xs text-fg-faint">
                {formatChatTimestamp(thread.last_message_at)}
              </span>
              {thread.unread_count > 0 && (
                <Badge variant="info">{thread.unread_count}</Badge>
              )}
            </div>
          </Card>
        ))
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t("teacher.chat.newThread")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button type="submit" form="teacher-chat-new-form" disabled={submitting}>
              {submitting ? t("teacher.common.saving") : t("teacher.chat.start")}
            </Button>
          </>
        }
      >
        <form
          id="teacher-chat-new-form"
          onSubmit={handleStart}
          className="flex flex-col gap-4"
          noValidate
        >
          <Select
            label={t("teacher.chat.selectGroup")}
            value={form.group_id}
            onChange={handleGroupChange}
            error={errors.group_id}
          >
            <option value="">{t("teacher.chat.selectGroup")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>

          <Select
            label={t("teacher.chat.selectStudent")}
            value={form.student_id}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, student_id: event.target.value }))
            }
            error={errors.student_id}
            disabled={!form.group_id}
          >
            <option value="">{t("teacher.chat.selectStudent")}</option>
            {students.map((student) => (
              <option key={student.student_id} value={student.student_id}>
                {student.student_full_name}
              </option>
            ))}
          </Select>
        </form>
      </Modal>
    </div>
  );
}
