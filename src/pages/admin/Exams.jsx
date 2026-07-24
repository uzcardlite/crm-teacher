import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Plus } from "lucide-react";
import { bulkSaveGrades, createExam, listExamGrades, listExams } from "../../api/exams";
import { listGroupStudents, listGroups } from "../../api/groups";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import DateInput from "../../components/ui/DateInput";
import FilterBar from "../../components/ui/FilterBar";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Table from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/format";

const EMPTY_FORM = { name: "", date: "", max_score: "100" };

function scoreVariant(score, maxScore) {
  if (score === "" || score === null || score === undefined || !maxScore) return "neutral";
  const ratio = Number(score) / Number(maxScore);
  if (ratio >= 0.8) return "success";
  if (ratio >= 0.5) return "warning";
  return "danger";
}

export default function Exams() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");

  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [gradingExam, setGradingExam] = useState(null);
  const [roster, setRoster] = useState([]);
  const [gradesMap, setGradesMap] = useState({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);

  useEffect(() => {
    listGroups({ page: 1, size: 100 })
      .then((data) => setGroups(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.exams.groupsError"))));
  }, []);

  useEffect(() => {
    if (!groupId) {
      setExams([]);
      return;
    }
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function loadExams() {
    setLoadingExams(true);
    try {
      const data = await listExams({ group_id: groupId });
      setExams(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.exams.examsError")));
    } finally {
      setLoadingExams(false);
    }
  }

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setErrors({});
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (submitting) return;
    setCreateOpen(false);
  }

  function handleFormChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t("pages.exams.nameError");
    if (!form.date) nextErrors.date = t("pages.exams.dateError");
    if (!form.max_score || Number(form.max_score) <= 0)
      nextErrors.max_score = t("pages.exams.maxScoreError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createExam({
        group_id: groupId,
        name: form.name.trim(),
        date: form.date,
        max_score: Number(form.max_score),
      });
      toast.success(t("pages.exams.createSuccess"));
      setCreateOpen(false);
      await loadExams();
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.exams.createError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function openGradeModal(exam) {
    setGradingExam(exam);
    setLoadingRoster(true);
    try {
      const [students, grades] = await Promise.all([
        listGroupStudents(groupId),
        listExamGrades(exam.id),
      ]);
      setRoster(students);
      const map = {};
      grades.forEach((grade) => {
        map[grade.student_id] = String(grade.score);
      });
      setGradesMap(map);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.exams.rosterError")));
    } finally {
      setLoadingRoster(false);
    }
  }

  function closeGradeModal() {
    if (savingGrades) return;
    setGradingExam(null);
    setRoster([]);
    setGradesMap({});
  }

  function setStudentScore(studentId, value) {
    setGradesMap((prev) => ({ ...prev, [studentId]: value }));
  }

  async function handleSaveGrades() {
    if (!gradingExam) return;
    const records = roster
      .filter((student) => gradesMap[student.student_id] !== undefined && gradesMap[student.student_id] !== "")
      .map((student) => ({
        student_id: student.student_id,
        score: Number(gradesMap[student.student_id]),
      }));

    if (records.length === 0) {
      toast.error(t("pages.exams.noScoresError"));
      return;
    }

    setSavingGrades(true);
    try {
      await bulkSaveGrades(gradingExam.id, { records });
      toast.success(t("pages.exams.gradesSaved"));
      const grades = await listExamGrades(gradingExam.id);
      const map = {};
      grades.forEach((grade) => {
        map[grade.student_id] = String(grade.score);
      });
      setGradesMap(map);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.exams.gradesSaveError")));
    } finally {
      setSavingGrades(false);
    }
  }

  const columns = [
    { key: "name", header: t("pages.exams.columns.name"), truncate: true },
    { key: "date", header: t("pages.exams.columns.date"), nowrap: true, render: (row) => formatDate(row.date) },
    { key: "max_score", header: t("pages.exams.columns.maxScore"), align: "right" },
    {
      key: "actions",
      header: t("pages.exams.columns.actions"),
      align: "right",
      nowrap: true,
      render: (row) => (
        <Button size="sm" variant="secondary" onClick={() => openGradeModal(row)}>
          {t("pages.exams.grade")}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("nav.exams")}>
        {groupId && (
          <Button onClick={openCreateModal}>
            <Plus size={16} />
            {t("pages.exams.newExam")}
          </Button>
        )}
      </PageHeader>

      <FilterBar>
        <Select
          label={t("pages.exams.group")}
          className="w-full max-w-[240px]"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
        >
          <option value="">{t("pages.exams.selectGroup")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
      </FilterBar>

      {!groupId ? (
        <EmptyState
          icon={GraduationCap}
          title={t("pages.exams.selectGroup")}
          description={t("pages.exams.selectGroupDescription")}
        />
      ) : (
        <Table
          columns={columns}
          data={exams}
          loading={loadingExams}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={GraduationCap}
              title={t("pages.exams.emptyTitle")}
              description={t("pages.exams.emptyDescription")}
              actionLabel={t("pages.exams.newExam")}
              onAction={openCreateModal}
            />
          }
        />
      )}

      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title={t("pages.exams.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeCreateModal} disabled={submitting}>
              {t("pages.exams.cancel")}
            </Button>
            <Button type="submit" form="exam-form" disabled={submitting}>
              {submitting ? t("pages.exams.saving") : t("pages.exams.save")}
            </Button>
          </>
        }
      >
        <form id="exam-form" onSubmit={handleCreateSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label={t("pages.exams.columns.name")}
            name="name"
            value={form.name}
            onChange={handleFormChange("name")}
            error={errors.name}
          />
          <DateInput
            label={t("pages.exams.columns.date")}
            name="date"
            value={form.date}
            onChange={handleFormChange("date")}
            error={errors.date}
          />
          <Input
            label={t("pages.exams.maxScore")}
            name="max_score"
            type="number"
            min="1"
            value={form.max_score}
            onChange={handleFormChange("max_score")}
            error={errors.max_score}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(gradingExam)}
        onClose={closeGradeModal}
        title={gradingExam ? t("pages.exams.gradeModalTitle", { name: gradingExam.name }) : ""}
        size="lg"
        footer={
          !loadingRoster &&
          roster.length > 0 && (
            <>
              <Button variant="secondary" onClick={closeGradeModal} disabled={savingGrades}>
                {t("common.close")}
              </Button>
              <Button onClick={handleSaveGrades} disabled={savingGrades}>
                {savingGrades ? t("pages.exams.saving") : t("pages.exams.save")}
              </Button>
            </>
          )
        }
      >
        {loadingRoster ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3 px-2 py-2">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-9 w-20 rounded-btn" />
                </div>
              </div>
            ))}
          </div>
        ) : roster.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={t("pages.exams.noStudentsTitle")}
            description={t("pages.exams.noStudentsDescription")}
          />
        ) : (
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {roster.map((student) => {
              const value = gradesMap[student.student_id] ?? "";
              return (
                <li
                  key={student.student_id}
                  className="flex items-center justify-between gap-3 rounded-btn px-2 py-2 hover:bg-surface-sunken"
                >
                  <span className="text-sm text-fg-secondary">{student.student_full_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={scoreVariant(value, gradingExam?.max_score)}>
                      {value !== "" ? `${value}/${gradingExam?.max_score}` : "—"}
                    </Badge>
                    <Input
                      type="number"
                      min="0"
                      max={gradingExam?.max_score}
                      step="0.01"
                      className="w-20"
                      value={value}
                      onChange={(event) => setStudentScore(student.student_id, event.target.value)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
