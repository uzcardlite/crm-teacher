import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { getMarketingPost, getMarketingTimeline } from "../../api/marketing";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import IconButton from "../ui/IconButton";
import Skeleton from "../ui/Skeleton";
import { toast } from "../ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { cn } from "../../utils/cn";
import { currentMonthValue, formatDate, formatMonth, todayValue } from "../../constants/moliya";
import {
  STATUS_LABELS,
  TIMELINE_BLOCK,
  TIMELINE_BLOCK_FALLBACK,
  WEEKDAY_SHORT_KEYS,
} from "../../constants/marketing";
import PostFormModal from "./PostFormModal";

const MAX_BLOCKS_PER_DAY = 3;

function toDateValue(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Monday-first grid covering the whole month plus the leading/trailing days.
function buildMonthCells(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;

  const cells = [];
  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `lead-${index}`, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: toDateValue(year, month, day),
      date: toDateValue(year, month, day),
      day,
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, inMonth: false });
  }
  return cells;
}

function shiftMonth(monthValue, delta) {
  const [year, month] = monthValue.split("-").map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function PostBlock({ post, canManage, onOpen }) {
  const { t } = useTranslation();
  const block = TIMELINE_BLOCK[post.status] || TIMELINE_BLOCK_FALLBACK;
  const title = t("growth.calendar.postBlockTitle", {
    username: post.blogger_username,
    status: STATUS_LABELS[post.status] ? t(STATUS_LABELS[post.status]) : post.status,
  });
  const className = cn(
    "w-full truncate rounded-btn border px-2 py-1 text-left text-xs",
    block.bg,
    block.border,
    block.text,
  );

  if (!canManage) {
    return (
      <div className={className} title={title}>
        @{post.blogger_username}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(post)} title={title} className={className}>
      @{post.blogger_username}
    </button>
  );
}

export default function CalendarTab({
  canManage,
  postModalOpen,
  onOpenPostModal,
  onClosePostModal,
  onDataChanged,
}) {
  const { t } = useTranslation();
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarketingTimeline(monthValue);
      setDays(data.items || []);
    } catch (error) {
      setDays([]);
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("growth.calendar.toastLoadError")));
      }
    } finally {
      setLoading(false);
    }
  }, [monthValue, t]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  // The page-level "Post qo'shish" button always opens an empty create form.
  useEffect(() => {
    if (postModalOpen) setEditingPost(null);
  }, [postModalOpen]);

  const postsByDate = useMemo(
    () => Object.fromEntries(days.map((item) => [String(item.date).slice(0, 10), item.posts || []])),
    [days],
  );

  const cells = useMemo(() => buildMonthCells(monthValue), [monthValue]);
  const today = todayValue();
  const hasPosts = days.some((item) => (item.posts || []).length > 0);

  // The timeline payload is trimmed, so the full post is fetched before editing.
  async function openPost(post) {
    try {
      setEditingPost(await getMarketingPost(post.id));
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.calendar.toastOpenError")));
    }
  }

  function closePostModal() {
    setEditingPost(null);
    onClosePostModal();
  }

  async function refresh() {
    await loadTimeline();
    await onDataChanged?.();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconButton
            icon={ChevronLeft}
            aria-label={t("growth.calendar.prevMonth")}
            onClick={() => setMonthValue((prev) => shiftMonth(prev, -1))}
          />
          <span className="min-w-[140px] text-center text-sm font-semibold text-fg">
            {formatMonth(monthValue)}
          </span>
          <IconButton
            icon={ChevronRight}
            aria-label={t("growth.calendar.nextMonth")}
            onClick={() => setMonthValue((prev) => shiftMonth(prev, 1))}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setMonthValue(currentMonthValue())}>
          {t("growth.calendar.today")}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-[420px] w-full rounded-card" />
      ) : !hasPosts ? (
        <EmptyState
          icon={CalendarDays}
          title={t("growth.calendar.emptyTitle")}
          description={t("growth.calendar.emptyDescription")}
          actionLabel={canManage ? t("growth.calendar.addPost") : undefined}
          onAction={canManage ? onOpenPostModal : undefined}
        />
      ) : (
        <>
          <div className="hidden grid-cols-7 gap-2 sm:grid">
            {WEEKDAY_SHORT_KEYS.map((dayKey) => (
              <span key={dayKey} className="px-1 pb-1 text-xs font-medium text-fg-muted">
                {t(dayKey)}
              </span>
            ))}
          </div>

          <div className="hidden grid-cols-7 gap-2 sm:grid">
            {cells.map((cell) => {
              const posts = cell.inMonth ? postsByDate[cell.date] || [] : [];
              const extra = posts.length - MAX_BLOCKS_PER_DAY;
              return (
                <div
                  key={cell.key}
                  className={cn(
                    "min-h-[96px] rounded-card border bg-surface p-2",
                    cell.date === today ? "border-accent" : "border-line",
                    !cell.inMonth && "bg-surface-sunken",
                  )}
                >
                  {cell.inMonth && (
                    <>
                      <span className="text-xs font-medium text-fg-secondary">{cell.day}</span>
                      <div className="mt-1 flex flex-col gap-1">
                        {posts.slice(0, MAX_BLOCKS_PER_DAY).map((post) => (
                          <PostBlock
                            key={post.id}
                            post={post}
                            canManage={canManage}
                            onOpen={openPost}
                          />
                        ))}
                        {extra > 0 && (
                          <span className="text-xs text-fg-faint">
                            {t("growth.calendar.extraCount", { count: extra })}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {days
              .filter((item) => (item.posts || []).length > 0)
              .map((item) => (
                <div key={item.date} className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-fg-muted">{formatDate(item.date)}</p>
                  {item.posts.map((post) => (
                    <PostBlock
                      key={post.id}
                      post={post}
                      canManage={canManage}
                      onOpen={openPost}
                    />
                  ))}
                </div>
              ))}
          </div>
        </>
      )}

      <PostFormModal
        open={postModalOpen || Boolean(editingPost)}
        post={editingPost}
        onClose={closePostModal}
        onSaved={refresh}
      />
    </div>
  );
}
