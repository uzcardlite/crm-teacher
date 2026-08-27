import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, UsersRound } from "lucide-react";
import { listMyGroups, listMyGroupStudents } from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import KoshinStar from "../../components/ui/KoshinStar";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-3 px-4 pb-24 pt-4";

// "O'quvchilar": every group as an accordion row — tapping a group toggles
// its roster open/closed in place (no navigation); tapping a student pushes
// into their own profile + actions page (StudentDetail).
export default function Groups() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expanded, setExpanded] = useState(() => new Set());
  const [rosterByGroup, setRosterByGroup] = useState({});
  const [rosterLoading, setRosterLoading] = useState(() => new Set());

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.groups.loadError"))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleGroup(groupId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
        if (!rosterByGroup[groupId]) loadRoster(groupId);
      }
      return next;
    });
  }

  async function loadRoster(groupId) {
    setRosterLoading((prev) => new Set(prev).add(groupId));
    try {
      const rows = await listMyGroupStudents(groupId);
      setRosterByGroup((prev) => ({ ...prev, [groupId]: rows }));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.groups.rosterError")));
    } finally {
      setRosterLoading((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  }

  function openStudent(group, student) {
    navigate(`/teacher/students/${student.student_id}?group=${group.id}`, {
      state: { groupName: group.name },
    });
  }

  const statusVariant = (status) => (status === "active" ? "success" : "neutral");
  const statusLabel = (status) =>
    status === "active" ? t("status.active") : t("teacher.groupDetail.statusLeft");

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
      {groups.map((group) => {
        const isOpen = expanded.has(group.id);
        const roster = rosterByGroup[group.id];
        const isRosterLoading = rosterLoading.has(group.id);

        return (
          <Card key={group.id} padding="p-0" className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 p-4 text-left"
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
              <ChevronDown
                size={16}
                className={cn("shrink-0 text-fg-faint transition-transform", isOpen && "rotate-180")}
              />
            </button>

            {isOpen && (
              <div className="ml-[38px] border-l-2 border-accent-light/55 border-t border-line py-1 pl-4">
                {isRosterLoading && !roster ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2.5 py-2.5 pr-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ))
                ) : roster?.length === 0 ? (
                  <p className="py-3 pr-4 text-xs text-fg-muted">{t("teacher.groups.emptyRoster")}</p>
                ) : (
                  (roster || []).map((student) => (
                    <button
                      key={student.student_id}
                      type="button"
                      onClick={() => openStudent(group, student)}
                      className="flex w-full items-center gap-2.5 py-2.5 pr-4 text-left"
                    >
                      <Avatar photoUrl={student.photo_url} name={student.student_full_name} size="sm" />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm font-medium",
                          student.status !== "active" && "text-fg-muted",
                        )}
                      >
                        {student.student_full_name}
                      </span>
                      <Badge variant={statusVariant(student.status)}>{statusLabel(student.status)}</Badge>
                      <ChevronRight size={14} className="shrink-0 text-fg-faint" />
                    </button>
                  ))
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
