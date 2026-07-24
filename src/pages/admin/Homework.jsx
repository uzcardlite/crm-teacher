import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { listHomework } from "../../api/homework";
import { listGroups } from "../../api/groups";
import { listTeachers } from "../../api/teachers";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate, homeworkDueStatus } from "../../utils/format";

const PAGE_SIZE = 20;

export default function Homework() {
  const { t } = useTranslation();

  const [homeworks, setHomeworks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");

  useEffect(() => {
    listGroups({ page: 1, size: 100 })
      .then((data) => setGroups(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.homework.groupsError"))));
    listTeachers({ page: 1, size: 100 })
      .then((data) => setTeachers(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.homework.teachersError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [groupFilter, teacherFilter]);

  useEffect(() => {
    loadHomeworks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, groupFilter, teacherFilter]);

  async function loadHomeworks() {
    setLoading(true);
    try {
      const data = await listHomework({
        page,
        size: PAGE_SIZE,
        group_id: groupFilter || undefined,
        teacher_id: teacherFilter || undefined,
      });
      setHomeworks(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.homework.homeworksError")));
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(groupFilter || teacherFilter);

  const columns = [
    { key: "title", header: t("pages.homework.columns.title"), truncate: true },
    { key: "group_name", header: t("pages.homework.columns.group") },
    { key: "teacher_name", header: t("pages.homework.columns.teacher") },
    {
      key: "due_date",
      header: t("pages.homework.columns.dueDate"),
      nowrap: true,
      render: (row) => formatDate(row.due_date),
    },
    {
      key: "status",
      header: t("pages.homework.columns.status"),
      nowrap: true,
      render: (row) => {
        const status = homeworkDueStatus(row.due_date);
        return <Badge variant={status.variant}>{t(`pages.homework.${status.key}`)}</Badge>;
      },
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("nav.homework")} />

      <FilterBar
        onClear={
          hasFilters
            ? () => {
                setGroupFilter("");
                setTeacherFilter("");
              }
            : undefined
        }
      >
        <Select
          label={t("pages.homework.group")}
          className="w-full max-w-[240px]"
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          <option value="">{t("pages.homework.allGroups")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("pages.homework.teacher")}
          className="w-full max-w-[240px]"
          value={teacherFilter}
          onChange={(event) => setTeacherFilter(event.target.value)}
        >
          <option value="">{t("pages.homework.allTeachers")}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.full_name}
            </option>
          ))}
        </Select>
      </FilterBar>

      <Table
        columns={columns}
        data={homeworks}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={ClipboardList}
            title={t("pages.homework.emptyTitle")}
            description={t("pages.homework.emptyDescription")}
          />
        }
      />

      {!loading && homeworks.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
