import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UsersRound } from "lucide-react";
import { listMyGroups } from "../../api/teacher";
import EmptyState from "../../components/ui/EmptyState";
import { GroupedList, ListRow } from "../../components/ui/List";
import PageTitle from "../../components/ui/PageTitle";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";

const PAGE_CLASS = "mx-auto max-w-lg space-y-5 px-4 pb-24 pt-5";

// The teacher's groups as one grouped list; a row opens the group page
// (students, who has paid, the monthly register).
export default function Groups() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState(null);

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((error) => {
        setGroups([]);
        toast.error(getErrorMessage(error, t("teacher.groups.loadError")));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = (groups || []).reduce((sum, group) => sum + (group.current_students_count || 0), 0);

  return (
    <div className={PAGE_CLASS}>
      <PageTitle
        title={t("teacher.groups.title")}
        subtitle={groups ? t("teacher.groups.summary", { groups: groups.length, students: total }) : null}
      />
      {groups === null ? (
        <Skeleton className="h-48 w-full rounded-card" />
      ) : groups.length === 0 ? (
        <EmptyState size="md" icon={UsersRound} title={t("teacher.groups.emptyTitle")} description={t("teacher.groups.emptyDescription")} />
      ) : (
        <GroupedList>
          {groups.map((group) => (
            <ListRow
              key={group.id}
              to={`/teacher/groups/${group.id}`}
              leading={
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-[13px] font-semibold text-fg-secondary">
                  {group.name.slice(0, 2).toUpperCase()}
                </span>
              }
              title={group.name}
              subtitle={t("teacher.groups.studentsCount", { count: group.current_students_count })}
            />
          ))}
        </GroupedList>
      )}
    </div>
  );
}
