import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, UsersRound } from "lucide-react";
import { getMyStudent, listMyGroups, listMyGroupStudents } from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate, EMPTY_VALUE } from "../../utils/format";

const PAGE_CLASS = "mx-auto max-w-lg space-y-3 px-4 pb-24 pt-4";

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
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("teacher.groupDetail.group")}</dt>
              <dd className="text-right font-medium text-fg">{groupName || EMPTY_VALUE}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("teacher.groupDetail.parentName")}</dt>
              <dd className="text-right font-medium text-fg">{profile.parent_name || EMPTY_VALUE}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("teacher.groupDetail.parentPhone")}</dt>
              <dd className="text-right font-medium text-fg">{profile.parent_phone || EMPTY_VALUE}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("teacher.groupDetail.birthDate")}</dt>
              <dd className="text-right font-medium text-fg">
                {profile.birth_date ? formatDate(profile.birth_date) : EMPTY_VALUE}
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
