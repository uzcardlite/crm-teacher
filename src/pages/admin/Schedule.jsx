import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Clock, DoorOpen, Plus, User, UsersRound } from "lucide-react";
import { listFilials } from "../../api/filials";
import { listGroups } from "../../api/groups";
import { createRoom, listRooms } from "../../api/rooms";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Tabs from "../../components/ui/Tabs";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const ODD_DAYS = ["mon", "wed", "fri"];
const EVEN_DAYS = ["tue", "thu", "sat"];

const TIME_START_MINUTES = 8 * 60;
const TIME_END_MINUTES = 21 * 60;
const SLOT_MINUTES = 30;
const SLOT_WIDTH_PX = 60;
const HOURS = Array.from(
  { length: (TIME_END_MINUTES - TIME_START_MINUTES) / 60 + 1 },
  (_, i) => 8 + i,
);
const ROOM_COL_WIDTH = 140;
const ROW_HEIGHT = 64;

// Tailwind class'lar to'liq literal ko'rinishda yozilishi shart (content scanning uchun).
const PALETTE = [
  { bg: "bg-scheduleBlock-teal-bg", border: "border-scheduleBlock-teal-border", text: "text-scheduleBlock-teal-text" },
  { bg: "bg-scheduleBlock-blue-bg", border: "border-scheduleBlock-blue-border", text: "text-scheduleBlock-blue-text" },
  { bg: "bg-scheduleBlock-violet-bg", border: "border-scheduleBlock-violet-border", text: "text-scheduleBlock-violet-text" },
  { bg: "bg-scheduleBlock-rose-bg", border: "border-scheduleBlock-rose-border", text: "text-scheduleBlock-rose-text" },
  { bg: "bg-scheduleBlock-amber-bg", border: "border-scheduleBlock-amber-border", text: "text-scheduleBlock-amber-text" },
  { bg: "bg-scheduleBlock-green-bg", border: "border-scheduleBlock-green-border", text: "text-scheduleBlock-green-text" },
  { bg: "bg-scheduleBlock-pink-bg", border: "border-scheduleBlock-pink-border", text: "text-scheduleBlock-pink-text" },
];

function colorForGroup(groupId) {
  let sum = 0;
  for (let i = 0; i < groupId.length; i += 1) sum += groupId.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}

function parseTimeToMinutes(time) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatSchedule(schedule, t, dayLabels) {
  if (!schedule || !Array.isArray(schedule.days) || schedule.days.length === 0) {
    return t("pages.schedule.noSchedule");
  }
  const days = schedule.days.map((d) => dayLabels[d] || d).join(", ");
  return schedule.time ? `${days} • ${schedule.time}` : days;
}

function groupMatchesTab(group, tabDays) {
  if (tabDays === null) return true;
  const days = group.schedule?.days;
  if (!Array.isArray(days)) return false;
  return days.some((d) => tabDays.includes(d));
}

// `embedded` renders the board only — no page padding and no <h1> — so the
// dashboard can drop it inside its own card grid without doubling either.
export default function Schedule({ embedded = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const DAY_LABELS = {
    mon: t("pages.schedule.days.mon"),
    tue: t("pages.schedule.days.tue"),
    wed: t("pages.schedule.days.wed"),
    thu: t("pages.schedule.days.thu"),
    fri: t("pages.schedule.days.fri"),
    sat: t("pages.schedule.days.sat"),
    sun: t("pages.schedule.days.sun"),
  };

  const DAY_TABS = [
    { key: "odd", label: t("pages.schedule.tabs.odd"), days: ODD_DAYS },
    { key: "even", label: t("pages.schedule.tabs.even"), days: EVEN_DAYS },
    { key: "all", label: t("pages.schedule.tabs.all"), days: null },
  ];

  const [filials, setFilials] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState("");

  // Day tab lives in the URL so a shared/reloaded link keeps the same view.
  const dayParam = searchParams.get("day");
  const dayTab = DAY_TABS.some((tab) => tab.key === dayParam) ? dayParam : "odd";

  function setDayTab(key) {
    const next = new URLSearchParams(searchParams);
    next.set("day", key);
    setSearchParams(next, { replace: true });
  }

  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeGroup, setActiveGroup] = useState(null);

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomSubmitting, setRoomSubmitting] = useState(false);

  useEffect(() => {
    listFilials()
      .then((data) => {
        setFilials(data);
        if (data.length > 0) setSelectedFilial(data[0].id);
        else setLoading(false);
      })
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("pages.schedule.filialsError")));
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedFilial) return;
    loadData(selectedFilial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilial]);

  async function loadData(filialId) {
    setLoading(true);
    try {
      const [roomsData, groupsData] = await Promise.all([
        listRooms({ filial_id: filialId }),
        listGroups({ filial_id: filialId, size: 100 }),
      ]);
      setRooms(roomsData);
      setGroups(groupsData.items);
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.schedule.dataError")));
      }
    } finally {
      setLoading(false);
    }
  }

  const activeTabDays = DAY_TABS.find((tab) => tab.key === dayTab)?.days ?? null;

  const visibleGroups = useMemo(
    () => groups.filter((g) => groupMatchesTab(g, activeTabDays)),
    [groups, activeTabDays],
  );

  const groupsByRoom = useMemo(() => {
    const map = {};
    for (const group of visibleGroups) {
      if (!group.room_id) continue;
      const startMinutes = parseTimeToMinutes(group.schedule?.time);
      if (startMinutes === null) continue;
      if (!map[group.room_id]) map[group.room_id] = [];
      map[group.room_id].push({ group, startMinutes });
    }
    return map;
  }, [visibleGroups]);

  const roomlessGroups = useMemo(
    () => visibleGroups.filter((g) => !g.room_id),
    [visibleGroups],
  );

  function openRoomModal() {
    setRoomName("");
    setRoomModalOpen(true);
  }

  function closeRoomModal() {
    if (roomSubmitting) return;
    setRoomModalOpen(false);
  }

  async function handleCreateRoom(event) {
    event.preventDefault();
    if (!roomName.trim() || !selectedFilial) return;
    setRoomSubmitting(true);
    try {
      await createRoom({ name: roomName.trim(), filial_id: selectedFilial });
      toast.success(t("pages.schedule.roomAdded"));
      setRoomModalOpen(false);
      await loadData(selectedFilial);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.schedule.roomAddError")));
    } finally {
      setRoomSubmitting(false);
    }
  }

  const totalHourColumns = HOURS.length - 1;
  const rowContentWidth = totalHourColumns * SLOT_WIDTH_PX * 2;

  return (
    <div className={embedded ? undefined : "p-6"}>
      {embedded ? (
        selectedFilial && (
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={openRoomModal}>
              <Plus size={16} />
              {t("pages.schedule.addRoom")}
            </Button>
          </div>
        )
      ) : (
        <PageHeader title={t("nav.schedule")}>
          {selectedFilial && (
            <Button size="sm" onClick={openRoomModal}>
              <Plus size={16} />
              {t("pages.schedule.addRoom")}
            </Button>
          )}
        </PageHeader>
      )}

      <Tabs
        className="mb-4 w-fit"
        tabs={DAY_TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
        value={dayTab}
        onChange={setDayTab}
      />

      {filials.length > 0 && (
        <FilterBar>
          <Select
            label={t("nav.filials")}
            className="w-full max-w-[220px]"
            value={selectedFilial}
            onChange={(event) => setSelectedFilial(event.target.value)}
          >
            {filials.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.name}
              </option>
            ))}
          </Select>
        </FilterBar>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : filials.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("pages.schedule.noFilialsTitle")}
          description={t("pages.schedule.noFilialsDescription")}
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title={t("pages.schedule.noRoomsTitle")}
          description={t("pages.schedule.noRoomsDescription")}
          actionLabel={t("pages.schedule.addRoom")}
          onAction={openRoomModal}
        />
      ) : (
        <div className="relative">
          {/* The board scrolls sideways; the fade tells the user there is more. */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-30 w-8 rounded-r-card bg-gradient-to-l from-white to-transparent"
            aria-hidden="true"
          />
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <div style={{ width: ROOM_COL_WIDTH + rowContentWidth }}>
            <div className="flex border-b border-line">
              <div
                className="sticky left-0 z-20 flex-shrink-0 border-r border-line bg-surface"
                style={{ width: ROOM_COL_WIDTH }}
              />
              {HOURS.slice(0, -1).map((hour) => (
                <div
                  key={hour}
                  className="flex-shrink-0 border-r border-line px-2 py-2 text-xs font-medium text-fg-muted"
                  style={{ width: SLOT_WIDTH_PX * 2 }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {rooms.map((room) => (
              <div key={room.id} className="flex border-b border-line last:border-b-0">
                <div
                  className="sticky left-0 z-10 flex flex-shrink-0 items-center border-r border-line bg-surface px-3 text-sm font-medium text-fg-secondary"
                  style={{ width: ROOM_COL_WIDTH, height: ROW_HEIGHT }}
                >
                  <span className="truncate">{room.name}</span>
                </div>
                <div className="relative flex-shrink-0" style={{ width: rowContentWidth, height: ROW_HEIGHT }}>
                  {(groupsByRoom[room.id] || []).map(({ group, startMinutes }) => {
                    const left = ((startMinutes - TIME_START_MINUTES) / SLOT_MINUTES) * SLOT_WIDTH_PX;
                    const width = (group.duration_minutes / SLOT_MINUTES) * SLOT_WIDTH_PX;
                    const color = colorForGroup(group.id);
                    const wide = width >= SLOT_WIDTH_PX * 2;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveGroup(group)}
                        title={`${group.name} — ${group.teacher_name || t("pages.schedule.noTeacherAssigned")}`}
                        className={cn(
                          "absolute top-1 flex flex-col justify-center overflow-hidden rounded-btn border px-2 py-1 text-left transition-shadow hover:shadow-card-hover",
                          color.bg,
                          color.border,
                        )}
                        style={{ left, width: Math.max(width - 4, 20), height: ROW_HEIGHT - 8 }}
                      >
                        <span className={cn("truncate text-xs font-semibold", color.text)}>
                          {group.name}
                        </span>
                        {wide && (
                          <span className={cn("truncate text-[10px] opacity-80", color.text)}>
                            {group.teacher_name || "—"} •{" "}
                            {t("pages.schedule.studentsCount", { count: group.current_students_count })}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {!loading && roomlessGroups.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-fg">{t("pages.schedule.roomlessGroups")}</h2>
          <div className="flex flex-col gap-2">
            {roomlessGroups.map((group) => (
              <div
                key={group.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-accent-light/50 bg-accent-light/10 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-fg">{group.name}</p>
                  <p className="text-xs text-fg-muted">
                    {group.teacher_name || t("pages.schedule.noTeacherAssigned")} •{" "}
                    {formatSchedule(group.schedule, t, DAY_LABELS)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate("/app/groups")}>
                  {t("pages.schedule.goToGroup")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(activeGroup)}
        onClose={() => setActiveGroup(null)}
        title={activeGroup?.name || ""}
        footer={
          <Button
            onClick={() => {
              setActiveGroup(null);
              navigate("/app/groups");
            }}
          >
            {t("pages.schedule.goToGroup")}
          </Button>
        }
      >
        {activeGroup && (
          <div className="flex flex-col gap-3 text-sm text-fg-secondary">
            <div className="flex items-center gap-2">
              <User size={16} className="flex-shrink-0 text-fg-faint" />
              {activeGroup.teacher_name || t("pages.schedule.noTeacherAssigned")}
            </div>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="flex-shrink-0 text-fg-faint" />
              {activeGroup.room_name || t("pages.schedule.noRoomAssigned")}
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="flex-shrink-0 text-fg-faint" />
              {formatSchedule(activeGroup.schedule, t, DAY_LABELS)}{" "}
              ({t("pages.schedule.minutes", { count: activeGroup.duration_minutes })})
            </div>
            <div className="flex items-center gap-2">
              <UsersRound size={16} className="flex-shrink-0 text-fg-faint" />
              {t("pages.schedule.studentsCount", {
                count: activeGroup.current_students_count,
              })}
              {activeGroup.capacity != null ? ` / ${activeGroup.capacity}` : ""}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={roomModalOpen}
        onClose={closeRoomModal}
        title={t("pages.schedule.newRoomTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeRoomModal} disabled={roomSubmitting}>
              {t("pages.schedule.cancel")}
            </Button>
            <Button type="submit" form="room-form" disabled={roomSubmitting}>
              {roomSubmitting ? t("pages.schedule.saving") : t("pages.schedule.save")}
            </Button>
          </>
        }
      >
        <form id="room-form" onSubmit={handleCreateRoom} className="flex flex-col gap-4" noValidate>
          <Input
            label={t("pages.schedule.roomName")}
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            autoFocus
          />
        </form>
      </Modal>
    </div>
  );
}
