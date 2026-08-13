import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, UsersRound } from "lucide-react";
import { listMyGroups } from "../../api/teacher";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import KoshinStar from "../../components/ui/KoshinStar";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";

const PAGE_CLASS = "mx-auto max-w-lg space-y-3 px-4 pb-24 pt-4";

// Read-only list of the teacher's own groups. Tapping a group opens its
// student roster (GroupDetail).
export default function Groups() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.groups.loadError"))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className={PAGE_CLASS}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} padding="p-4" className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-btn" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-8 rounded-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={PAGE_CLASS}>
        <EmptyState
          size="md"
          icon={UsersRound}
          title={t("teacher.groups.emptyTitle")}
          description={t("teacher.groups.emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div className={PAGE_CLASS}>
      {groups.map((group) => (
        <Card
          key={group.id}
          padding="p-4"
          hoverable
          className="flex cursor-pointer items-center gap-3"
          onClick={() => navigate(`/teacher/groups/${group.id}`)}
        >
          {/* Gilt koshin tile: the national marker that makes each group read
              at a glance as part of the redesigned system. */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-gradient-gold text-accent-fg shadow-card">
            <KoshinStar size={20} strokeWidth={6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-fg">{group.name}</p>
            <p className="text-xs text-fg-muted">
              {t("teacher.groups.studentsCount", { count: group.current_students_count })}
            </p>
          </div>
          <Badge variant="neutral">{group.current_students_count}</Badge>
          <ChevronRight size={16} className="shrink-0 text-fg-faint" />
        </Card>
      ))}
    </div>
  );
}
