import { useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import {
  createTeacher,
  createTeacherLogin,
  deleteTeacher,
  listTeachers,
  updateTeacher,
} from "../../api/teachers";
import { listFilials } from "../../api/filials";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import IconButton from "../../components/ui/IconButton";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";

// Admin "O'qituvchilar" page. Teachers created here are Teacher records, so the
// merged staff (Xodimlar) endpoint shows them automatically; a plain system
// user created on the staff page is not a Teacher and never appears here.

const SALARY_TYPE_LABELS = { fixed: "Belgilangan", hourly: "Soatlik" };

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  filial_id: "",
  subject: "",
  salary_type: "fixed",
  salary_amount: "",
};

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `${Number(value).toLocaleString("ru-RU")} so'm`;
}

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [filials, setFilials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filialFilter, setFilialFilter] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [loginTeacher, setLoginTeacher] = useState(null);
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [loginSaving, setLoginSaving] = useState(false);

  const filialName = useMemo(() => {
    const map = {};
    filials.forEach((f) => {
      map[f.id] = f.name;
    });
    return map;
  }, [filials]);

  async function load() {
    setLoading(true);
    try {
      const params = { page: 1, size: 100 };
      if (filialFilter) params.filial_id = filialFilter;
      if (search.trim()) params.search = search.trim();
      const data = await listTeachers(params);
      setTeachers(data.items ?? data ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listFilials()
      .then((data) => setFilials(data.items ?? data ?? []))
      .catch(() => setFilials([]));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialFilter, search]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, filial_id: filials[0]?.id ?? "" });
    setModalOpen(true);
  }

  function openEdit(teacher) {
    setEditingId(teacher.id);
    setForm({
      full_name: teacher.full_name ?? "",
      phone: teacher.phone ?? "",
      filial_id: teacher.filial_id ?? "",
      subject: teacher.subject ?? "",
      salary_type: teacher.salary_type ?? "fixed",
      salary_amount: teacher.salary_amount ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.filial_id || !form.salary_amount) {
      toast.error("Ism, filial va maosh summasi majburiy");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        filial_id: form.filial_id,
        phone: form.phone.trim() || null,
        subject: form.subject.trim() || null,
        salary_type: form.salary_type,
        salary_amount: Number(form.salary_amount),
      };
      if (editingId) {
        await updateTeacher(editingId, payload);
        toast.success("O'qituvchi yangilandi");
      } else {
        await createTeacher(payload);
        toast.success("O'qituvchi qo'shildi");
      }
      setModalOpen(false);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(teacher) {
    if (!window.confirm(`"${teacher.full_name}" o'qituvchini o'chirasizmi?`)) return;
    try {
      await deleteTeacher(teacher.id);
      toast.success("O'qituvchi o'chirildi");
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function openLogin(teacher) {
    setLoginTeacher(teacher);
    setLoginForm({ phone: teacher.phone ?? "", password: "" });
  }

  async function handleLogin() {
    if (!loginForm.phone.trim() || loginForm.password.length < 6) {
      toast.error("Telefon va kamida 6 belgili parol kiriting");
      return;
    }
    setLoginSaving(true);
    try {
      await createTeacherLogin(loginTeacher.id, {
        phone: loginForm.phone.trim(),
        password: loginForm.password,
      });
      toast.success("Login yaratildi");
      setLoginTeacher(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoginSaving(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader title="O'qituvchilar" subtitle="Markazingiz o'qituvchilari">
        <Button onClick={openCreate}>
          <Plus size={16} />
          O'qituvchi qo'shish
        </Button>
      </PageHeader>

      <FilterBar className="mb-4" onClear={() => { setFilialFilter(""); setSearch(""); }}>
        <Select
          label="Filial"
          value={filialFilter}
          onChange={(e) => setFilialFilter(e.target.value)}
        >
          <option value="">Barcha filiallar</option>
          {filials.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
        <Input
          label="Qidiruv"
          placeholder="Ism bo'yicha qidirish"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </FilterBar>

      <Card padding="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="O'qituvchi topilmadi"
            description="Yangi o'qituvchi qo'shish uchun yuqoridagi tugmani bosing."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-sunken text-left text-fg-secondary">
                  <th className="px-4 py-3 font-medium">O'qituvchi</th>
                  <th className="px-4 py-3 font-medium">Telefon</th>
                  <th className="px-4 py-3 font-medium">Filial</th>
                  <th className="px-4 py-3 font-medium">Fan</th>
                  <th className="px-4 py-3 font-medium">Maosh</th>
                  <th className="px-4 py-3 text-right font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-fg">{teacher.full_name}</td>
                    <td className="px-4 py-3 text-fg-secondary">{teacher.phone || "—"}</td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {filialName[teacher.filial_id] || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {teacher.subject ? (
                        <Badge variant="neutral">{teacher.subject}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-fg-secondary">
                      <span className="text-fg-faint">
                        {SALARY_TYPE_LABELS[teacher.salary_type] || teacher.salary_type}
                      </span>{" "}
                      {formatMoney(teacher.salary_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          aria-label="Login yaratish"
                          onClick={() => openLogin(teacher)}
                        >
                          <KeyRound size={16} />
                        </IconButton>
                        <IconButton aria-label="Tahrirlash" onClick={() => openEdit(teacher)}>
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          aria-label="O'chirish"
                          onClick={() => handleDelete(teacher)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Ism"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <Input
            label="Telefon"
            placeholder="+998901234567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Select
            label="Filial"
            value={form.filial_id}
            onChange={(e) => setForm({ ...form, filial_id: e.target.value })}
          >
            <option value="">Filialni tanlang</option>
            {filials.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <Input
            label="Fan"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <Select
            label="Maosh turi"
            value={form.salary_type}
            onChange={(e) => setForm({ ...form, salary_type: e.target.value })}
          >
            <option value="fixed">Belgilangan</option>
            <option value="hourly">Soatlik</option>
          </Select>
          <Input
            label="Maosh summasi"
            type="number"
            value={form.salary_amount}
            onChange={(e) => setForm({ ...form, salary_amount: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(loginTeacher)}
        onClose={() => setLoginTeacher(null)}
        title="Tizimga kirish yaratish"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLoginTeacher(null)}>
              Bekor qilish
            </Button>
            <Button onClick={handleLogin} disabled={loginSaving}>
              {loginSaving ? "Saqlanmoqda..." : "Yaratish"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-secondary">
            {loginTeacher?.full_name} uchun ustoz kabinetiga kirish login/paroli.
          </p>
          <Input
            label="Telefon (login)"
            placeholder="+998901234567"
            value={loginForm.phone}
            onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
          />
          <Input
            label="Parol"
            type="password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
