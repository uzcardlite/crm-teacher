import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  bulkSaveMyDailyGrades,
  listMyDailyGrades,
  listMyGroups,
  listMyGroupStudents,
} from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DateInput from "../../components/ui/DateInput";
import EmptyState from "../../components/ui/EmptyState";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-28 pt-4";

// 1–5 scores, coloured low→high. The palette is the same one the redesign
// uses: danger, clay, warning, feruza(secondary), success — so a score reads
// like attendance does elsewhere.
const SCORES = [
  { value: 1, active: "border-danger bg-danger text-white" },
  { value: 2, active: "border-clay bg-clay text-white" },
  { value: 3, active: "border-warning bg-warning text-white" },
  { value: 4, active: "border-secondary bg-secondary text-white" },
  { value: 5, active: "border-success bg-success text-white" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyGrades() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [date, setDate] = useState(todayISO);
  const [roster, setRoster] = useState([]);
  const [gradesMap, setGradesMap] = useState({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listMyGroups()
      .then((list) => {
        setGroups(list);
        if (list.length > 0) setGroupId(String(list[0].id));
      })
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.dailyGrades.groupsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId) return;
    setLoadingRoster(true);
    Promise.all([
      listMyGroupStudents(groupId),
      listMyDailyGrades({ group_id: groupId, date }),
    ])
      .then(([groupStudents, records]) => {
        setRoster(groupStudents);
        const map = {};
        records.forEach((record) => {
          map[record.student_id] = record.score;
        });
        setGradesMap(map);
      })
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.dailyGrades.loadError"))))
      .finally(() => setLoadingRoster(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, date]);

  const gradedCount = useMemo(
    () => roster.filter((student) => gradesMap[student.student_id]).length,
    [roster, gradesMap],
  );
  const allGraded = roster.length > 0 && gradedCount === roster.length;

  async function handleSave() {
    const records = roster
      .filter((student) => gradesMap[student.student_id])
      .map((student) => ({
        student_id: student.student_id,
        score: gradesMap[student.student_id],
      }));
    if (records.length === 0) {
      toast.error(t("teacher.dailyGrades.noScore"));
      return;
    }
    setSaving(true);
    try {
      await bulkSaveMyDailyGrades({ group_id: groupId, date, records });
      toast.success(t("teacher.dailyGrades.saved"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.dailyGrades.saveError")));
    } finally {
      setSaving(false);
    }
  }

  if (groups.length === 0) {
    return (
      <div className={PAGE_CLASS}>
        <EmptyState
          size="md"
          title={t("teacher.dailyGrades.noGroupsTitle")}
          description={t("teacher.dailyGrades.noGroupsDescription")}
        />
      </div>
    );
  }

  return (
    <div className={PAGE_CLASS}>
      {/* Group + date pickers */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label={t("teacher.dailyGrades.group")}
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        <DateInput
          label={t("teacher.dailyGrades.date")}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          max={todayISO()}
        />
      </div>

      {/* Progress */}
      {roster.length > 0 && (
        <div className="flex items-center gap-3 px-0.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                allGraded ? "bg-success" : "bg-accent",
              )}
              style={{ width: `${Math.round((gradedCount / roster.length) * 100)}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              allGraded ? "text-success" : "text-fg-secondary",
            )}
          >
            {gradedCount}/{roster.length}
            {allGraded ? " ✓" : ""}
          </span>
        </div>
      )}

      {/* Student list */}
      {loadingRoster ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} padding="p-3" className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-11 w-full rounded-btn" />
            </Card>
          ))}
        </div>
      ) : roster.length === 0 ? (
        <EmptyState size="md" title={t("teacher.dailyGrades.emptyTitle")} />
      ) : (
        <div className="space-y-3">
          {roster.map((student) => {
            const current = gradesMap[student.student_id];
            return (
              <Card key={student.student_id} padding="p-3">
                <div className="mb-3 flex items-center gap-2.5">
                  <Avatar
                    photoUrl={student.photo_url}
                    name={student.student_full_name}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate font-display text-base font-semibold text-fg">
                    {student.student_full_name}
                  </span>
                  {current ? (
                    <span className="shrink-0 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success">
                      {t("teacher.dailyGrades.graded")}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-accent-light/25 px-2 py-0.5 text-[10px] font-bold text-accent-dark dark:text-accent">
                      {t("teacher.dailyGrades.notGraded")}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {SCORES.map((score) => {
                    const isActive = current === score.value;
                    return (
                      <button
                        key={score.value}
                        type="button"
                        onClick={() =>
                          setGradesMap((prev) => ({
                            ...prev,
                            [student.student_id]: score.value,
                          }))
                        }
                        aria-pressed={isActive}
                        aria-label={t("teacher.dailyGrades.scoreLabel", { score: score.value })}
                        className={cn(
                          "flex h-11 items-center justify-center rounded-btn border text-lg font-bold tabular-nums transition-colors",
                          isActive
                            ? score.active
                            : "border-line-strong text-fg-muted hover:bg-surface-sunken",
                        )}
                      >
                        {score.value}
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky save bar */}
      {roster.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-4 pb-2">
          <div className="mx-auto max-w-lg">
            <Button
              variant={allGraded ? "primary" : "brand"}
              className="w-full shadow-card"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? t("teacher.common.saving")
                : allGraded
                  ? `✓ ${t("teacher.dailyGrades.allGraded")}`
                  : t("teacher.dailyGrades.save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
