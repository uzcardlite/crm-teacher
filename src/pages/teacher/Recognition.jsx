import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CalendarDays,
  Pencil,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  createBehaviour,
  createGroupFriendship,
  createReaction,
  deleteBehaviour,
  deleteGroupFriendship,
  listMyBehaviour,
  listMyGroupFriends,
  listMyGroupStudents,
  listMyGroups,
  listMyReactions,
  updateBehaviour,
} from "../../api/teacher";
import { useTenantModules } from "../../context/TenantModulesContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DateInput from "../../components/ui/DateInput";
import EmptyState from "../../components/ui/EmptyState";
import IconButton from "../../components/ui/IconButton";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { behaviourTone, formatDate } from "../../utils/format";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";

// Mirrors app/models/student_reaction.py's REACTION_POINTS — every emoji is
// worth 1 star; the emoji says what the praise was for, not how much. Shown
// here only so a teacher sees the value before sending, the server decides
// the real value regardless of what this page sends.
const REACTIONS = [
  { emoji: "⚡️", points: 1 },
  { emoji: "👍", points: 1 },
  { emoji: "⭐️", points: 1 },
  { emoji: "🔥", points: 1 },
  { emoji: "❤️", points: 1 },
  { emoji: "❗️", points: 1 },
  { emoji: "✅", points: 1 },
];

// Mirrors app/models/behaviour_score.py's BEHAVIOUR_CATEGORIES. Xulq is a
// misconduct log, not a mixed reward/penalty ledger — positive reinforcement
// already lives in the Reaksiya tab, so every category is a deduction, grouped
// by how serious it is. The server decides the real point value regardless of
// what this page sends.
const BEHAVIOUR_CATEGORIES = [
  { key: "disrupted_lesson", points: -1 },
  { key: "no_homework", points: -1 },
  { key: "late_to_class", points: -1 },
  { key: "unauthorized_phone", points: -1 },
  { key: "disrespect", points: -2 },
  { key: "lied", points: -2 },
  { key: "upset_classmate", points: -2 },
  { key: "insulted", points: -3 },
  { key: "fought", points: -3 },
  { key: "damaged_property", points: -3 },
];
const SEVERITY_GROUPS = [
  { points: -1, labelKey: "teacher.behaviour.severityLight", dot: "#E3A857" },
  { points: -2, labelKey: "teacher.behaviour.severityMedium", dot: "#D97A3E" },
  { points: -3, labelKey: "teacher.behaviour.severityHeavy", dot: "#A32D2D" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Signed display: "+3" / "−2" (U+2212 minus for negatives, never a hyphen) —
// still used for the handful of legacy free-form rows logged before
// categories existed (their points aren't necessarily -1/-2/-3).
function signPoints(points) {
  return `${points >= 0 ? "+" : "−"}${Math.abs(points)}`;
}

const EMPTY_BEHAVIOUR_ENTRY = { studentId: "", category: "", note: "", date: todayISO() };

// Rag'batlantirish: one group picker, three tabs onto what used to be three
// separate destinations (Reaksiyalar, a Do'stlar tab buried inside it, and
// Xulq) — everything a teacher does to encourage or note one student, in one
// place.
export default function Recognition() {
  const { t } = useTranslation();
  const { hasPermission } = useTenantModules();
  const canReactions = hasPermission("teacher_cabinet.reactions");
  const canFriends = hasPermission("teacher_cabinet.friends");
  const canBehaviour = hasPermission("teacher_cabinet.behaviour");

  const [tab, setTab] = useState(canReactions ? "reactions" : canFriends ? "friends" : "behaviour");
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- reactions ---
  const [reactions, setReactions] = useState([]);
  const [reactStudentId, setReactStudentId] = useState("");
  const [reactEmoji, setReactEmoji] = useState(REACTIONS[0].emoji);
  const [reactNote, setReactNote] = useState("");
  const [sending, setSending] = useState(false);

  // --- friends ---
  const [friends, setFriends] = useState([]);
  const [friendA, setFriendA] = useState("");
  const [friendB, setFriendB] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendDeleteTarget, setFriendDeleteTarget] = useState(null);
  const [deletingFriend, setDeletingFriend] = useState(false);

  // --- behaviour: one inline entry form (no modal), same shape whether
  // creating a fresh record or editing an existing one (editingId tracks which). ---
  const [behaviourRecords, setBehaviourRecords] = useState([]);
  const [behaviourEntry, setBehaviourEntry] = useState(EMPTY_BEHAVIOUR_ENTRY);
  const [behaviourEditingId, setBehaviourEditingId] = useState(null);
  const [behaviourErrors, setBehaviourErrors] = useState({});
  const [behaviourSaving, setBehaviourSaving] = useState(false);
  const [behaviourDeleteTarget, setBehaviourDeleteTarget] = useState(null);
  const [deletingBehaviour, setDeletingBehaviour] = useState(false);

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.recognition.groupsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId) {
      setStudents([]);
      setReactions([]);
      setFriends([]);
      setBehaviourRecords([]);
      return;
    }
    setReactStudentId("");
    setFriendA("");
    setFriendB("");
    resetBehaviourEntry();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function loadData() {
    setLoading(true);
    try {
      const calls = [listMyGroupStudents(groupId)];
      calls.push(canReactions ? listMyReactions(groupId) : Promise.resolve([]));
      calls.push(canFriends ? listMyGroupFriends(groupId) : Promise.resolve([]));
      calls.push(canBehaviour ? listMyBehaviour(groupId) : Promise.resolve([]));
      const [groupStudents, reactionRows, friendRows, behaviourRows] = await Promise.all(calls);
      setStudents(groupStudents);
      setReactions(reactionRows);
      setFriends(friendRows);
      setBehaviourRecords(behaviourRows);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.recognition.loadError")));
    } finally {
      setLoading(false);
    }
  }

  function studentName(id) {
    return students.find((s) => s.student_id === id)?.student_full_name || "";
  }

  // --- reactions handlers ---
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
      setReactions(await listMyReactions(groupId));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.reactions.sendError")));
    } finally {
      setSending(false);
    }
  }

  // --- friends handlers ---
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
      setFriends(await listMyGroupFriends(groupId));
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
    if (!friendDeleteTarget) return;
    setDeletingFriend(true);
    try {
      await deleteGroupFriendship(friendDeleteTarget.id);
      toast.success(t("teacher.reactions.removeFriendSuccess"));
      setFriendDeleteTarget(null);
      setFriends(await listMyGroupFriends(groupId));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.reactions.removeFriendError")));
    } finally {
      setDeletingFriend(false);
    }
  }

  // --- behaviour handlers ---
  function resetBehaviourEntry() {
    setBehaviourEntry(EMPTY_BEHAVIOUR_ENTRY);
    setBehaviourEditingId(null);
    setBehaviourErrors({});
  }

  function openEditBehaviour(row) {
    setBehaviourEntry({
      studentId: row.student_id,
      category: row.category || "",
      note: row.note || "",
      date: row.date ? row.date.slice(0, 10) : todayISO(),
    });
    setBehaviourEditingId(row.id);
    setBehaviourErrors({});
  }

  async function handleSaveBehaviour() {
    const nextErrors = {};
    if (!behaviourEntry.studentId) nextErrors.studentId = t("teacher.behaviour.studentError");
    if (!behaviourEntry.category) nextErrors.category = t("teacher.behaviour.categoryError");
    if (!behaviourEntry.date) nextErrors.date = t("teacher.behaviour.dateError");
    setBehaviourErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      group_id: groupId,
      student_id: behaviourEntry.studentId,
      category: behaviourEntry.category,
      note: behaviourEntry.note.trim() || null,
      date: behaviourEntry.date,
    };

    setBehaviourSaving(true);
    try {
      if (behaviourEditingId) {
        await updateBehaviour(behaviourEditingId, payload);
        toast.success(t("teacher.behaviour.updateSuccess"));
      } else {
        await createBehaviour(payload);
        toast.success(t("teacher.behaviour.createSuccess"));
      }
      resetBehaviourEntry();
      setBehaviourRecords(await listMyBehaviour(groupId));
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          behaviourEditingId ? t("teacher.behaviour.updateError") : t("teacher.behaviour.createError"),
        ),
      );
    } finally {
      setBehaviourSaving(false);
    }
  }

  async function handleDeleteBehaviour() {
    if (!behaviourDeleteTarget) return;
    setDeletingBehaviour(true);
    try {
      await deleteBehaviour(behaviourDeleteTarget.id);
      toast.success(t("teacher.behaviour.deleteSuccess"));
      if (behaviourEditingId === behaviourDeleteTarget.id) resetBehaviourEntry();
      setBehaviourDeleteTarget(null);
      setBehaviourRecords(await listMyBehaviour(groupId));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.behaviour.deleteError")));
    } finally {
      setDeletingBehaviour(false);
    }
  }

  const TABS = [
    canReactions && { key: "reactions", label: t("teacher.recognition.tabReactions") },
    canFriends && { key: "friends", label: t("teacher.recognition.tabFriends") },
    canBehaviour && { key: "behaviour", label: t("teacher.recognition.tabBehaviour") },
  ].filter(Boolean);

  return (
    <div className={PAGE_CLASS}>
      <Select
        label={t("teacher.recognition.groupLabel")}
        className="w-full"
        value={groupId}
        onChange={(event) => setGroupId(event.target.value)}
        disabled={groups.length === 0}
      >
        <option value="">{t("teacher.recognition.selectGroup")}</option>
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
          title={t("teacher.recognition.selectGroupTitle")}
          description={t("teacher.recognition.selectGroupDescription")}
        />
      ) : (
        <>
          {TABS.length > 1 && (
            <div className="flex gap-1 rounded-btn bg-surface-sunken p-1">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "flex-1 rounded-btn px-3 py-2 text-sm font-medium transition-colors",
                    tab === item.key
                      ? "bg-surface text-fg shadow-card"
                      : "text-fg-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {tab === "reactions" && canReactions && (
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
                          ? "border-accent bg-gradient-gold"
                          : "border-line-strong hover:bg-surface-sunken",
                      )}
                    >
                      <span>{reaction.emoji}</span>
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          reactEmoji === reaction.emoji ? "text-accent-fg" : "text-fg-muted",
                        )}
                      >
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
          )}

          {tab === "friends" && canFriends && (
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
                        onClick={() => setFriendDeleteTarget(row)}
                      />
                    </div>
                  </Card>
                ))
              )}
            </>
          )}

          {tab === "behaviour" && canBehaviour && (
            <>
              <Card padding="p-4" className="space-y-3">
                <Select
                  label={t("teacher.behaviour.studentLabel")}
                  value={behaviourEntry.studentId}
                  onChange={(event) =>
                    setBehaviourEntry((prev) => ({ ...prev, studentId: event.target.value }))
                  }
                  error={behaviourErrors.studentId}
                >
                  <option value="">{t("teacher.behaviour.selectStudent")}</option>
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.student_full_name}
                    </option>
                  ))}
                </Select>

                <div className="space-y-3">
                  {SEVERITY_GROUPS.map((group) => (
                    <div key={group.points} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-fg-faint">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: group.dot }}
                        />
                        {t(group.labelKey)}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {BEHAVIOUR_CATEGORIES.filter((cat) => cat.points === group.points).map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() =>
                              setBehaviourEntry((prev) => ({ ...prev, category: cat.key }))
                            }
                            className={cn(
                              "flex items-center gap-2 rounded-btn border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                              behaviourEntry.category === cat.key
                                ? "border-danger bg-danger-bg text-danger"
                                : "border-line-strong text-fg-secondary hover:bg-surface-sunken",
                            )}
                          >
                            <span
                              className="h-1.5 w-1.5 flex-none rounded-full"
                              style={{ background: behaviourEntry.category === cat.key ? undefined : group.dot }}
                            />
                            {t(`teacher.behaviour.categories.${cat.key}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {behaviourErrors.category && (
                    <p className="text-xs text-danger">{behaviourErrors.category}</p>
                  )}
                </div>

                <Textarea
                  label={t("teacher.behaviour.noteLabel")}
                  rows={2}
                  maxLength={500}
                  value={behaviourEntry.note}
                  onChange={(event) =>
                    setBehaviourEntry((prev) => ({ ...prev, note: event.target.value }))
                  }
                />

                <DateInput
                  label={t("teacher.behaviour.dateLabel")}
                  value={behaviourEntry.date}
                  onChange={(event) =>
                    setBehaviourEntry((prev) => ({ ...prev, date: event.target.value }))
                  }
                  error={behaviourErrors.date}
                />

                <div className="flex gap-2">
                  {behaviourEditingId && (
                    <Button variant="secondary" className="flex-1" onClick={resetBehaviourEntry}>
                      {t("teacher.common.cancel")}
                    </Button>
                  )}
                  <Button className="flex-1" disabled={behaviourSaving} onClick={handleSaveBehaviour}>
                    {behaviourSaving ? t("teacher.common.saving") : t("teacher.common.save")}
                  </Button>
                </div>
              </Card>

              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} padding="p-4" className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </Card>
                ))
              ) : behaviourRecords.length === 0 ? (
                <EmptyState
                  size="md"
                  icon={AlertTriangle}
                  title={t("teacher.behaviour.emptyTitle")}
                  description={t("teacher.behaviour.emptyDescription")}
                />
              ) : (
                behaviourRecords.map((row) => {
                  const tone = behaviourTone(row.points);
                  return (
                    <Card key={row.id} padding="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="truncate font-display text-base font-semibold text-fg">
                            {row.student_full_name}
                          </h3>
                          {row.category && (
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                              <AlertTriangle size={12} />
                              {t(`teacher.behaviour.categories.${row.category}`)}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                            <CalendarDays size={14} className="text-fg-faint" />
                            {formatDate(row.date)}
                          </p>
                          {row.note && (
                            <p className="text-xs text-fg-secondary line-clamp-2">{row.note}</p>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-2">
                          <Badge variant={tone.badge}>
                            <span className="font-semibold tabular-nums">{signPoints(row.points)}</span>
                          </Badge>
                          <div className="flex items-center gap-1">
                            <IconButton
                              icon={Pencil}
                              aria-label={t("teacher.behaviour.edit")}
                              onClick={() => openEditBehaviour(row)}
                            />
                            <IconButton
                              icon={Trash2}
                              tone="danger"
                              aria-label={t("teacher.behaviour.delete")}
                              onClick={() => setBehaviourDeleteTarget(row)}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </>
          )}
        </>
      )}

      {/* Do'stlikni o'chirish */}
      <Modal
        open={Boolean(friendDeleteTarget)}
        onClose={() => !deletingFriend && setFriendDeleteTarget(null)}
        title={t("teacher.reactions.removeFriend")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFriendDeleteTarget(null)} disabled={deletingFriend}>
              {t("teacher.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleRemoveFriend} disabled={deletingFriend}>
              {deletingFriend ? t("teacher.common.saving") : t("teacher.reactions.removeFriend")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("teacher.reactions.removeFriendConfirm")}</p>
      </Modal>

      <Modal
        open={Boolean(behaviourDeleteTarget)}
        onClose={() => !deletingBehaviour && setBehaviourDeleteTarget(null)}
        title={t("teacher.behaviour.deleteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBehaviourDeleteTarget(null)} disabled={deletingBehaviour}>
              {t("teacher.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDeleteBehaviour} disabled={deletingBehaviour}>
              {deletingBehaviour ? t("teacher.common.saving") : t("teacher.behaviour.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("teacher.behaviour.deleteConfirm")}</p>
      </Modal>
    </div>
  );
}
