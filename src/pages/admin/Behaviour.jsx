import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { listBehaviour } from "../../api/behaviour";
import { listGroups } from "../../api/groups";
import { listTeachers } from "../../api/teachers";
import { listStudents } from "../../api/students";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { behaviourTone, formatDate } from "../../utils/format";

const PAGE_SIZE = 20;

// Signed display: "+3" / "−2" (U+2212 minus for negatives, never a hyphen).
function signPoints(points) {
  return `${points >= 0 ? "+" : "−"}${Math.abs(points)}`;
}

export default function Behaviour() {
  const { t } = useTranslation();

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");

  useEffect(() => {
    listGroups({ page: 1, size: 100 })
      .then((data) => setGroups(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.behaviour.groupsError"))));
    listTeachers({ page: 1, size: 100 })
      .then((data) => setTeachers(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.behaviour.teachersError"))));
    listStudents({ page: 1, size: 100 })
      .then((data) => setStudents(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.behaviour.studentsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [groupFilter, teacherFilter, studentFilter]);

  useEffect(() => {
    loadBehaviour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, groupFilter, teacherFilter, studentFilter]);

  async function loadBehaviour() {
    setLoading(true);
    try {
      const data = await listBehaviour({
        page,
        size: PAGE_SIZE,
        group_id: groupFilter || undefined,
        teacher_id: teacherFilter || undefined,
        student_id: studentFilter || undefined,
      });
      setRecords(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.behaviour.behaviourError")));
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(groupFilter || teacherFilter || studentFilter);

  const columns = [
    { key: "student_name", header: t("pages.behaviour.columns.student"), truncate: true },
    { key: "group_name", header: t("pages.behaviour.columns.group") },
    { key: "teacher_name", header: t("pages.behaviour.columns.teacher") },
    {
      key: "points",
      header: t("pages.behaviour.columns.points"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <Badge variant={behaviourTone(row.points).badge}>
          <span className="font-semibold tabular-nums">{signPoints(row.points)}</span>
        </Badge>
      ),
    },
    { key: "note", header: t("pages.behaviour.columns.note"), truncate: true },
    {
      key: "date",
      header: t("pages.behaviour.columns.date"),
      nowrap: true,
      render: (row) => formatDate(row.date),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("nav.behaviour")} />

      <FilterBar
        onClear={
          hasFilters
            ? () => {
                setGroupFilter("");
                setTeacherFilter("");
                setStudentFilter("");
              }
            : undefined
        }
      >
        <Select
          label={t("pages.behaviour.group")}
          className="w-full max-w-[240px]"
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          <option value="">{t("pages.behaviour.allGroups")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("pages.behaviour.teacher")}
          className="w-full max-w-[240px]"
          value={teacherFilter}
          onChange={(event) => setTeacherFilter(event.target.value)}
        >
          <option value="">{t("pages.behaviour.allTeachers")}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.full_name}
            </option>
          ))}
        </Select>
        <Select
          label={t("pages.behaviour.student")}
          className="w-full max-w-[240px]"
          value={studentFilter}
          onChange={(event) => setStudentFilter(event.target.value)}
        >
          <option value="">{t("pages.behaviour.allStudents")}</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name}
            </option>
          ))}
        </Select>
      </FilterBar>

      <Table
        columns={columns}
        data={records}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Star}
            title={t("pages.behaviour.emptyTitle")}
            description={t("pages.behaviour.emptyDescription")}
          />
        }
      />

      {!loading && records.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
