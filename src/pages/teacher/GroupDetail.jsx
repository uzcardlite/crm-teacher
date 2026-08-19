import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Cake,
  CalendarPlus,
  ChevronLeft,
  GraduationCap,
  Phone,
  User,
  UsersRound,
} from "lucide-react";
import { getMyStudent, listMyGroups, listMyGroupStudents } from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/format";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-3 px-4 pb-24 pt-4";

// A full, profile-style view of one student: large photo, live status, mood
// emojis, an optional note, then a tidy icon list of group / parents / dates.
// Read-only — deliberately no finance or edit affordances.
function StudentProfile({ student, profile, groupName, statusVariant, statusLabel }) {
  const { t } = useTranslation();
  const photo = profile.photo_url || student?.photo_url;
  const name = profile.full_name || student?.student_full_name;
  const isActive =
    (student?.status ?? (profile.is_active ? "active" : "left")) === "active";

  const rows = [
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
  ].filter((row) => row.value);

  return (
    <div className="flex flex-col gap-5">
      {/* Identity header: photo with a live status ring + dot, status pill,
          mood emojis and an optional note. */}
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
        <div className="flex flex-col items-center gap-2">
          <Badge variant={statusVariant(student?.status)}>{statusLabel(student?.status)}</Badge>
          {profile.emojis?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 text-xl">
              {profile.emojis.map((emoji, index) => (
                <span key={index}>{emoji}</span>
              ))}
            </div>
          )}
        </div>
        {profile.bio && (
          <p className="max-w-xs text-sm leading-relaxed text-fg-secondary">{profile.bio}</p>
        )}
      </div>

      {/* Detail list: each row an icon chip + label + value; phones are
          tappable tel: links. */}
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
    </div>
  );
}

// Read-only student roster for one owned group + a view-only student profile.
// Deliberately carries NO finance/payment/edit affordances.
export default function GroupDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [groupName, setGroupName] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeStudent, setActiveStudent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    Promise.all([listMyGroups(), listMyGroupStudents(groupId)])
      .then(([groups, roster]) => {
        const group = groups.find((g) => g.id === groupId);
        setGroupName(group?.name || "");
        setStudents(roster);
      })
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.groupDetail.loadError"))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  function openProfile(student) {
    setActiveStudent(student);
    setProfile(null);
    setProfileLoading(true);
    getMyStudent(student.student_id)
      .then(setProfile)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.groupDetail.profileError"))))
      .finally(() => setProfileLoading(false));
  }

  const statusVariant = (status) => (status === "active" ? "success" : "neutral");
  const statusLabel = (status) =>
    status === "active" ? t("status.active") : t("teacher.groupDetail.statusLeft");

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

      {loading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} padding="p-4" className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))
      ) : students.length === 0 ? (
        <EmptyState
          size="md"
          icon={UsersRound}
          title={t("teacher.groupDetail.emptyTitle")}
          description={t("teacher.groupDetail.emptyDescription")}
        />
      ) : (
        students.map((student) => (
          <Card
            key={student.student_id}
            padding="p-4"
            hoverable
            className="flex cursor-pointer items-center gap-3"
            onClick={() => openProfile(student)}
          >
            <Avatar photoUrl={student.photo_url} name={student.student_full_name} size="sm" />
            <span className="min-w-0 flex-1 truncate font-display text-base font-semibold text-fg">
              {student.student_full_name}
            </span>
            <Badge variant={statusVariant(student.status)}>{statusLabel(student.status)}</Badge>
          </Card>
        ))
      )}

      <Modal
        open={Boolean(activeStudent)}
        onClose={() => setActiveStudent(null)}
        title={activeStudent?.student_full_name || ""}
      >
        {profileLoading || !profile ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="mt-2 w-full space-y-2">
              <Skeleton className="h-12 w-full rounded-card" />
              <Skeleton className="h-12 w-full rounded-card" />
              <Skeleton className="h-12 w-full rounded-card" />
            </div>
          </div>
        ) : (
          <StudentProfile
            student={activeStudent}
            profile={profile}
            groupName={groupName}
            statusVariant={statusVariant}
            statusLabel={statusLabel}
          />
        )}
      </Modal>
    </div>
  );
}
