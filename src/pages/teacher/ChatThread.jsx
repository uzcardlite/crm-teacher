import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, ChevronLeft, Send } from "lucide-react";
import {
  listChatMessages,
  listChatThreads,
  markChatRead,
  sendChatMessage,
} from "../../api/teacher";
import IconButton from "../../components/ui/IconButton";
import Skeleton from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatTime } from "../../utils/format";
import { cn } from "../../utils/cn";

const POLL_MS = 10000;
const MAX_BODY = 2000;

// One-to-one teacher <-> parent conversation. This is the single non-canonical
// layout in the cabinet: a full-height flex column (sticky header, scrolling
// message stream, fixed composer) instead of the usual pb-24 page rhythm.
// Realtime is polling-only (10s) and pauses while the tab is hidden.
export default function ChatThread() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { threadId } = useParams();

  const [header, setHeader] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const streamRef = useRef(null);
  const textareaRef = useRef(null);

  // True when the stream is scrolled (almost) to the bottom — only then do we
  // auto-follow new messages, so we never yank a teacher away from history.
  function isNearBottom() {
    const el = streamRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function scrollToBottom() {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // Fetch messages; when new ones arrive, follow them and clear the unread
  // marker. `initial` forces a scroll+read on first open regardless of state.
  const refresh = useCallback(
    async (initial = false) => {
      try {
        const stick = initial || isNearBottom();
        const next = await listChatMessages(threadId);
        setMessages((prev) => {
          const grew = next.length > prev.length;
          if (grew || initial) {
            markChatRead(threadId).catch(() => {});
          }
          return next;
        });
        if (stick) requestAnimationFrame(scrollToBottom);
      } catch (error) {
        if (initial) {
          toast.error(getErrorMessage(error, t("teacher.chat.messagesError")));
        }
      } finally {
        if (initial) setLoading(false);
      }
    },
    [threadId, t],
  );

  // Header (student/parent names) comes from the denormalized thread list —
  // there is no single-thread endpoint, and the list is the canonical source.
  useEffect(() => {
    listChatThreads()
      .then((threads) => setHeader(threads.find((item) => item.id === threadId) || null))
      .catch(() => {});
  }, [threadId]);

  useEffect(() => {
    setLoading(true);
    refresh(true);
  }, [threadId, refresh]);

  // Poll only while the tab is visible; refetch immediately on re-focus.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  function handleDraftChange(event) {
    setDraft(event.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await sendChatMessage(threadId, body);
      setMessages((prev) => [...prev, message]);
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      requestAnimationFrame(scrollToBottom);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.chat.sendError")));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-lg flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("/teacher/chat")}
          aria-label={t("teacher.chat.back")}
          className="flex items-center text-sm text-fg-secondary transition-colors hover:text-fg"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">
            {header?.student_full_name || ""}
          </p>
          {header?.parent_name && (
            <p className="truncate text-xs text-fg-muted">{header.parent_name}</p>
          )}
        </div>
      </div>

      <div ref={streamRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}>
              <Skeleton className={cn("h-10 rounded-card", index % 2 === 0 ? "w-40" : "w-32")} />
            </div>
          ))
        ) : (
          messages.map((message) => {
            const isTeacher = message.sender_type === "teacher";
            return (
              <div key={message.id} className={cn("flex", isTeacher ? "justify-end" : "justify-start")}>
                <div className="max-w-[80%]">
                  <div
                    className={cn(
                      "rounded-card px-3 py-2 text-sm",
                      isTeacher
                        ? "bg-accent-light text-accent-dark"
                        : "border border-line bg-surface text-fg",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1 text-[11px] text-fg-faint",
                      isTeacher ? "justify-end" : "justify-start",
                    )}
                  >
                    <span>{formatTime(message.created_at)}</span>
                    {isTeacher &&
                      (message.read_at ? <CheckCheck size={12} /> : <Check size={12} />)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-line bg-surface px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={handleDraftChange}
            maxLength={MAX_BODY}
            placeholder={t("teacher.chat.inputPlaceholder")}
            className="max-h-32 flex-1 resize-none"
          />
          <IconButton
            icon={Send}
            aria-label={t("teacher.chat.send")}
            onClick={handleSend}
            disabled={draft.trim() === "" || sending}
            className="bg-accent text-accent-dark hover:bg-accent-light"
          />
        </div>
      </div>
    </div>
  );
}
