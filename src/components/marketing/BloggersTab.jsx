import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  Layers,
  Loader,
  Megaphone,
  Pencil,
  Scissors,
  Trash2,
} from "lucide-react";
import {
  deleteMarketingPost,
  downloadMarketingPostsExport,
  getBlogger,
  getMarketingStats,
  listMarketingPosts,
} from "../../api/marketing";
import { listFilials } from "../../api/filials";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import FilterBar from "../ui/FilterBar";
import IconButton from "../ui/IconButton";
import Input from "../ui/Input";
import DateInput from "../ui/DateInput";
import Modal from "../ui/Modal";
import Pagination from "../ui/Pagination";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import StatCard from "../ui/StatCard";
import Table from "../ui/Table";
import Tabs from "../ui/Tabs";
import { toast } from "../ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { saveBlobResponse } from "../../utils/downloadFile";
import { formatAmountShort, formatDate, formatMoney } from "../../constants/moliya";
import {
  CHANNEL_BADGE,
  CHANNEL_LABELS,
  CHANNEL_TABS,
  POST_TYPE_BADGE,
  POST_TYPE_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  STATUS_ORDER,
} from "../../constants/marketing";
import BloggerFormModal from "./BloggerFormModal";
import PostFormModal from "./PostFormModal";

const PAGE_SIZE = 20;

// Compact stat row: one card per status plus the overall total.
const STATUS_CARD_ICONS = {
  rejalashtirilgan: CalendarClock,
  jarayonda: Loader,
  montajda: Scissors,
  chiqdi: CheckCircle2,
};
const STATUS_CARD_ORDER = ["rejalashtirilgan", "jarayonda", "montajda", "chiqdi"];

export default function BloggersTab({
  canManage,
  postModalOpen,
  bloggerModalOpen,
  onOpenPostModal,
  onClosePostModal,
  onCloseBloggerModal,
  onDataChanged,
}) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("");
  const [postType, setPostType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [statusStats, setStatusStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [filials, setFilials] = useState([]);
  const filialMap = useMemo(
    () => Object.fromEntries(filials.map((filial) => [filial.id, filial.name])),
    [filials],
  );

  const [editingPost, setEditingPost] = useState(null);
  const [editingBlogger, setEditingBlogger] = useState(null);
  const [loadingBloggerId, setLoadingBloggerId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("growth.bloggers.toastFilialsError")));
        }
      });
  }, [t]);

  // 300ms debounce so typing in the search box does not fire a request per key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [channel, status, postType, dateFrom, dateTo]);

  // The page-level "qo'shish" buttons always open an empty create form.
  useEffect(() => {
    if (postModalOpen) setEditingPost(null);
  }, [postModalOpen]);

  useEffect(() => {
    if (bloggerModalOpen) setEditingBlogger(null);
  }, [bloggerModalOpen]);

  const listParams = useMemo(
    () => ({
      channel: channel === "all" ? undefined : channel,
      status: status || undefined,
      post_type: postType || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: search || undefined,
    }),
    [channel, status, postType, dateFrom, dateTo, search],
  );

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMarketingPosts({ page, size: PAGE_SIZE, ...listParams });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("growth.bloggers.toastPostsError")));
      }
    } finally {
      setLoading(false);
    }
  }, [page, listParams, t]);

  // The status row comes from /stats, which only accepts the channel and date
  // filters — the status/type/search filters narrow the table alone.
  const loadStatusStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getMarketingStats({
        channel: channel === "all" ? undefined : channel,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setStatusStats(data.by_status || []);
    } catch (error) {
      setStatusStats(null);
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("growth.bloggers.toastStatsError")));
      }
    } finally {
      setStatsLoading(false);
    }
  }, [channel, dateFrom, dateTo, t]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    loadStatusStats();
  }, [loadStatusStats]);

  const statusMap = useMemo(
    () => Object.fromEntries((statusStats || []).map((item) => [item.status, item])),
    [statusStats],
  );
  const statusTotal = useMemo(
    () => (statusStats || []).reduce((sum, item) => sum + (item.count || 0), 0),
    [statusStats],
  );

  const hasFilters = Boolean(
    channel !== "all" || status || postType || dateFrom || dateTo || search,
  );

  function clearFilters() {
    setChannel("all");
    setStatus("");
    setPostType("");
    setDateFrom("");
    setDateTo("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  async function refresh() {
    await Promise.all([loadPosts(), loadStatusStats()]);
    await onDataChanged?.();
  }

  function closePostModal() {
    setEditingPost(null);
    onClosePostModal();
  }

  function closeBloggerModal() {
    setEditingBlogger(null);
    onCloseBloggerModal();
  }

  // The post row only embeds a brief blogger (id, username, display_name,
  // channel, avatar_url). Editing needs the full record, otherwise the form
  // would PATCH the missing fields back as null.
  async function openBloggerModal(brief) {
    if (!brief?.id || loadingBloggerId) return;
    setLoadingBloggerId(brief.id);
    try {
      const full = await getBlogger(brief.id);
      setEditingBlogger(full);
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.bloggers.toastBloggerLoadError")));
    } finally {
      setLoadingBloggerId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMarketingPost(deleteTarget.id);
      toast.success(t("growth.bloggers.toastDeleteSuccess"));
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.bloggers.toastDeleteError")));
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      // Export always carries the current filters, never just the current page.
      const response = await downloadMarketingPostsExport(listParams);
      saveBlobResponse(response, "marketing-postlar.csv");
      toast.success(t("growth.bloggers.toastExportSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.bloggers.toastExportError")));
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    {
      key: "blogger",
      header: t("growth.bloggers.columns.blogger"),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar
            size="sm"
            photoUrl={row.blogger?.avatar_url}
            name={row.blogger?.display_name || row.blogger?.username}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {canManage ? (
                <button
                  type="button"
                  disabled={loadingBloggerId === row.blogger?.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    openBloggerModal(row.blogger);
                  }}
                  className="font-medium text-fg hover:underline disabled:opacity-60"
                >
                  @{row.blogger?.username}
                </button>
              ) : (
                <span className="font-medium text-fg">@{row.blogger?.username}</span>
              )}
              <Badge variant={CHANNEL_BADGE[row.channel] || "neutral"}>
                {CHANNEL_LABELS[row.channel] ? t(CHANNEL_LABELS[row.channel]) : row.channel}
              </Badge>
            </div>
            <p className="text-xs text-fg-muted">{row.blogger?.display_name || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "content_note",
      header: t("growth.bloggers.columns.content"),
      truncate: true,
      // Null falls through to the table's em dash.
      render: (row) => row.content_note || row.topic || null,
    },
    {
      key: "post_type",
      header: t("growth.bloggers.columns.postType"),
      render: (row) => (
        <Badge variant={POST_TYPE_BADGE[row.post_type] || "neutral"}>
          {POST_TYPE_LABELS[row.post_type] ? t(POST_TYPE_LABELS[row.post_type]) : row.post_type}
        </Badge>
      ),
    },
    {
      key: "planned_date",
      header: t("growth.bloggers.columns.plannedDate"),
      nowrap: true,
      render: (row) => formatDate(row.planned_date),
    },
    {
      key: "published_date",
      header: t("growth.bloggers.columns.publishedDate"),
      nowrap: true,
      render: (row) => (row.published_date ? formatDate(row.published_date) : null),
    },
    {
      key: "status",
      header: t("growth.bloggers.columns.status"),
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status] || "neutral"}>
          {STATUS_LABELS[row.status] ? t(STATUS_LABELS[row.status]) : row.status}
        </Badge>
      ),
    },
    {
      key: "cost",
      header: t("growth.bloggers.columns.cost"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoney(row.cost),
    },
    {
      key: "reach",
      header: t("growth.bloggers.columns.reach"),
      align: "right",
      className: "max-w-[110px] truncate",
      render: (row) => (
        <span title={formatAmountShort(row.reach)}>{formatAmountShort(row.reach)}</span>
      ),
    },
    {
      key: "clicks",
      header: t("growth.bloggers.columns.clicks"),
      align: "right",
      nowrap: true,
      render: (row) => formatAmountShort(row.clicks),
    },
    {
      key: "leads",
      header: t("growth.bloggers.columns.leads"),
      align: "right",
      nowrap: true,
      render: (row) =>
        row.leads_source === "linked" ? (
          <div className="flex items-center justify-end gap-2">
            <Link
              to={`/app/students?tab=leads&post_id=${row.id}`}
              onClick={(event) => event.stopPropagation()}
              className="font-medium text-accent-dark hover:underline"
            >
              {row.leads_count}
            </Link>
            <Badge variant="blue">{t("growth.bloggers.leadsAuto")}</Badge>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span className="text-fg-secondary">{row.leads_count}</span>
            <Badge variant="neutral">{t("growth.bloggers.leadsManual")}</Badge>
          </div>
        ),
    },
    {
      key: "cpl",
      header: "CPL",
      align: "right",
      nowrap: true,
      // Null falls through to the table's em dash.
      render: (row) => (row.cpl === null || row.cpl === undefined ? null : formatMoney(row.cpl)),
    },
    {
      key: "cac",
      header: "CAC",
      align: "right",
      nowrap: true,
      render: (row) =>
        row.leads_source === "manual" || row.cac === null || row.cac === undefined
          ? null
          : formatMoney(row.cac),
    },
    {
      key: "filial",
      header: t("growth.bloggers.columns.filial"),
      render: (row) => (row.filial_id ? filialMap[row.filial_id] : t("growth.bloggers.filialGeneral")),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: t("growth.bloggers.columns.actions"),
            align: "right",
            nowrap: true,
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                <IconButton
                  icon={Pencil}
                  aria-label={t("growth.bloggers.editAria")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingPost(row);
                  }}
                />
                <IconButton
                  icon={Trash2}
                  tone="danger"
                  aria-label={t("growth.bloggers.deleteAria")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(row);
                  }}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  const channelTabs = useMemo(
    () => CHANNEL_TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) })),
    [t],
  );

  return (
    <div>
      <Tabs className="mb-4" tabs={channelTabs} value={channel} onChange={setChannel} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">{t("growth.bloggers.postsHeading")}</h2>
        <span className="text-sm text-fg-muted">{t("common.recordsCount", { count: total })}</span>
      </div>

      {statsLoading || !statusStats ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} padding="p-3" className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded-btn" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            compact
            icon={Layers}
            label={t("growth.bloggers.statTotal")}
            value={statusTotal}
            className="min-w-0"
          />
          {STATUS_CARD_ORDER.map((key) => (
            <StatCard
              key={key}
              compact
              icon={STATUS_CARD_ICONS[key]}
              label={t(STATUS_LABELS[key])}
              value={statusMap[key]?.count ?? 0}
              hint={`${Math.round(statusMap[key]?.percent ?? 0)}%`}
              className="min-w-0"
            />
          ))}
        </div>
      )}

      <FilterBar
        onClear={hasFilters ? clearFilters : undefined}
        actions={
          <Button variant="secondary" disabled={exporting} onClick={handleExport}>
            <Download size={16} />
            {exporting ? t("growth.bloggers.exportPreparing") : t("growth.bloggers.exportButton")}
          </Button>
        }
      >
        <Select
          label={t("growth.bloggers.filterStatus")}
          className="w-full max-w-[170px]"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t("growth.bloggers.filterAllStatuses")}</option>
          {STATUS_ORDER.map((key) => (
            <option key={key} value={key}>
              {t(STATUS_LABELS[key])}
            </option>
          ))}
        </Select>
        <Select
          label={t("growth.bloggers.filterPostType")}
          className="w-full max-w-[170px]"
          value={postType}
          onChange={(event) => setPostType(event.target.value)}
        >
          <option value="">{t("growth.bloggers.filterAllTypes")}</option>
          {Object.entries(POST_TYPE_LABELS).map(([key, labelKey]) => (
            <option key={key} value={key}>
              {t(labelKey)}
            </option>
          ))}
        </Select>
        <DateInput
          label={t("growth.bloggers.filterDateFrom")}
          className="w-full max-w-[160px]"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
        />
        <DateInput
          label={t("growth.bloggers.filterDateTo")}
          className="w-full max-w-[160px]"
          min={dateFrom || undefined}
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-secondary">{t("growth.bloggers.searchLabel")}</span>
          <Input
            placeholder={t("growth.bloggers.searchPlaceholder")}
            className="w-56"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </FilterBar>

      <Table
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(row) => row.id}
        onRowClick={canManage ? (row) => setEditingPost(row) : undefined}
        emptyState={
          hasFilters ? (
            <EmptyState
              icon={Megaphone}
              title={t("growth.bloggers.emptyFilterTitle")}
              description={t("growth.bloggers.emptyFilterDescription")}
            />
          ) : (
            <EmptyState
              icon={Megaphone}
              title={t("growth.bloggers.emptyTitle")}
              description={t("growth.bloggers.emptyDescription")}
              actionLabel={canManage ? t("growth.bloggers.emptyAction") : undefined}
              onAction={canManage ? onOpenPostModal : undefined}
            />
          )
        }
      />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <PostFormModal
        open={postModalOpen || Boolean(editingPost)}
        post={editingPost}
        onClose={closePostModal}
        onSaved={refresh}
      />

      <BloggerFormModal
        open={bloggerModalOpen || Boolean(editingBlogger)}
        blogger={editingBlogger}
        onClose={closeBloggerModal}
        onSaved={refresh}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t("growth.bloggers.deleteModal.title")}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("growth.common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("growth.common.deleting") : t("growth.common.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <span className="font-medium text-fg">
            {t("growth.bloggers.deleteModal.target", {
              username: deleteTarget?.blogger?.username,
              date: formatDate(deleteTarget?.planned_date),
            })}
          </span>{" "}
          {t("growth.bloggers.deleteModal.body")}
        </p>
      </Modal>
    </div>
  );
}
