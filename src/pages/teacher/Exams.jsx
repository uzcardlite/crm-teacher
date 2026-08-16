import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Plus } from "lucide-react";
import {
  bulkSaveMyExamGrades,
  createMyExam,
  getTeacherMe,
  listMyExamGrades,
  listMyExams,
  listMyGroups,
  listMyGroupStudents,
} from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import DateInput from "../../components/ui/DateInput";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { DEFAULT_EXAM_GRADE_MAX } from "../../utils/grading";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";
// max_score is filled in from the teacher's own exam scale when the modal
// opens; this is only the shape, and the fallback before that call lands.
const EMPTY_FORM = { name: "", date: "", max_score: String(DEFAULT_EXAM_GRADE_MAX) };

export default function Exams() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");

  const [roster, setRoster] = useState([]);
  const [gradesMap, setGradesMap] = useState({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);

  // The teacher's default exam scale (Settings -> Baholash). Only a default:
  // each exam still stores whatever max_score it was created with.
  const [examGradeMax, setExamGradeMax] = useState(DEFAULT_EXAM_GRADE_MAX);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const selectedExam = exams.find((exam) => exam.id === examId) || null;

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.exams.groupsError"))));
    // Silent: a missing default only means the field starts at 100, which is
    // not worth a toast on top of whatever else failed.
    getTeacherMe()
      .then((me) => setExamGradeMax(Number(me?.grading?.exam_grade_max) || DEFAULT_EXAM_GRADE_MAX))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setExamId("");
    setExams([]);
    if (!groupId) return;
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    if (!examId) {
      setRoster([]);
      setGradesMap({});
      return;
    }
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  async function loadExams() {
    try {
      setExams(await listMyExams({ group_id: groupId }));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.exams.examsError")));
    }
  }

  async function loadRoster() {
    setLoadingRoster(true);
    try {
      const [students, grades] = await Promise.all([
        listMyGroupStudents(groupId),
        listMyExamGrades(examId),
      ]);
      setRoster(students);
      const map = {};
      grades.forEach((grade) => {
        map[grade.student_id] = String(grade.score);
      });
      setGradesMap(map);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.exams.rosterError")));
    } finally {
      setLoadingRoster(false);
    }
  }

  function setStudentScore(studentId, value) {
    setGradesMap((prev) => ({ ...prev, [studentId]: value }));
  }

  function handleFormChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function openCreateModal() {
    setForm({ ...EMPTY_FORM, max_score: String(examGradeMax) });
    setErrors({});
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (submitting) return;
    setCreateOpen(false);
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t("teacher.exams.nameError");
    if (!form.date) nextErrors.date = t("teacher.exams.dateError");
    if (!form.max_score || Number(form.max_score) <= 0)
      nextErrors.max_score = t("teacher.exams.maxScoreError");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await createMyExam({
        group_id: groupId,
        name: form.name.trim(),
        date: form.date,
        max_score: Number(form.max_score),
      });
      toast.success(t("teacher.exams.createSuccess"));
      setCreateOpen(false);
      await loadExams();
      setExamId(created.id);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.exams.createError")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveGrades() {
    if (!selectedExam) return;
    const records = roster
      .filter(
        (student) =>
          gradesMap[student.student_id] !== undefined && gradesMap[student.student_id] !== "",
      )
      .map((student) => ({
        student_id: student.student_id,
        score: Number(gradesMap[student.student_id]),
      }));

    if (records.length === 0) {
      toast.error(t("teacher.exams.noScoresError"));
      return;
    }

    setSavingGrades(true);
    try {
      await bulkSaveMyExamGrades(selectedExam.id, { records });
      toast.success(t("teacher.exams.gradesSaved"));
      await loadRoster();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.exams.gradesSaveError")));
    } finally {
      setSavingGrades(false);
    }
  }

  return (
    <div className={PAGE_CLASS}>
      <div className="flex flex-col gap-3">
        <Select
          label={t("teacher.exams.groupLabel")}
          className="w-full"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          disabled={groups.length === 0}
        >
          <option value="">{t("teacher.exams.selectGroup")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>

        {groupId && (
          <>
            <Select
              label={t("teacher.exams.examLabel")}
              className="w-full"
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
            >
              <option value="">{t("teacher.exams.selectExam")}</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </Select>
            <Button variant="secondary" className="w-full" onClick={openCreateModal}>
              <Plus size={16} />
              {t("teacher.exams.newExam")}
            </Button>
          </>
        )}
      </div>

      {!groupId || !examId ? (
        <EmptyState
          size="md"
          icon={GraduationCap}
          title={t("teacher.exams.selectExamTitle")}
          description={t("teacher.exams.selectExamDescription")}
        />
      ) : loadingRoster ? (
        Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} padding="p-4" className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-20 rounded-btn" />
          </Card>
        ))
      ) : roster.length === 0 ? (
        <EmptyState
          size="md"
          icon={GraduationCap}
          title={t("teacher.exams.emptyStudentsTitle")}
          description={t("teacher.exams.emptyStudentsDescription")}
        />
      ) : (
        <>
          {roster.map((student) => (
            <Card
              key={student.student_id}
              padding="p-4"
              className="flex items-center justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar photoUrl={student.photo_url} name={student.student_full_name} size="sm" />
                <span className="truncate font-display text-base font-semibold text-fg">
                  {student.student_full_name}
                </span>
              </span>
              <Input
                type="number"
                min={0}
                max={Number(selectedExam?.max_score)}
                step="0.01"
                className="w-20"
                value={gradesMap[student.student_id] ?? ""}
                onChange={(event) => setStudentScore(student.student_id, event.target.value)}
              />
            </Card>
          ))}
          <Button className="w-full" onClick={handleSaveGrades} disabled={savingGrades}>
            {savingGrades ? t("teacher.common.saving") : t("teacher.common.save")}
          </Button>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title={t("teacher.exams.createTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={closeCreateModal} disabled={submitting}>
              {t("teacher.common.cancel")}
            </Button>
            <Button type="submit" form="teacher-exam-form" disabled={submitting}>
              {submitting ? t("teacher.common.saving") : t("teacher.common.save")}
            </Button>
          </>
        }
      >
        <form
          id="teacher-exam-form"
          onSubmit={handleCreateSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label={t("teacher.exams.nameLabel")}
            name="name"
            value={form.name}
            onChange={handleFormChange("name")}
            error={errors.name}
          />
          <DateInput
            label={t("teacher.exams.dateLabel")}
            name="date"
            value={form.date}
            onChange={handleFormChange("date")}
            error={errors.date}
          />
          <Input
            label={t("teacher.exams.maxScoreLabel")}
            name="max_score"
            type="number"
            min="1"
            value={form.max_score}
            onChange={handleFormChange("max_score")}
            error={errors.max_score}
          />
        </form>
      </Modal>
    </div>
  );
}
