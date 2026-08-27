import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Cake,
  CalendarPlus,
  ChevronLeft,
  GraduationCap,
  Heart,
  Phone,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import {
  createBehaviour,
  createGroupFriendship,
  createReaction,
  getMyStudent,
  listMyGroupStudents,
} from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import DateInput from "../../components/ui/DateInput";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/format";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-5 px-4 pb-24 pt-5";

// Mirrors app/models/student_reaction.py's REACTION_POINTS.
const REACTIONS = [
  { emoji: "⚡️", points: 5 },
  { emoji: "👍", points: 3 },
  { emoji: "⭐️", points: 5 },
  { emoji: "🔥", points: 5 },
  { emoji: "❤️", points: 3 },
  { emoji: "❗️", points: 2 },
  { emoji: "✅", points: 3 },
];

const POINT_CHIPS = [
  { value: 1, tone: "positive" },
  { value: 5, tone: "positive" },
  { value: -1, tone: "negative" },
  { value: -3, tone: "negative" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function signPoints(points) {
  return `${points >= 0 ? "+" : "−"}${Math.abs(points)}`;
}

// One student, reached by tapping their row in the O'quvchilar accordion:
// their read-only profile, plus the three things a teacher does to a single
// student individually — add a friend, send a reaction, log a behaviour note.
export default function StudentDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { studentId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const groupId = searchParams.get("group") || "";
  const groupName = location.state?.groupName || "";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [groupStudents, setGroupStudents] = useState([]);

  const [friendOpen, setFriendOpen] = useState(false);
  const [friendTarget, setFriendTarget] = useState("");
  const [friendSaving, setFriendSaving] = useState(false);

  const [reactionOpen, setReactionOpen] = useState(false);
  const [reactionEmoji, setReactionEmoji] = useState(REACTIONS[0].emoji);
  const [reactionNote, setReactionNote] = useState("");
  const [reactionSaving, setReactionSaving] = useState(false);

  const [behaviourOpen, setBehaviourOpen] = useState(false);
  const [behaviourPoints, setBehaviourPoints] = useState("");
  const [behaviourNote, setBehaviourNote] = useState("");
  const [behaviourDate, setBehaviourDate] = useState(todayISO());
  const [behaviourErrors, setBehaviourErrors] = useState({});
  const [behaviourSaving, setBehaviourSaving] = useState(false);

  useEffect(() => {
    if (!groupId) {
      navigate("/teacher/groups", { replace: true });
      return;
    }
    setLoading(true);
    getMyStudent(studentId)
      .then(setProfile)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.groupDetail.profileError"))))
      .finally(() => setLoading(false));
    listMyGroupStudents(groupId)
      .then(setGroupStudents)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, groupId]);

  function resetFriendModal() {
    setFriendOpen(false);
    setFriendTarget("");
  }

  async function handleAddFriend() {
    if (!friendTarget) return;
    setFriendSaving(true);
    try {
      await createGroupFriendship({
        student_id: studentId,
        friend_student_id: friendTarget,
        group_id: groupId,
      });
      toast.success(t("teacher.reactions.friendSuccess"));
      resetFriendModal();
    } catch (error) {
      const status = error?.response?.status;
      toast.error(
        status === 409
          ? t("teacher.reactions.friendExists")
          : getErrorMessage(error, t("teacher.reactions.friendError")),
      );
    } finally {
      setFriendSaving(false);
    }
  }

  function resetReactionModal() {
    setReactionOpen(false);
    setReactionEmoji(REACTIONS[0].emoji);
    setReactionNote("");
  }

  async function handleSendReaction() {
    setReactionSaving(true);
    try {
      await createReaction({
        student_id: studentId,
        group_id: groupId,
        emoji: reactionEmoji,
        note: reactionNote.trim() || null,
      });
      toast.success(t("teacher.reactions.sendSuccess"));
      resetReactionModal();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.reactions.sendError")));
    } finally {
      setReactionSaving(false);
    }
  }

  function resetBehaviourModal() {
    setBehaviourOpen(false);
    setBehaviourPoints("");
    setBehaviourNote("");
    setBehaviourDate(todayISO());
    setBehaviourErrors({});
  }

  async function handleSaveBehaviour() {
    const points = Number(behaviourPoints);
    const errors = {};
    if (!Number.isInteger(points) || points === 0) errors.points = t("teacher.behaviour.pointsError");
    if (!behaviourDate) errors.date = t("teacher.behaviour.dateError");
    setBehaviourErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBehaviourSaving(true);
    try {
      await createBehaviour({
        group_id: groupId,
        student_id: studentId,
        points,
        note: behaviourNote.trim() || null,
        date: behaviourDate,
      });
      toast.success(t("teacher.behaviour.createSuccess"));
      resetBehaviourModal();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.behaviour.createError")));
    } finally {
      setBehaviourSaving(false);
    }
  }

  const friendChoices = groupStudents.filter((student) => student.student_id !== studentId);

  const photo = profile?.photo_url;
  const name = profile?.full_name;
  const isActive = profile?.is_active !== false;

  const rows = profile
    ? [
        { icon: GraduationCap, label: t("teacher.groupDetail.group"), value: groupName },
        {
          icon: Cake,
          label: t("teacher.groupDetail.birthDate"),
          value: profile.birth_date ? formatDate(profile.birth_date) : null,
        },
        { icon: User, label: t("teacher.groupDetail.parentName"), value: profile.parent_name },
        {
          icon: Phone,
          label: t("teacher.groupDetail.parentPhone"),
          value: profile.parent_phone,
          tel: true,
        },
        { icon: User, label: t("teacher.groupDetail.parent2Name"), value: profile.parent2_name },
        {
          icon: Phone,
          label: t("teacher.groupDetail.parent2Phone"),
          value: profile.parent2_phone,
          tel: true,
        },
        {
          icon: CalendarPlus,
          label: t("teacher.groupDetail.enrolled"),
          value: profile.created_at ? formatDate(profile.created_at) : null,
        },
      ].filter((row) => row.value)
    : [];

  return (
    <div className={PAGE_CLASS}>
      <button
        type="button"
        onClick={() => navigate("/teacher/groups")}
        className="flex items-center gap-1 text-sm text-fg-secondary transition-colors hover:text-fg"
      >
        <ChevronLeft size={16} />
        <span className="truncate">{groupName || t("teacher.nav.groups")}</span>
      </button>

      {loading || !profile ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="mt-2 w-full space-y-2">
            <Skeleton className="h-12 w-full rounded-card" />
            <Skeleton className="h-12 w-full rounded-card" />
            <Skeleton className="h-12 w-full rounded-card" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <Avatar
                photoUrl={photo}
                name={name}
                size="xl"
                className="ring-4 ring-accent-light/25 dark:ring-accent/20"
              />
              <span
                className={cn(
                  "absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-surface",
                  isActive ? "bg-success" : "bg-fg-faint",
                )}
              />
            </div>
            <p className="font-display text-xl font-semibold text-fg">{name}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {groupName && <Badge variant="neutral">{groupName}</Badge>}
              <Badge variant={isActive ? "success" : "neutral"}>
                {isActive ? t("status.active") : t("teacher.groupDetail.statusLeft")}
              </Badge>
            </div>
            {profile.emojis?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 text-xl">
                {profile.emojis.map((emoji, index) => (
                  <span key={index}>{emoji}</span>
                ))}
              </div>
            )}
            {profile.bio && (
              <p className="max-w-xs text-sm leading-relaxed text-fg-secondary">{profile.bio}</p>
            )}
          </div>

          {rows.length > 0 && (
            <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-sunken/40">
              {rows.map((row, index) => {
                const Icon = row.icon;
                return (
                  <div key={index} className="flex items-center gap-3 px-3.5 py-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-btn bg-accent-light/25 text-accent-dark dark:text-accent">
                      <Icon size={16} />
                    </span>
                    <span className="text-sm text-fg-muted">{row.label}</span>
                    {row.tel ? (
                      <a
                        href={`tel:${row.value}`}
                        className="u-press ml-auto truncate text-right text-sm font-semibold text-accent-dark dark:text-accent"
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span className="ml-auto truncate text-right text-sm font-semibold text-fg">
                        {row.value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2.5">
            <p className="px-0.5 text-xs font-bold uppercase tracking-wide text-fg-muted">
              {t("teacher.groups.actionsLabel")}
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setFriendOpen(true)}
                className="flex flex-col items-center gap-2 rounded-card border border-line bg-[rgba(18,137,127,.07)] p-4 text-center shadow-card transition-shadow hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-[rgba(18,137,127,.14)] text-secondary">
                  <UserPlus size={20} />
                </span>
                <span className="text-xs font-semibold leading-tight text-fg">
                  {t("teacher.groups.friendAction")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReactionOpen(true)}
                className="flex flex-col items-center gap-2 rounded-card border border-line bg-[rgba(245,166,35,.08)] p-4 text-center shadow-card transition-shadow hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-gradient-gold text-accent-fg">
                  <Sparkles size={20} />
                </span>
                <span className="text-xs font-semibold leading-tight text-fg">
                  {t("teacher.groups.reactionAction")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBehaviourOpen(true)}
                className="flex flex-col items-center gap-2 rounded-card border border-line bg-[rgba(184,91,48,.07)] p-4 text-center shadow-card transition-shadow hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-[rgba(184,91,48,.14)] text-clay">
                  <Heart size={20} />
                </span>
                <span className="text-xs font-semibold leading-tight text-fg">
                  {t("teacher.groups.behaviourAction")}
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Do'st qo'shish */}
      <Modal
        open={friendOpen}
        onClose={() => !friendSaving && resetFriendModal()}
        title={t("teacher.groups.friendAction")}
        footer={
          <>
            <Button variant="secondary" onClick={resetFriendModal} disabled={friendSaving}>
              {t("teacher.common.cancel")}
            </Button>
            <Button onClick={handleAddFriend} disabled={!friendTarget || friendSaving}>
              {friendSaving ? t("teacher.common.saving") : t("teacher.reactions.addFriend")}
            </Button>
          </>
        }
      >
        <Select
          label={t("teacher.groups.pickFriendLabel")}
          value={friendTarget}
          onChange={(event) => setFriendTarget(event.target.value)}
        >
          <option value="">{t("teacher.reactions.selectStudent")}</option>
          {friendChoices.map((student) => (
            <option key={student.student_id} value={student.student_id}>
              {student.student_full_name}
            </option>
          ))}
        </Select>
      </Modal>

      {/* Reaksiya bildirish */}
      <Modal
        open={reactionOpen}
        onClose={() => !reactionSaving && resetReactionModal()}
        title={t("teacher.groups.reactionAction")}
        footer={
          <>
            <Button variant="secondary" onClick={resetReactionModal} disabled={reactionSaving}>
              {t("teacher.common.cancel")}
            </Button>
            <Button onClick={handleSendReaction} disabled={reactionSaving}>
              {reactionSaving ? t("teacher.common.saving") : t("teacher.reactions.send")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => setReactionEmoji(reaction.emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-btn border px-3 py-2 text-lg transition-colors",
                  reactionEmoji === reaction.emoji
                    ? "border-accent bg-gradient-gold"
                    : "border-line-strong hover:bg-surface-sunken",
                )}
              >
                <span>{reaction.emoji}</span>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    reactionEmoji === reaction.emoji ? "text-accent-fg" : "text-fg-muted",
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
            value={reactionNote}
            onChange={(event) => setReactionNote(event.target.value)}
          />
        </div>
      </Modal>

      {/* Xulq */}
      <Modal
        open={behaviourOpen}
        onClose={() => !behaviourSaving && resetBehaviourModal()}
        title={t("teacher.groups.behaviourAction")}
        footer={
          <>
            <Button variant="secondary" onClick={resetBehaviourModal} disabled={behaviourSaving}>
              {t("teacher.common.cancel")}
            </Button>
            <Button onClick={handleSaveBehaviour} disabled={behaviourSaving}>
              {behaviourSaving ? t("teacher.common.saving") : t("teacher.common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-fg-secondary">
              {t("teacher.behaviour.pointsLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {POINT_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setBehaviourPoints(String(chip.value))}
                  className={cn(
                    "rounded-btn border px-3 py-2 text-sm font-semibold tabular-nums transition-colors",
                    String(chip.value) === behaviourPoints
                      ? chip.tone === "positive"
                        ? "border-success bg-success-bg text-success"
                        : "border-danger bg-danger-bg text-danger"
                      : "border-line-strong hover:bg-surface-sunken",
                  )}
                >
                  {signPoints(chip.value)}
                </button>
              ))}
            </div>
            {behaviourErrors.points && (
              <p className="mt-1 text-xs text-danger">{behaviourErrors.points}</p>
            )}
          </div>
          <DateInput
            label={t("teacher.behaviour.dateLabel")}
            value={behaviourDate}
            onChange={(event) => setBehaviourDate(event.target.value)}
            error={behaviourErrors.date}
          />
          <Textarea
            label={t("teacher.behaviour.noteLabel")}
            rows={2}
            maxLength={280}
            value={behaviourNote}
            onChange={(event) => setBehaviourNote(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
