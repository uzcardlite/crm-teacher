import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckSquare, MessagesSquare, Plus, Send, Square, UsersRound } from "lucide-react";
import {
  createChatThread,
  listChatThreads,
  listMyGroups,
  listMyGroupStudents,
  sendChatMessage,
} from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import KoshinStar from "../../components/ui/KoshinStar";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatChatTimestamp } from "../../utils/format";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";

// Teacher-side chat inbox. Threads are grouped into sections by the student's
// group (backend denormalizes group_name onto each thread); inside a section
// the backend's last_message_at DESC order is preserved. Two entry points:
// a single new conversation, and a group broadcast that sends the same
// message to every selected student's parent.
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

  // Broadcast modal state: its own group/students copy so the two modals
  // never fight over the shared students list.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [bulkStudents, setBulkStudents] = useState([]);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkBody, setBulkBody] = useState("");
  const [bulkErrors, setBulkErrors] = useState({});
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadThreads() {
    return listChatThreads()
      .then(setThreads)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.chat.loadError"))))
      .finally(() => setLoading(false));
  }

  function ensureGroups() {
    if (groups.length === 0) {
      listMyGroups()
        .then(setGroups)
        .catch((error) => toast.error(getErrorMessage(error, t("teacher.chat.loadError"))));
    }
  }

  // Sections keyed by group name, in the order groups first appear in the
  // (already recency-sorted) thread list, so the most recently active group
  // floats to the top. Threads without a group fall into one trailing bucket.
  const sections = useMemo(() => {
    const byGroup = new Map();
    for (const thread of threads) {
      const key = thread.group_name || t("teacher.chat.noGroup");
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(thread);
    }
    return Array.from(byGroup.entries());
  }, [threads, t]);

  function openNewChat() {
    setForm({ group_id: "", student_id: "" });
    setStudents([]);
    setErrors({});
    setModalOpen(true);
    ensureGroups();
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

  function openBulk() {
    setBulkGroupId("");
    setBulkStudents([]);
    setBulkSelected(new Set());
    setBulkBody("");
    setBulkErrors({});
    setBulkProgress(0);
    setBulkOpen(true);
    ensureGroups();
  }

  function closeBulk() {
    if (bulkSending) return;
    setBulkOpen(false);
  }

  function handleBulkGroupChange(event) {
    const groupId = event.target.value;
    setBulkGroupId(groupId);
    setBulkStudents([]);
    setBulkSelected(new Set());
    setBulkErrors({});
    if (!groupId) return;
    listMyGroupStudents(groupId)
      .then((list) => {
        setBulkStudents(list);
        // Broadcast usually means "everyone" — preselect the full roster.
        setBulkSelected(new Set(list.map((s) => s.student_id)));
      })
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.chat.loadError"))));
  }

  function toggleBulkStudent(studentId) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleBulkAll() {
    setBulkSelected((prev) =>
      prev.size === bulkStudents.length
        ? new Set()
        : new Set(bulkStudents.map((s) => s.student_id)),
    );
  }

  async function handleBulkSend(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!bulkGroupId) nextErrors.group = t("teacher.chat.groupError");
    if (bulkSelected.size === 0) nextErrors.students = t("teacher.chat.bulkNoStudents");
    if (!bulkBody.trim()) nextErrors.body = t("teacher.chat.bulkBodyError");
    setBulkErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBulkSending(true);
    setBulkProgress(0);
    const targets = bulkStudents.filter((s) => bulkSelected.has(s.student_id));
    let sent = 0;
    let failed = 0;
    // Sequential on purpose: dozens of parallel thread-create calls would
    // hammer the API and make partial failures unreadable.
    for (const student of targets) {
      try {
        const thread = await createChatThread({ student_id: student.student_id });
        await sendChatMessage(thread.id, bulkBody.trim());
        sent += 1;
      } catch {
        failed += 1;
      }
      setBulkProgress(sent + failed);
    }
    setBulkSending(false);
    setBulkOpen(false);
    if (failed === 0) {
      toast.success(t("teacher.chat.bulkSuccess", { count: sent }));
    } else {
      toast.error(t("teacher.chat.bulkPartial", { sent, failed }));
    }
    setLoading(true);
    loadThreads();
  }

  const allSelected = bulkStudents.length > 0 && bulkSelected.size === bulkStudents.length;

  return (
    <div className={PAGE_CLASS}>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={openNewChat}>
          <Plus size={16} />
          {t("teacher.chat.newThread")}
        </Button>
        <Button onClick={openBulk}>
          <UsersRound size={16} />
          {t("teacher.chat.bulkButton")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} padding="p-4" className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </Card>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          size="md"
          icon={MessagesSquare}
          title={t("teacher.chat.emptyTitle")}
          description={t("teacher.chat.emptyDescription")}
        />
      ) : (
        sections.map(([groupName, groupThreads]) => (
          <section key={groupName} className="space-y-2">
            {/* Group section header: koshin chip + name + thread count. */}
            <div className="flex items-center gap-2 px-0.5 pt-1">
              <KoshinStar size={13} strokeWidth={8} className="text-accent" />
              <h2 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-fg-muted">
                {groupName}
              </h2>
              <span className="text-xs text-fg-faint">{groupThreads.length}</span>
            </div>
            {groupThreads.map((thread) => (
              <Card
                key={thread.id}
                padding="p-4"
                hoverable
                className="relative flex cursor-pointer items-center gap-3 overflow-hidden"
                onClick={() => navigate(`/teacher/chat/${thread.id}`)}
              >
                <KoshinStar
                  size={44}
                  className="pointer-events-none absolute -right-3 -top-3 text-accent/[0.06]"
                />
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
            ))}
          </section>
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

      {/* Group broadcast: pick a group, tick students (all preselected),
          write once, send to every ticked parent sequentially. */}
      <Modal
        open={bulkOpen}
        onClose={closeBulk}
        title={t("teacher.chat.bulkTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeBulk} disabled={bulkSending}>
              {t("teacher.common.cancel")}
            </Button>
            <Button type="submit" form="teacher-chat-bulk-form" disabled={bulkSending}>
              <Send size={15} />
              {bulkSending
                ? t("teacher.chat.bulkSending", {
                    done: bulkProgress,
                    total: bulkSelected.size,
                  })
                : t("teacher.chat.bulkSend", { count: bulkSelected.size })}
            </Button>
          </>
        }
      >
        <form
          id="teacher-chat-bulk-form"
          onSubmit={handleBulkSend}
          className="flex flex-col gap-4"
          noValidate
        >
          <Select
            label={t("teacher.chat.selectGroup")}
            value={bulkGroupId}
            onChange={handleBulkGroupChange}
            error={bulkErrors.group}
            disabled={bulkSending}
          >
            <option value="">{t("teacher.chat.selectGroup")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>

          {bulkStudents.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={toggleBulkAll}
                disabled={bulkSending}
                className="flex w-full items-center gap-2 rounded-btn px-2 py-2 text-sm font-medium text-accent-dark transition-colors hover:bg-accent-light/15 dark:text-accent"
              >
                {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                {t("teacher.chat.bulkSelectAll")}
                <span className="ml-auto text-xs font-normal text-fg-muted">
                  {bulkSelected.size}/{bulkStudents.length}
                </span>
              </button>
              <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-card border border-line p-1.5">
                {bulkStudents.map((student) => {
                  const checked = bulkSelected.has(student.student_id);
                  return (
                    <button
                      key={student.student_id}
                      type="button"
                      onClick={() => toggleBulkStudent(student.student_id)}
                      disabled={bulkSending}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-btn px-2 py-1.5 text-left text-sm transition-colors",
                        checked
                          ? "bg-accent-light/20 text-fg"
                          : "text-fg-secondary hover:bg-surface-sunken",
                      )}
                    >
                      {checked ? (
                        <CheckSquare size={17} className="shrink-0 text-accent-dark dark:text-accent" />
                      ) : (
                        <Square size={17} className="shrink-0 text-fg-faint" />
                      )}
                      <Avatar
                        photoUrl={student.photo_url}
                        name={student.student_full_name}
                        size="sm"
                        className="h-7 w-7 text-[10px]"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {student.student_full_name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {bulkErrors.students && (
                <p className="text-xs text-danger">{bulkErrors.students}</p>
              )}
            </div>
          )}

          <Textarea
            label={t("teacher.chat.bulkBodyLabel")}
            value={bulkBody}
            onChange={(event) => setBulkBody(event.target.value)}
            error={bulkErrors.body}
            rows={4}
            placeholder={t("teacher.chat.inputPlaceholder")}
            disabled={bulkSending}
          />
        </form>
      </Modal>
    </div>
  );
}
