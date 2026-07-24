import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { listHiringHistory } from "../../api/hr";
import { listFilials } from "../../api/filials";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Input from "../ui/Input";
import DateInput from "../ui/DateInput";
import Select from "../ui/Select";
import Table from "../ui/Table";
import Pagination from "../ui/Pagination";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { EVENT_BADGE, EVENT_LABELS, formatDate } from "../../constants/hr";

const PAGE_SIZE = 20;

export default function HiringHistoryTab() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filials, setFilials] = useState([]);

  const [filterFilialId, setFilterFilialId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Inline guard: an inverted range would only ever return an empty page.
  const dateRangeInvalid = Boolean(
    filterDateFrom && filterDateTo && filterDateFrom > filterDateTo,
  );

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadHistory = useCallback(async () => {
    if (dateRangeInvalid) return;
    setLoading(true);
    try {
      const data = await listHiringHistory({
        page,
        size: PAGE_SIZE,
        filial_id: filterFilialId || undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        search: filterSearch || undefined,
      });
      setRecords(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      setRecords([]);
      setTotal(0);
      toast.error(getErrorMessage(error, t("staff.hiringHistory.loadError")));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterFilialId, filterDateFrom, filterDateTo, filterSearch, dateRangeInvalid]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function clearFilters() {
    setFilterFilialId("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchInput("");
    setFilterSearch("");
    setPage(1);
  }

  const hasFilters = Boolean(filterFilialId || filterDateFrom || filterDateTo || filterSearch);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    { key: "employee_full_name", header: t("staff.hiringHistory.columnEmployeeName") },
    { key: "position", header: t("staff.hiringHistory.columnPosition") },
    {
      key: "event_type",
      header: t("staff.hiringHistory.columnEventType"),
      render: (row) => (
        <Badge variant={EVENT_BADGE[row.event_type] || "neutral"}>
          {EVENT_LABELS[row.event_type] ? t(EVENT_LABELS[row.event_type]) : row.event_type}
        </Badge>
      ),
    },
    {
      key: "event_date",
      header: t("staff.hiringHistory.columnDate"),
      render: (row) => formatDate(row.event_date),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label={t("staff.common.filial")}
          className="w-full max-w-[180px]"
          value={filterFilialId}
          onChange={(event) => {
            setFilterFilialId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("staff.common.allFilials")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <DateInput
          label={t("staff.common.dateFrom")}
          value={filterDateFrom}
          onChange={(event) => {
            setFilterDateFrom(event.target.value);
            setPage(1);
          }}
        />
        <DateInput
          label={t("staff.common.dateTo")}
          value={filterDateTo}
          onChange={(event) => {
            setFilterDateTo(event.target.value);
            setPage(1);
          }}
          error={dateRangeInvalid ? t("staff.common.dateRangeError") : undefined}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-secondary">{t("staff.common.search")}</span>
          <Input
            placeholder={t("staff.hiringHistory.searchPlaceholder")}
            className="w-48"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            {t("common.clear")}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        data={records}
        loading={loading && !dateRangeInvalid}
        rowKey={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Clock}
            title={
              hasFilters
                ? t("staff.hiringHistory.emptyFilteredTitle")
                : t("staff.hiringHistory.emptyTitle")
            }
            description={
              hasFilters
                ? t("staff.common.emptyFilterHint")
                : t("staff.hiringHistory.emptyDescription")
            }
          />
        }
      />

      {!loading && records.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
