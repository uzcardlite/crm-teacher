// Covers the prorated-enrolment behaviour in Students.jsx: leaving the
// "joined mid-month" toggle off must send no joined_date at all (so the
// backend defaults it to today), and ticking it without picking a date must
// be rejected client-side rather than silently falling back.
//
// All API modules are mocked so this exercises only the component's own
// logic. useTelegramLinkedMap is mocked directly (rather than wiring up
// TenantModulesContext/AuthContext) since the students tab renders the same
// regardless of the bot-status column being shown.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../i18n";

vi.mock("../../api/students", () => ({
  listStudents: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  uploadStudentPhoto: vi.fn(),
}));
vi.mock("../../api/filials", () => ({
  listFilials: vi.fn(),
}));
vi.mock("../../api/groups", () => ({
  listGroups: vi.fn(),
  addStudentToGroup: vi.fn(),
}));
vi.mock("../../hooks/useTelegramLinkedMap", () => ({
  useTelegramLinkedMap: () => ({ telegramLinkedMap: {}, telegramBotEnabled: false }),
}));

import { createStudent, listStudents } from "../../api/students";
import { listFilials } from "../../api/filials";
import { addStudentToGroup, listGroups } from "../../api/groups";
import Students from "../../pages/admin/Students";

const FILIAL = { id: "f1", name: "Filial 1" };
const GROUP = { id: "g1", name: "Group 1" };

function renderStudents() {
  return render(
    <MemoryRouter initialEntries={["/app/students"]}>
      <Students />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("uz");
  listStudents.mockResolvedValue({ items: [], total: 0 });
  listFilials.mockResolvedValue([FILIAL]);
  listGroups.mockResolvedValue({ items: [GROUP] });
  createStudent.mockResolvedValue({ id: "s1" });
  addStudentToGroup.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

async function openCreateModalAndFillBasics(user) {
  await screen.findByText(FILIAL.name, { selector: "option" }, { timeout: 3000 });
  // With no students loaded, the empty state also renders a button with the
  // same "new student" label as the page header; the header one is first.
  const [openButton] = screen.getAllByRole("button", {
    name: i18n.t("pages.students.newStudent"),
  });
  await user.click(openButton);

  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText(i18n.t("pages.students.name")), "Ali Valiyev");
  await user.selectOptions(
    within(dialog).getByLabelText(i18n.t("nav.filials")),
    FILIAL.id,
  );
  await user.selectOptions(
    within(dialog).getByLabelText(i18n.t("pages.students.addToGroupOptional")),
    GROUP.id,
  );
  return dialog;
}

describe("Students - prorated enrolment", () => {
  it("sends no joined_date when the mid-month toggle stays off", async () => {
    const user = userEvent.setup();
    renderStudents();
    const dialog = await openCreateModalAndFillBasics(user);

    await user.click(within(dialog).getByRole("button", { name: i18n.t("pages.students.save") }));

    await waitFor(() => expect(createStudent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(addStudentToGroup).toHaveBeenCalledTimes(1));
    expect(addStudentToGroup).toHaveBeenCalledWith(GROUP.id, "s1", undefined);
  });

  it("rejects submitting with the toggle on but no date chosen", async () => {
    const user = userEvent.setup();
    renderStudents();
    const dialog = await openCreateModalAndFillBasics(user);

    // Toggle's <label> wraps both the title and the hint text, so its
    // accessible name isn't an exact match for the title alone -- the
    // checkbox role is unambiguous here (it is the only checkbox in the form).
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: i18n.t("pages.students.save") }));

    expect(await within(dialog).findByText(i18n.t("pages.students.joinedDateError"))).toBeInTheDocument();
    expect(createStudent).not.toHaveBeenCalled();
    expect(addStudentToGroup).not.toHaveBeenCalled();
  });

  it("sends joined_date when the toggle is on and a date is chosen", async () => {
    const user = userEvent.setup();
    renderStudents();
    const dialog = await openCreateModalAndFillBasics(user);

    // Toggle's <label> wraps both the title and the hint text, so its
    // accessible name isn't an exact match for the title alone -- the
    // checkbox role is unambiguous here (it is the only checkbox in the form).
    await user.click(within(dialog).getByRole("checkbox"));
    const dateInput = within(dialog).getByLabelText(i18n.t("pages.students.joinedDate"));
    await user.type(dateInput, "2026-07-15");
    await user.click(within(dialog).getByRole("button", { name: i18n.t("pages.students.save") }));

    await waitFor(() => expect(addStudentToGroup).toHaveBeenCalledTimes(1));
    expect(addStudentToGroup).toHaveBeenCalledWith(GROUP.id, "s1", "2026-07-15");
  });
});
