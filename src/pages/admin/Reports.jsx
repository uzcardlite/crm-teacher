import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Lock } from "lucide-react";
import { downloadFinanceReport, downloadAttendanceReport } from "../../api/reports";
import { listGroups } from "../../api/groups";
import { useTenantModules } from "../../context/TenantModulesContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import DateInput from "../../components/ui/DateInput";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Tabs from "../../components/ui/Tabs";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { saveBlobResponse } from "../../utils/downloadFile";

export default function Reports() {
  const { t } = useTranslation();
  const { hasPermission } = useTenantModules();

  const canFinance = hasPermission("reports.finance");
  const canAttendance = hasPermission("reports.attendance");

  // One tab per permission — a user only sees the reports they may export.
  const visibleTabKeys = useMemo(() => {
    const keys = [];
    if (canFinance) keys.push("finance");
    if (canAttendance) keys.push("attendance");
    return keys;
  }, [canFinance, canAttendance]);

  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get("type");
  // An unauthorised or unknown `type` in the URL falls back to the first
  // visible tab, so a forbidden tab is never reachable by deep link.
  const activeTab = visibleTabKeys.includes(typeParam) ? typeParam : visibleTabKeys[0];

  function setTab(key) {
    setSearchParams({ type: key }, { replace: true });
  }

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupId, setGroupId] = useState("");
  const [format, setFormat] = useState("xlsx");
  const [groups, setGroups] = useState([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!canAttendance) return;
    listGroups({ page: 1, size: 100 })
      .then((data) => setGroups(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.attendance.groupsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAttendance]);

  // Live range check so the Inputs and the Download button react together.
  const rangeError = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  async function handleDownload() {
    if (!dateFrom || !dateTo) {
      toast.error(t("pages.reports.dateRequired"));
      return;
    }
    if (dateFrom > dateTo) {
      toast.error(t("pages.reports.dateRangeError"));
      return;
    }

    setDownloading(true);
    try {
      let response;
      let fallbackName;
      if (activeTab === "finance") {
        response = await downloadFinanceReport({
          date_from: dateFrom,
          date_to: dateTo,
          format,
        });
        fallbackName = `moliya_${dateFrom}_${dateTo}.${format}`;
      } else {
        response = await downloadAttendanceReport({
          date_from: dateFrom,
          date_to: dateTo,
          format,
          group_id: groupId || undefined,
        });
        fallbackName = `davomat_${dateFrom}_${dateTo}.${format}`;
      }
      saveBlobResponse(response, fallbackName);
      toast.success(t("pages.reports.downloaded"));
    } catch {
      // The error body is a blob, so `getErrorMessage` cannot parse the JSON
      // reliably — fall back to a generic toast (PaymentsTab pattern).
      toast.error(t("pages.reports.downloadError"));
    } finally {
      setDownloading(false);
    }
  }

  const visibleTabs = visibleTabKeys.map((key) => ({
    key,
    label: t(`pages.reports.tabs.${key}`),
  }));

  if (visibleTabKeys.length === 0) {
    return (
      <div className="p-6">
        <PageHeader title={t("nav.reports")} />
        <EmptyState
          icon={Lock}
          title={t("pages.reports.noAccessTitle")}
          description={t("pages.reports.noAccessDescription")}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title={t("nav.reports")} />

      <Tabs className="mb-4 w-fit" tabs={visibleTabs} value={activeTab} onChange={setTab} />

      <Card padding="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <DateInput
            label={t("finance.common.dateFrom")}
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            error={rangeError ? t("pages.reports.dateRangeError") : undefined}
          />

          <DateInput
            label={t("finance.common.dateTo")}
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            error={rangeError ? t("pages.reports.dateRangeError") : undefined}
          />

          {activeTab === "attendance" && (
            <Select
              label={t("pages.attendance.group")}
              className="w-full max-w-[240px]"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
            >
              <option value="">{t("pages.reports.allGroups")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          )}

          <Select
            label={t("pages.reports.formatLabel")}
            className="w-full max-w-[160px]"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="xlsx">XLSX</option>
            <option value="csv">CSV</option>
          </Select>

          <div className="ml-auto">
            <Button variant="primary" onClick={handleDownload} disabled={downloading || rangeError}>
              <Download size={16} />
              {downloading ? t("finance.common.preparing") : t("pages.reports.download")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
