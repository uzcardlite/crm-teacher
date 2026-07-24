import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, MessageSquare, Send, X } from "lucide-react";
import { getSmsConfig, listSmsLogs, sendSms } from "../../api/sms";
import { listGroups } from "../../api/groups";
import { listStudents } from "../../api/students";
import { useTenantModules } from "../../context/TenantModulesContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import IconButton from "../../components/ui/IconButton";
import DateInput from "../../components/ui/DateInput";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Spinner from "../../components/ui/Spinner";
import Table from "../../components/ui/Table";
import Tabs from "../../components/ui/Tabs";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { normalizePhoneValue, PHONE_PREFIX } from "../../utils/phone";
import { formatDateTime } from "../../utils/format";
import {
  DEFAULT_RECIPIENT_TYPE,
  DEFAULT_TAB,
  STATUS_BADGE,
  STATUS_ORDER,
  VALID_TABS,
} from "../../constants/sms";

const PAGE_SIZE = 20;

// A normalized value only counts as a real recipient when it carries the full
// +998 + 9 digits (13 chars). normalizePhoneValue() collapses garbage back to
// the bare prefix, so anything shorter is rejected.
const FULL_PHONE_LENGTH = PHONE_PREFIX.length + 9;

// Splits the free-text phone box (newline/comma separated) into normalized,
// valid numbers plus a count of the entries that could not be salvaged.
function parsePhones(text) {
  const entries = text
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const valid = [];
  let invalid = 0;
  for (const entry of entries) {
    const normalized = normalizePhoneValue(entry);
    if (normalized.length === FULL_PHONE_LENGTH) {
      valid.push(normalized);
    } else {
      invalid += 1;
    }
  }
  return { valid, invalid };
}

// --- Compose tab ------------------------------------------------------------

function ComposeTab({ config }) {
  const { t } = useTranslation();

  const [recipientType, setRecipientType] = useState(DEFAULT_RECIPIENT_TYPE);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentPick, setStudentPick] = useState("");
  const [phonesText, setPhonesText] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    listGroups({ page: 1, size: 100 })
      .then((data) => setGroups(data.items))
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.sms.groupsError")));
        }
      });
    listStudents({ page: 1, size: 100 })
      .then((data) => setStudents(data.items))
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.sms.studentsError")));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedPhones = useMemo(() => parsePhones(phonesText), [phonesText]);

  const availableStudents = useMemo(
    () => students.filter((s) => !selectedStudents.some((sel) => sel.id === s.id)),
    [students, selectedStudents],
  );

  // Recipient count preview. For a group we surface the enrolled student count
  // the groups list already carries; free phones use only the valid entries.
  const recipientCount = useMemo(() => {
    if (recipientType === "group") {
      const group = groups.find((g) => g.id === groupId);
      return group?.current_students_count ?? 0;
    }
    if (recipientType === "students") return selectedStudents.length;
    return parsedPhones.valid.length;
  }, [recipientType, groups, groupId, selectedStudents, parsedPhones]);

  const hasRecipients =
    (recipientType === "group" && Boolean(groupId)) ||
    (recipientType === "students" && selectedStudents.length > 0) ||
    (recipientType === "phones" && parsedPhones.valid.length > 0);

  const providerOff = config?.enabled === false;
  const canSubmit = body.trim().length > 0 && hasRecipients && !providerOff && !sending;

  function addStudent(id) {
    if (!id) return;
    const student = students.find((s) => s.id === id);
    if (student) setSelectedStudents((prev) => [...prev, student]);
    setStudentPick("");
  }

  function removeStudent(id) {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSend() {
    // Guard: real money leaves on send, so never fire twice or on bad input.
    if (sending) return;
    if (!body.trim()) {
      toast.error(t("pages.sms.validation.bodyRequired"));
      return;
    }
    const payload = { body: body.trim() };
    if (recipientType === "group") {
      if (!groupId) {
        toast.error(t("pages.sms.validation.noRecipients"));
        return;
      }
      payload.group_id = groupId;
    } else if (recipientType === "students") {
      if (selectedStudents.length === 0) {
        toast.error(t("pages.sms.validation.noRecipients"));
        return;
      }
      payload.student_ids = selectedStudents.map((s) => s.id);
    } else {
      if (parsedPhones.valid.length === 0) {
        toast.error(t("pages.sms.validation.noValidPhones"));
        return;
      }
      if (parsedPhones.invalid > 0) {
        toast.error(t("pages.sms.validation.invalidPhones", { count: parsedPhones.invalid }));
      }
      payload.phones = parsedPhones.valid;
    }

    setSending(true);
    try {
      const data = await sendSms(payload);
      setResult(data);
      toast.success(t("pages.sms.sendSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.sms.sendError")));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <div className="flex flex-col gap-4">
        <Select
          label={t("pages.sms.compose.recipientLabel")}
          value={recipientType}
          onChange={(event) => {
            setRecipientType(event.target.value);
            setResult(null);
          }}
        >
          <option value="group">{t("pages.sms.recipientType.group")}</option>
          <option value="students">{t("pages.sms.recipientType.students")}</option>
          <option value="phones">{t("pages.sms.recipientType.phones")}</option>
        </Select>

        {recipientType === "group" && (
          <Select
            label={t("pages.sms.compose.groupLabel")}
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            <option value="">{t("pages.sms.compose.groupPlaceholder")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        )}

        {recipientType === "students" && (
          <div className="flex flex-col gap-2">
            <Select
              label={t("pages.sms.compose.studentLabel")}
              value={studentPick}
              onChange={(event) => addStudent(event.target.value)}
            >
              <option value="">{t("pages.sms.compose.studentPlaceholder")}</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </Select>
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student) => (
                  <Badge key={student.id} variant="neutral" className="gap-1 pr-1">
                    {student.full_name}
                    <IconButton
                      icon={X}
                      aria-label={t("common.remove")}
                      className="h-5 w-5"
                      onClick={() => removeStudent(student.id)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {recipientType === "phones" && (
          <Textarea
            label={t("pages.sms.compose.phonesLabel")}
            rows={3}
            value={phonesText}
            onChange={(event) => setPhonesText(event.target.value)}
            placeholder={t("pages.sms.compose.phonesPlaceholder")}
          />
        )}

        <p className="text-sm text-fg-muted">
          {t("pages.sms.compose.recipientCount", { count: recipientCount })}
        </p>

        <div>
          <Textarea
            label={t("pages.sms.compose.messageLabel")}
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("pages.sms.compose.messagePlaceholder")}
          />
          <p className="mt-1 text-xs text-fg-muted">
            {t("pages.sms.compose.charCount", { count: body.length })}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={!canSubmit}>
            {sending ? (
              <>
                <Spinner size={16} />
                {t("pages.sms.compose.sending")}
              </>
            ) : (
              <>
                <Send size={16} />
                {t("pages.sms.compose.send")}
              </>
            )}
          </Button>
        </div>

        {result && (
          <Card padding="p-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">
                {t("pages.sms.result.sent", { count: result.sent })}
              </Badge>
              <Badge variant="warning">
                {t("pages.sms.result.skipped", { count: result.skipped })}
              </Badge>
              <Badge variant="danger">
                {t("pages.sms.result.failed", { count: result.failed })}
              </Badge>
            </div>
          </Card>
        )}
      </div>
    </Card>
  );
}

// --- History tab ------------------------------------------------------------

function HistoryTab() {
  const { t } = useTranslation();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, status]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSmsLogs({
        page,
        size: PAGE_SIZE,
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setLogs(data.items);
      setTotal(data.total);
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.sms.logsError")));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(dateFrom || dateTo || status);

  const columns = [
    {
      key: "created_at",
      header: t("pages.sms.columns.date"),
      nowrap: true,
      render: (row) => formatDateTime(row.created_at),
    },
    { key: "phone", header: t("pages.sms.columns.phone"), nowrap: true },
    {
      key: "body",
      header: t("pages.sms.columns.message"),
      truncate: true,
      className: "max-w-[220px]",
    },
    {
      key: "status",
      header: t("pages.sms.columns.status"),
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status] ?? "neutral"}>
          {t(`pages.sms.status.${row.status}`)}
        </Badge>
      ),
    },
    { key: "error", header: t("pages.sms.columns.error"), truncate: true },
  ];

  function handleClear() {
    setDateFrom("");
    setDateTo("");
    setStatus("");
  }

  return (
    <>
      <FilterBar onClear={hasFilters ? handleClear : undefined}>
        <DateInput
          label={t("pages.sms.history.dateFrom")}
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
        />
        <DateInput
          label={t("pages.sms.history.dateTo")}
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
        />
        <Select
          label={t("pages.sms.statusFilter")}
          className="w-full max-w-[200px]"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t("common.all")}</option>
          {STATUS_ORDER.map((key) => (
            <option key={key} value={key}>
              {t(`pages.sms.status.${key}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      <Table
        columns={columns}
        data={logs}
        loading={loading}
        rowKey={(row) => row.id}
        emptyState={<EmptyState icon={MessageSquare} title={t("pages.sms.empty.title")} />}
      />

      {!loading && logs.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
      )}
    </>
  );
}

// --- Page -------------------------------------------------------------------

export default function Sms() {
  const { t } = useTranslation();
  const { hasPermission } = useTenantModules();
  const canSend = hasPermission("sms.send");
  const canView = hasPermission("sms.view");

  const [searchParams, setSearchParams] = useSearchParams();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Banner is best-effort: a failed config read simply leaves it hidden.
    getSmsConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  // Only expose the tabs the role can actually use.
  const tabs = [];
  if (canSend) tabs.push({ key: "compose", label: t("pages.sms.compose.tab") });
  if (canView) tabs.push({ key: "history", label: t("pages.sms.history.tab") });

  const tabParam = searchParams.get("tab");
  const preferred = VALID_TABS.includes(tabParam) ? tabParam : DEFAULT_TAB;
  const availableKeys = tabs.map((tab) => tab.key);
  const activeTab = availableKeys.includes(preferred) ? preferred : availableKeys[0];

  function setTab(key) {
    setSearchParams({ tab: key }, { replace: true });
  }

  const providerOff = config?.enabled === false;

  return (
    <div className="p-6">
      <PageHeader title={t("nav.sms")} />

      {providerOff && (
        <div className="mb-6 flex items-start gap-3 rounded-card border border-line bg-accent-light/30 p-4">
          <AlertTriangle size={20} className="shrink-0 text-accent-dark" />
          <div>
            <p className="text-sm font-medium text-fg">{t("pages.sms.disabledBanner.title")}</p>
            <p className="text-sm text-fg-muted">{t("pages.sms.disabledBanner.description")}</p>
          </div>
        </div>
      )}

      {tabs.length > 1 && (
        <Tabs className="mb-4" tabs={tabs} value={activeTab} onChange={setTab} />
      )}

      {activeTab === "compose" && canSend && <ComposeTab config={config} />}
      {activeTab === "history" && canView && <HistoryTab />}
    </div>
  );
}
