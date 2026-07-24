import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Phone, Search, Users } from "lucide-react";
import { listLeads, updateLeadAssignee, updateLeadNote, updateLeadStage } from "../../api/leads";
import { listSuperAdmins } from "../../api/users";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const LEAD_STAGE_KEYS = ["yangi", "sinov_taklif", "keldi", "royxatdan_otdi", "yopildi"];

const DRAG_ACTIVATION_CONSTRAINT = { distance: 8 };

function LeadCard({ lead, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(lead)}
      className={cn(
        "cursor-grab rounded-card border border-line bg-surface p-3 shadow-sm transition-shadow hover:shadow-card active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{lead.full_name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-muted">
            <Phone size={12} />
            {lead.phone}
          </p>
          {lead.markaz_nomi && (
            <p className="mt-1 truncate text-xs text-fg-muted">{lead.markaz_nomi}</p>
          )}
        </div>
        {lead.assigned_user_name && <Avatar name={lead.assigned_user_name} />}
      </div>
    </div>
  );
}

function KanbanColumn({ stage, leads, onOpenLead }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-card border border-line bg-surface/60 p-3",
        isOver && "ring-2 ring-accent/50",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-fg">{stage.label}</h2>
        <Badge variant="neutral">{leads.length}</Badge>
      </div>
      <div className="flex min-h-[80px] flex-col gap-2">
        {leads.length === 0 ? (
          <p className="px-1 py-2 text-xs text-fg-faint">{t("pages.leadsPipeline.noLeadsInStage")}</p>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} onOpen={onOpenLead} />)
        )}
      </div>
    </div>
  );
}

export default function LeadsPipeline() {
  const { t } = useTranslation();
  const LEAD_STAGES = LEAD_STAGE_KEYS.map((key) => ({
    key,
    label: t(`pages.leadsPipeline.stages.${key}`),
  }));
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [superAdmins, setSuperAdmins] = useState([]);
  const [activeLead, setActiveLead] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [assigneeDraft, setAssigneeDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: DRAG_ACTIVATION_CONSTRAINT }),
  );

  async function loadLeads() {
    setLoading(true);
    try {
      const data = await listLeads();
      setLeads(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.leadsPipeline.listError")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
    listSuperAdmins()
      .then(setSuperAdmins)
      .catch(() => setSuperAdmins([]));
  }, []);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter(
      (lead) =>
        lead.full_name.toLowerCase().includes(query) || lead.phone.toLowerCase().includes(query),
    );
  }, [leads, search]);

  const leadsByStage = useMemo(() => {
    const grouped = Object.fromEntries(LEAD_STAGES.map((stage) => [stage.key, []]));
    for (const lead of filteredLeads) {
      grouped[lead.stage]?.push(lead);
    }
    return grouped;
  }, [filteredLeads]);

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id;
    const newStage = over.id;
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.stage === newStage) return;

    const previousLeads = leads;
    setLeads((prev) =>
      prev.map((item) => (item.id === leadId ? { ...item, stage: newStage } : item)),
    );

    try {
      await updateLeadStage(leadId, newStage);
      toast.success(t("pages.leadsPipeline.stageUpdated"));
    } catch (error) {
      setLeads(previousLeads);
      toast.error(getErrorMessage(error, t("pages.leadsPipeline.stageError")));
    }
  }

  function openLead(lead) {
    setActiveLead(lead);
    setNoteDraft(lead.note || "");
    setAssigneeDraft(lead.assigned_user_id || "");
  }

  function closeModal() {
    if (saving) return;
    setActiveLead(null);
  }

  async function handleSaveDetails() {
    if (!activeLead) return;
    setSaving(true);
    try {
      const tasks = [];
      if (noteDraft !== (activeLead.note || "")) {
        tasks.push(updateLeadNote(activeLead.id, noteDraft || null));
      }
      const nextAssigneeId = assigneeDraft || null;
      if (nextAssigneeId !== (activeLead.assigned_user_id || null)) {
        tasks.push(updateLeadAssignee(activeLead.id, nextAssigneeId));
      }

      if (tasks.length === 0) {
        setActiveLead(null);
        return;
      }

      const results = await Promise.all(tasks);
      const updatedLead = results[results.length - 1];
      setLeads((prev) =>
        prev.map((item) => (item.id === updatedLead.id ? updatedLead : item)),
      );
      toast.success(t("pages.leadsPipeline.saveSuccess"));
      setActiveLead(null);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.leadsPipeline.saveError")));
    } finally {
      setSaving(false);
    }
  }

  const hasLeads = leads.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <PageHeader title={t("pages.leadsPipeline.title")} />

      <FilterBar onClear={search ? () => setSearch("") : undefined}>
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          <label htmlFor="superadmin-lead-search" className="text-sm font-medium text-fg-secondary">
            {t("pages.leadsPipeline.search")}
          </label>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
            />
            <Input
              id="superadmin-lead-search"
              className="w-full pl-9"
              placeholder={t("pages.leadsPipeline.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </FilterBar>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STAGES.map((stage) => (
            <div key={stage.key} className="flex w-72 shrink-0 flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : !hasLeads ? (
        <EmptyState
          icon={Users}
          title={t("pages.leadsPipeline.emptyTitle")}
          description={t("pages.leadsPipeline.emptyDescription")}
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
            {LEAD_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={leadsByStage[stage.key] || []}
                onOpenLead={openLead}
              />
            ))}
          </div>
        </DndContext>
      )}

      <Modal
        open={Boolean(activeLead)}
        onClose={closeModal}
        title={activeLead?.full_name || ""}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              {t("pages.leadsPipeline.cancel")}
            </Button>
            <Button onClick={handleSaveDetails} disabled={saving}>
              {saving ? t("pages.leadsPipeline.saving") : t("pages.leadsPipeline.save")}
            </Button>
          </>
        }
      >
        {activeLead && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-fg-muted">
              <p className="flex items-center gap-1">
                <Phone size={14} />
                {activeLead.phone}
              </p>
              {activeLead.markaz_nomi && <p className="mt-1">{activeLead.markaz_nomi}</p>}
            </div>

            <Select
              label={t("pages.leadsPipeline.assignTo")}
              value={assigneeDraft}
              onChange={(event) => setAssigneeDraft(event.target.value)}
            >
              <option value="">{t("pages.leadsPipeline.unassigned")}</option>
              {superAdmins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name}
                </option>
              ))}
            </Select>

            <Textarea
              id="lead-note"
              label={t("pages.leadsPipeline.note")}
              rows={4}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
