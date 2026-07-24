import apiClient from "./client";

// Unified staff list — merges employees, teachers and users into one feed.
// See app/api/v1/hr.py `/hr/staff` on the backend.
export function listStaff(params) {
  return apiClient.get("/api/v1/hr/staff", { params }).then((res) => res.data);
}

// Single atomic create: employee (required) + optional teacher/user parts.
export function createStaff(payload) {
  return apiClient.post("/api/v1/hr/staff", payload).then((res) => res.data);
}

// Roles assignable to staff — tenant-scoped, super_admin excluded. Returns
// [{ name, label }]. See app/api/v1/hr.py `/hr/staff/roles` on the backend.
export function listStaffRoles() {
  return apiClient.get("/api/v1/hr/staff/roles").then((res) => res.data);
}
