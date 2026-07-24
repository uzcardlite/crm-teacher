import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Phone, Search, UserCheck, Users } from "lucide-react";
import {
  convertStudentLead,
  createStudentLead,
  listStudentLeads,
  updateStudentLeadAssignee,
  updateStudentLeadNote,
  updateStudentLeadStage,
} from "../../api/studentLeads";
import { listFilials } from "../../api/filials";
import { listUsers } from "../../api/users";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import FilterBar from "../ui/FilterBar";
import Input from "../ui/Input";
import DateInput from "../ui/DateInput";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import Textarea from "../ui/Textarea";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

// Kanban stage labels for the API status codes. Codes mirror the backend
// enum and stay literal; only the display label is translated (resolved with
// `t()` inside the component, since this is a plain module-level array).
const LEAD_STAGES = [
  { key: "yangi", labelKey: "growth.leads.stages.yangi" },
  { key: "sinov_taklif", labelKey: "growth.leads.stages.sinovTaklif" },
  { key: "sinovga_keldi", labelKey: "growth.leads.stages.sinovgaKeldi" },
  { key: "royxatdan_otdi", labelKey: "growth.leads.stages.royxatdanOtdi" },
  { key: "yopildi", labelKey: "growth.leads.stages.yopildi" },
];

const DRAG_ACTIVATION_CONSTRAINT = { distance: 8 };

const EMPTY_CREATE_FORM = { full_name: "", phone: "", source: "" };

const EMPTY_CONVERT_FORM = { filial_id: "", birth_date: "", parent_name: "" };

function LeadCard({ lead, onOpen, onConvert }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });
  const isConverted = Boolean(lead.converted_student_id);

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
        isConverted && "border-success/40 bg-success-bg/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{lead.full_name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-muted">
            <Phone size={12} />
            {lead.phone}
          </p>
          {lead.source && <p className="mt-1 truncate text-xs text-fg-muted">{lead.source}</p>}
        </div>
        {lead.assigned_user_name && <Avatar name={lead.assigned_user_name} size="sm" />}
      </div>

      {isConverted ? (
        <Badge variant="success" className="mt-2 w-fit">
          {t("growth.leads.convertedBadge")}
        </Badge>
      ) : (
        onConvert && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onConvert(lead);
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-btn border border-accent-light bg-accent-light/20 px-2 py-1.5 text-xs font-medium text-accent-dark transition-colors hover:bg-accent-light/40"
          >
            <UserCheck size={13} />
            {t("growth.leads.convertAction")}
          </button>
        )
      )}
    </div>
  );
}

function KanbanColumn({ stage, leads, onOpenLead, onConvert }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-card border border-line bg-surface-sunken/60 p-3",
        isOver && "ring-2 ring-accent/50",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-fg">{t(stage.labelKey)}</h2>
        <Badge variant="neutral">{leads.length}</Badge>
      </div>
      <div className="flex min-h-[80px] flex-col gap-2">
        {leads.length === 0 ? (
          <p className="px-1 py-2 text-xs text-fg-faint">{t("growth.leads.noLeadsInStage")}</p>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onOpen={onOpenLead} onConvert={onConvert} />
          ))
        )}
      </div>
    </div>
  );
}

// Kanban board for student leads — used as the "Lidlar" tab of the Students
// page. The create-lead modal is controlled from the parent so its trigger
// button can live in the page's shared PageHeader.
export default function StudentLeadsBoard({ modalOpen, onOpenModal, onCloseModal }) {
  const { t } = useTranslation();
  // Marketing links here with ?tab=leads&post_id=<id> to show only that post's leads.
  const [searchParams, setSearchParams] = useSearchParams();
  const postIdFilter = searchParams.get("post_id");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState([]);
  const [filials, setFilials] = useState([]);
  const [activeLead, setActiveLead] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [assigneeDraft, setAssigneeDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const [convertTarget, setConvertTarget] = useState(null);
  const [convertForm, setConvertForm] = useState(EMPTY_CONVERT_FORM);
  const [convertErrors, setConvertErrors] = useState({});
  const [converting, setConverting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: DRAG_ACTIVATION_CONSTRAINT }),
  );

  async function loadLeads() {
    setLoading(true);
    try {
      const data = await listStudentLeads();
      setLeads(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.leads.toastLoadError")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
    listUsers()
      .then(setStaff)
      .catch(() => setStaff([]));
    listFilials()
      .then(setFilials)
      .catch(() => setFilials([]));
  }, []);

  useEffect(() => {
    if (modalOpen) {
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateErrors({});
    }
  }, [modalOpen]);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = leads;
    if (postIdFilter) {
      result = result.filter((lead) => lead.marketing_post_id === postIdFilter);
    }
    if (!query) return result;
    return result.filter(
      (lead) =>
        lead.full_name.toLowerCase().includes(query) || lead.phone.toLowerCase().includes(query),
    );
  }, [leads, search, postIdFilter]);

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
      await updateStudentLeadStage(leadId, newStage);
      toast.success(t("growth.leads.toastStageUpdated"));
    } catch (error) {
      setLeads(previousLeads);
      toast.error(getErrorMessage(error, t("growth.leads.toastStageError")));
    }
  }

  function openLead(lead) {
    setActiveLead(lead);
    setNoteDraft(lead.note || "");
    setAssigneeDraft(lead.assigned_user_id || "");
  }

  function closeLeadModal() {
    if (saving) return;
    setActiveLead(null);
  }

  async function handleSaveDetails() {
    if (!activeLead) return;
    setSaving(true);
    try {
      const tasks = [];
      if (noteDraft !== (activeLead.note || "")) {
        tasks.push(updateStudentLeadNote(activeLead.id, noteDraft || null));
      }
      const nextAssigneeId = assigneeDraft || null;
      if (nextAssigneeId !== (activeLead.assigned_user_id || null)) {
        tasks.push(updateStudentLeadAssignee(activeLead.id, nextAssigneeId));
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
      toast.success(t("growth.leads.toastSaved"));
      setActiveLead(null);
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.leads.toastSaveError")));
    } finally {
      setSaving(false);
    }
  }

  function closeCreateModal() {
    if (creating) return;
    onCloseModal();
  }

  function handleCreateChange(field) {
    return (event) => setCreateForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!createForm.full_name.trim()) nextErrors.full_name = t("growth.leads.errors.fullNameRequired");
    if (!createForm.phone.trim()) nextErrors.phone = t("growth.leads.errors.phoneRequired");
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setCreating(true);
    try {
      await createStudentLead({
        full_name: createForm.full_name.trim(),
        phone: createForm.phone.trim(),
        source: createForm.source.trim() || null,
      });
      toast.success(t("growth.leads.toastCreateSuccess"));
      onCloseModal();
      await loadLeads();
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.leads.toastCreateError")));
    } finally {
      setCreating(false);
    }
  }

  function openConvertModal(lead) {
    setActiveLead(null);
    setConvertTarget(lead);
    setConvertForm(EMPTY_CONVERT_FORM);
    setConvertErrors({});
  }

  function closeConvertModal() {
    if (converting) return;
    setConvertTarget(null);
  }

  function handleConvertChange(field) {
    return (event) => setConvertForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleConvertSubmit(event) {
    event.preventDefault();
    if (!convertTarget) return;

    const nextErrors = {};
    if (!convertForm.filial_id) nextErrors.filial_id = t("growth.leads.errors.filialRequired");
    setConvertErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setConverting(true);
    try {
      const student = await convertStudentLead(convertTarget.id, {
        filial_id: convertForm.filial_id,
        birth_date: convertForm.birth_date || null,
        parent_name: convertForm.parent_name.trim() || null,
      });
      setLeads((prev) =>
        prev.map((item) =>
          item.id === convertTarget.id
            ? { ...item, stage: "royxatdan_otdi", converted_student_id: student.id }
            : item,
        ),
      );
      toast.success(t("growth.leads.toastConvertSuccess", { name: student.full_name }));
      setConvertTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.leads.toastConvertError")));
    } finally {
      setConverting(false);
    }
  }

  const hasLeads = leads.length > 0;

  // Fills the layout's flex chain instead of guessing the header height with
  // a viewport calculation.
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FilterBar onClear={search ? () => setSearch("") : undefined}>
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          <label htmlFor="lead-search" className="text-sm font-medium text-fg-secondary">
            {t("growth.leads.searchLabel")}
          </label>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
            />
            <Input
              id="lead-search"
              className="w-full pl-9"
              placeholder={t("growth.leads.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </FilterBar>

      {postIdFilter && !loading && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3">
          <span className="text-sm text-fg-muted">
            {t("growth.leads.postFilterLabel", { count: filteredLeads.length })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("post_id");
              setSearchParams(next, { replace: true });
            }}
          >
            {t("growth.leads.clearFilter")}
          </Button>
        </div>
      )}

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
          title={t("growth.leads.emptyTitle")}
          description={t("growth.leads.emptyDescription")}
          actionLabel={t("growth.leads.newLead")}
          onAction={onOpenModal}
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
                onConvert={openConvertModal}
              />
            ))}
          </div>
        </DndContext>
      )}

      <Modal
        open={Boolean(activeLead)}
        onClose={closeLeadModal}
        title={activeLead?.full_name || ""}
        footer={
          <>
            <Button variant="secondary" onClick={closeLeadModal} disabled={saving}>
              {t("growth.common.cancel")}
            </Button>
            <Button onClick={handleSaveDetails} disabled={saving}>
              {saving ? t("growth.common.saving") : t("growth.common.save")}
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
              {activeLead.source && <p className="mt-1">{activeLead.source}</p>}
            </div>

            <Select
              label={t("growth.leads.assignLabel")}
              value={assigneeDraft}
              onChange={(event) => setAssigneeDraft(event.target.value)}
            >
              <option value="">{t("growth.leads.unassigned")}</option>
              {staff.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </Select>

            <Textarea
              id="student-lead-note"
              label={t("growth.leads.noteLabel")}
              rows={4}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
            />

            {activeLead.converted_student_id ? (
              <Badge variant="success" className="w-fit">
                {t("growth.leads.convertedBadge")}
              </Badge>
            ) : (
              <Button variant="secondary" onClick={() => openConvertModal(activeLead)}>
                <UserCheck size={16} />
                {t("growth.leads.convertAction")}
              </Button>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={closeCreateModal}
        title={t("growth.leads.createModalTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeCreateModal} disabled={creating}>
              {t("growth.common.cancel")}
            </Button>
            <Button type="submit" form="student-lead-form" disabled={creating}>
              {creating ? t("growth.common.adding") : t("growth.common.add")}
            </Button>
          </>
        }
      >
        <form
          id="student-lead-form"
          onSubmit={handleCreateSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label={t("growth.leads.fields.fullName")}
            name="full_name"
            value={createForm.full_name}
            onChange={handleCreateChange("full_name")}
            error={createErrors.full_name}
          />
          <Input
            label={t("growth.leads.fields.phone")}
            name="phone"
            type="tel"
            placeholder="+998901234567"
            value={createForm.phone}
            onChange={handleCreateChange("phone")}
            error={createErrors.phone}
          />
          <Input
            label={t("growth.leads.fields.source")}
            name="source"
            placeholder={t("growth.leads.fields.sourcePlaceholder")}
            value={createForm.source}
            onChange={handleCreateChange("source")}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(convertTarget)}
        onClose={closeConvertModal}
        title={t("growth.leads.convertModalTitle", { name: convertTarget?.full_name })}
        footer={
          <>
            <Button variant="secondary" onClick={closeConvertModal} disabled={converting}>
              {t("growth.common.cancel")}
            </Button>
            <Button type="submit" form="student-lead-convert-form" disabled={converting}>
              {converting ? t("growth.common.saving") : t("growth.common.save")}
            </Button>
          </>
        }
      >
        <form
          id="student-lead-convert-form"
          onSubmit={handleConvertSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Select
            label={t("growth.leads.fields.filial")}
            name="filial_id"
            value={convertForm.filial_id}
            onChange={handleConvertChange("filial_id")}
            error={convertErrors.filial_id}
          >
            <option value="">{t("growth.leads.fields.selectFilial")}</option>
            {filials.map((filial) => (
              <option key={filial.id} value={filial.id}>
                {filial.name}
              </option>
            ))}
          </Select>
          <DateInput
            label={t("growth.leads.fields.birthDate")}
            name="birth_date"
            value={convertForm.birth_date}
            onChange={handleConvertChange("birth_date")}
          />
          <Input
            label={t("growth.leads.fields.parentName")}
            name="parent_name"
            value={convertForm.parent_name}
            onChange={handleConvertChange("parent_name")}
          />
        </form>
      </Modal>
    </div>
  );
}
