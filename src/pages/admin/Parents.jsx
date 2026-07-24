import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, UserCheck, UserX, Users } from "lucide-react";
import { exportParents, getParentsSummary, listParents } from "../../api/parents";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import StatGrid from "../../components/ui/StatGrid";
import Table from "../../components/ui/Table";
import Tabs from "../../components/ui/Tabs";
import { toast } from "../../components/ui/Toast";
import { linkedVariant } from "../../constants/status";
import { getErrorMessage } from "../../utils/apiError";

const PAGE_SIZE = 20;

const RELATIONSHIP_KEYS = ["ona", "ota", "aka_opa", "boshqa"];

function linkedOnlyFromTab(tab) {
  if (tab === "linked") return true;
  if (tab === "unlinked") return false;
  return undefined;
}

// This page has exactly three stats; the grid keeps three columns instead of
// StatGrid's four so the row never ends in an empty slot.
const STAT_GRID_CLASS = "mb-6 sm:grid-cols-3 lg:!grid-cols-3";

export default function Parents() {
  const { t } = useTranslation();
  const RELATIONSHIP_LABELS = Object.fromEntries(
    RELATIONSHIP_KEYS.map((key) => [key, t(`pages.parents.relationship.${key}`)]),
  );
  const TABS = [
    { key: "all", label: t("pages.parents.tabs.all") },
    { key: "linked", label: t("status.linked") },
    { key: "unlinked", label: t("status.unlinked") },
  ];

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Tab lives in the URL so a reload keeps the same slice of the list.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.key === tabParam) ? tabParam : "all";

  function setActiveTab(key) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: true });
  }
  const [filterRelationship, setFilterRelationship] = useState("");

  const [parents, setParents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getParentsSummary()
      .then(setSummary)
      .catch((error) => toast.error(getErrorMessage(error, t("pages.parents.statsError"))))
      .finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filterRelationship]);

  useEffect(() => {
    loadParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterRelationship, page]);

  async function loadParents() {
    setLoading(true);
    try {
      const data = await listParents({
        page,
        size: PAGE_SIZE,
        relationship_type: filterRelationship || undefined,
        linked_only: linkedOnlyFromTab(activeTab),
      });
      setParents(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.parents.listError")));
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setFilterRelationship("");
  }

  const hasFilters = Boolean(filterRelationship);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportParents({
        relationship_type: filterRelationship || undefined,
        linked_only: linkedOnlyFromTab(activeTab),
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ota-onalar.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.parents.exportError")));
    } finally {
      setExporting(false);
    }
  }

  const linkedPercent = useMemo(() => {
    if (!summary || summary.total_students === 0) return 0;
    return Math.round((summary.linked_count / summary.total_students) * 100);
  }, [summary]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    { key: "student_full_name", header: t("pages.parents.columns.student"), truncate: true },
    { key: "parent_name", header: t("pages.parents.columns.parentName"), truncate: true },
    { key: "filial_name", header: t("pages.parents.columns.filial"), truncate: true },
    { key: "parent_phone", header: t("pages.parents.columns.phone"), nowrap: true },
    {
      key: "relationship_type",
      header: t("pages.parents.columns.relationship"),
      nowrap: true,
      render: (row) =>
        row.relationship_type
          ? RELATIONSHIP_LABELS[row.relationship_type] || row.relationship_type
          : null,
    },
    {
      key: "telegram_linked",
      header: t("pages.parents.columns.botStatus"),
      nowrap: true,
      render: (row) => (
        <Badge variant={linkedVariant(row.telegram_linked)}>
          {row.telegram_linked ? t("status.linked") : t("status.unlinked")}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("nav.parents")}>
        <Button onClick={handleExport} disabled={exporting}>
          <Download size={16} />
          {exporting ? t("pages.parents.preparing") : t("pages.parents.downloadCsv")}
        </Button>
      </PageHeader>

      {summaryLoading || !summary ? (
        <StatGrid loading count={3} className={STAT_GRID_CLASS} />
      ) : (
        <StatGrid className={STAT_GRID_CLASS}>
          <StatCard variant="blue" icon={Users} label={t("pages.parents.stats.totalStudents")} value={summary.total_students} />
          <StatCard
            variant="teal"
            icon={UserCheck}
            label={t("pages.parents.stats.linkedParents")}
            value={`${summary.linked_count} (${linkedPercent}%)`}
          />
          <StatCard variant="purple" icon={UserX} label={t("pages.parents.stats.unlinkedCount")} value={summary.unlinked_count} />
        </StatGrid>
      )}

      <Tabs className="mb-4 w-fit" tabs={TABS} value={activeTab} onChange={setActiveTab} />

      <FilterBar onClear={hasFilters ? clearFilters : undefined}>
        <Select
          label={t("pages.parents.columns.relationship")}
          className="w-full max-w-[180px]"
          value={filterRelationship}
          onChange={(event) => setFilterRelationship(event.target.value)}
        >
          <option value="">{t("pages.parents.tabs.all")}</option>
          {Object.entries(RELATIONSHIP_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </FilterBar>

      <Table
        columns={columns}
        data={parents}
        loading={loading}
        rowKey={(row) => `${row.student_id}-${row.telegram_chat_id ?? "none"}`}
        emptyState={
          <EmptyState
            icon={Users}
            title={
              hasFilters || activeTab !== "all"
                ? t("pages.parents.emptyFilteredTitle")
                : t("pages.parents.emptyTitle")
            }
            description={
              hasFilters || activeTab !== "all"
                ? t("pages.parents.emptyFilteredDescription")
                : t("pages.parents.emptyDescription")
            }
          />
        }
      />

      {!loading && parents.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
      )}
    </div>
  );
}
