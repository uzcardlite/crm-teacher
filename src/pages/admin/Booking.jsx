import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { listBookings } from "../../api/booking";
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
import { formatDate } from "../../utils/format";

const PAGE_SIZE = 20;
const STATUSES = ["pending", "confirmed", "cancelled"];
const STATUS_VARIANT = { pending: "warning", confirmed: "success", cancelled: "danger" };

// "09:00:00" -> "09:00".
function hm(time) {
  return time ? time.slice(0, 5) : "";
}

export default function Booking() {
  const { t } = useTranslation();

  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [teachers, setTeachers] = useState([]);
  const [teacherFilter, setTeacherFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    listTeachers({ page: 1, size: 100 })
      .then((data) => setTeachers(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.booking.teachersError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [teacherFilter, statusFilter]);

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherFilter, statusFilter]);

  async function loadBookings() {
    setLoading(true);
    try {
      const data = await listBookings({
        teacher_id: teacherFilter || undefined,
        status: statusFilter || undefined,
      });
      setRecords(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.booking.bookingsError")));
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const pageRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Boolean(teacherFilter || statusFilter);

  const columns = [
    { key: "student_name", header: t("pages.booking.columns.student"), truncate: true },
    { key: "teacher_name", header: t("pages.booking.columns.teacher") },
    {
      key: "date",
      header: t("pages.booking.columns.date"),
      nowrap: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: "time",
      header: t("pages.booking.columns.time"),
      nowrap: true,
      render: (row) => `${hm(row.start_time)}–${hm(row.end_time)}`,
    },
    { key: "parent_phone", header: t("pages.booking.columns.parentPhone") },
    {
      key: "status",
      header: t("pages.booking.columns.status"),
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status]}>
          {t(`pages.booking.status.${row.status}`)}
        </Badge>
      ),
    },
    { key: "note", header: t("pages.booking.columns.note"), truncate: true },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("nav.booking")} />

      <FilterBar
        onClear={
          hasFilters
            ? () => {
                setTeacherFilter("");
                setStatusFilter("");
              }
            : undefined
        }
      >
        <Select
          label={t("pages.booking.teacher")}
          className="w-full max-w-[240px]"
          value={teacherFilter}
          onChange={(event) => setTeacherFilter(event.target.value)}
        >
          <option value="">{t("pages.booking.allTeachers")}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.full_name}
            </option>
          ))}
        </Select>
        <Select
          label={t("pages.booking.statusFilter")}
          className="w-full max-w-[240px]"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">{t("pages.booking.allStatuses")}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`pages.booking.status.${status}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      <Table
        columns={columns}
        data={pageRecords}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={CalendarClock}
            title={t("pages.booking.emptyTitle")}
            description={t("pages.booking.emptyDescription")}
          />
        }
      />

      {!loading && records.length > PAGE_SIZE && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
