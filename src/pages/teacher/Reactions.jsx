import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Trash2, Users } from "lucide-react";
import {
  createGroupFriendship,
  createReaction,
  deleteGroupFriendship,
  listMyGroupFriends,
  listMyGroupStudents,
  listMyGroups,
  listMyReactions,
} from "../../api/teacher";
import { useTenantModules } from "../../context/TenantModulesContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import IconButton from "../../components/ui/IconButton";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";

// Mirrors app/models/student_reaction.py's REACTION_POINTS — shown here only
// so a teacher sees the star value before sending; the server decides the
// real value regardless of what this page sends.
const REACTIONS = [
  { emoji: "⚡️", points: 5 },
  { emoji: "👍", points: 3 },
  { emoji: "⭐️", points: 5 },
  { emoji: "🔥", points: 5 },
  { emoji: "❤️", points: 3 },
  { emoji: "❗️", points: 2 },
  { emoji: "✅", points: 3 },
];

export default function Reactions() {
  const { t } = useTranslation();
  const { hasPermission } = useTenantModules();
  const canFriends = hasPermission("teacher_cabinet.friends");

  const [tab, setTab] = useState("reactions");
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [reactions, setReactions] = useState([]);
  const [reactStudentId, setReactStudentId] = useState("");
  const [reactEmoji, setReactEmoji] = useState(REACTIONS[0].emoji);
  const [reactNote, setReactNote] = useState("");
  const [sending, setSending] = useState(false);

  const [friends, setFriends] = useState([]);
  const [friendA, setFriendA] = useState("");
  const [friendB, setFriendB] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.reactions.groupsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId) {
      setStudents([]);
      setReactions([]);
      setFriends([]);
      return;
    }
    setReactStudentId("");
    setFriendA("");
    setFriendB("");
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function loadData() {
    setLoading(true);
    try {
      const calls = [listMyGroupStudents(groupId), listMyReactions(groupId)];
      if (canFriends) calls.push(listMyGroupFriends(groupId));
      const [groupStudents, reactionRows, friendRows] = await Promise.all(calls);
      setStudents(groupStudents);
      setReactions(reactionRows);
      if (canFriends) setFriends(friendRows);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.reactions.loadError")));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReaction() {
    if (!reactStudentId) return;
    setSending(true);
    try {
      await createReaction({
        student_id: reactStudentId,
        group_id: groupId,
        emoji: reactEmoji,
        note: reactNote.trim() || null,
      });
      toast.success(t("teacher.reactions.sendSuccess"));
      setReactNote("");
      const rows = await listMyReactions(groupId);
      setReactions(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.reactions.sendError")));
    } finally {
      setSending(false);
    }
  }

  async function handleAddFriend() {
    if (!friendA || !friendB) return;
    if (friendA === friendB) {
      toast.error(t("teacher.reactions.friendSameStudent"));
      return;
    }
    setAddingFriend(true);
    try {
      await createGroupFriendship({
        student_id: friendA,
        friend_student_id: friendB,
        group_id: groupId,
      });
      toast.success(t("teacher.reactions.friendSuccess"));
      setFriendA("");
      setFriendB("");
      const rows = await listMyGroupFriends(groupId);
      setFriends(rows);
    } catch (error) {
      const status = error?.response?.status;
      toast.error(
        status === 409
          ? t("teacher.reactions.friendExists")
          : getErrorMessage(error, t("teacher.reactions.friendError")),
      );
    } finally {
      setAddingFriend(false);
    }
  }

  async function handleRemoveFriend() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGroupFriendship(deleteTarget.id);
      toast.success(t("teacher.reactions.removeFriendSuccess"));
      setDeleteTarget(null);
      const rows = await listMyGroupFriends(groupId);
      setFriends(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.reactions.removeFriendError")));
    } finally {
      setDeleting(false);
    }
  }

  function studentName(id) {
    return students.find((s) => s.student_id === id)?.student_full_name || "";
  }

  return (
    <div className={PAGE_CLASS}>
      <Select
        label={t("teacher.reactions.groupLabel")}
        className="w-full"
        value={groupId}
        onChange={(event) => setGroupId(event.target.value)}
        disabled={groups.length === 0}
      >
        <option value="">{t("teacher.reactions.selectGroup")}</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </Select>

      {!groupId ? (
        <EmptyState
          size="md"
          icon={Sparkles}
          title={t("teacher.reactions.selectGroupTitle")}
          description={t("teacher.reactions.selectGroupDescription")}
        />
      ) : (
        <>
          {canFriends && (
            <div className="flex gap-2 rounded-btn bg-surface-muted p-1">
              {[
                { key: "reactions", label: t("teacher.reactions.tabReactions") },
                { key: "friends", label: t("teacher.reactions.tabFriends") },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "flex-1 rounded-btn px-3 py-2 text-sm font-medium transition-colors",
                    tab === item.key
                      ? "bg-background text-fg shadow-sm"
                      : "text-fg-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {tab === "reactions" || !canFriends ? (
            <>
              <Card padding="p-4" className="space-y-3">
                <Select
                  label={t("teacher.reactions.studentLabel")}
                  value={reactStudentId}
                  onChange={(event) => setReactStudentId(event.target.value)}
                >
                  <option value="">{t("teacher.reactions.selectStudent")}</option>
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.student_full_name}
                    </option>
                  ))}
                </Select>

                <div className="flex flex-wrap gap-2">
                  {REACTIONS.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      type="button"
                      onClick={() => setReactEmoji(reaction.emoji)}
                      className={cn(
                        "flex items-center gap-1 rounded-btn border px-3 py-2 text-lg transition-colors",
                        reactEmoji === reaction.emoji
                          ? "border-primary bg-primary-bg"
                          : "border-line-strong hover:bg-surface-muted",
                      )}
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-xs font-semibold text-fg-muted tabular-nums">
                        +{reaction.points}
                      </span>
                    </button>
                  ))}
                </div>

                <Textarea
                  label={t("teacher.reactions.noteLabel")}
                  rows={2}
                  maxLength={280}
                  value={reactNote}
                  onChange={(event) => setReactNote(event.target.value)}
                />

                <Button
                  className="w-full"
                  disabled={!reactStudentId || sending}
                  onClick={handleSendReaction}
                >
                  {sending ? t("teacher.common.saving") : t("teacher.reactions.send")}
                </Button>
              </Card>

              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} padding="p-4" className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </Card>
                ))
              ) : reactions.length === 0 ? (
                <EmptyState
                  size="md"
                  icon={Sparkles}
                  title={t("teacher.reactions.emptyTitle")}
                  description={t("teacher.reactions.emptyDescription")}
                />
              ) : (
                reactions.map((row) => (
                  <Card key={row.id} padding="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{row.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-sm font-semibold text-fg">
                          {row.student_full_name}
                        </h3>
                        {row.note && (
                          <p className="truncate text-xs text-fg-secondary">{row.note}</p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs font-semibold text-fg-muted tabular-nums">
                        +{row.points} {t("teacher.reactions.pointsSuffix")}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </>
          ) : (
            <>
              <Card padding="p-4" className="space-y-3">
                <Select
                  label={t("teacher.reactions.friendFrom")}
                  value={friendA}
                  onChange={(event) => setFriendA(event.target.value)}
                >
                  <option value="">{t("teacher.reactions.selectStudent")}</option>
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.student_full_name}
                    </option>
                  ))}
                </Select>
                <Select
                  label={t("teacher.reactions.friendTo")}
                  value={friendB}
                  onChange={(event) => setFriendB(event.target.value)}
                >
                  <option value="">{t("teacher.reactions.selectStudent")}</option>
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.student_full_name}
                    </option>
                  ))}
                </Select>
                <Button
                  className="w-full"
                  disabled={!friendA || !friendB || addingFriend}
                  onClick={handleAddFriend}
                >
                  {addingFriend ? t("teacher.common.saving") : t("teacher.reactions.addFriend")}
                </Button>
              </Card>

              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} padding="p-4" className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                  </Card>
                ))
              ) : friends.length === 0 ? (
                <EmptyState
                  size="md"
                  icon={Users}
                  title={t("teacher.reactions.friendEmptyTitle")}
                  description={t("teacher.reactions.friendEmptyDescription")}
                />
              ) : (
                friends.map((row) => (
                  <Card key={row.id} padding="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                        {studentName(row.student_id)} · {row.friend_full_name}
                      </p>
                      <IconButton
                        icon={Trash2}
                        tone="danger"
                        aria-label={t("teacher.reactions.removeFriend")}
                        onClick={() => setDeleteTarget(row)}
                      />
                    </div>
                  </Card>
                ))
              )}
            </>
          )}
        </>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("teacher.reactions.removeFriend")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleRemoveFriend} disabled={deleting}>
              {deleting ? t("teacher.common.saving") : t("teacher.reactions.removeFriend")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("teacher.reactions.removeFriendConfirm")}</p>
      </Modal>
    </div>
  );
}
