import apiClient from "./client";

export function listEmployees(params) {
  return apiClient.get("/api/v1/hr/employees", { params }).then((res) => res.data);
}

export function getEmployee(employeeId) {
  return apiClient.get(`/api/v1/hr/employees/${employeeId}`).then((res) => res.data);
}

export function createEmployee(payload) {
  return apiClient.post("/api/v1/hr/employees", payload).then((res) => res.data);
}

export function updateEmployee(employeeId, payload) {
  return apiClient.patch(`/api/v1/hr/employees/${employeeId}`, payload).then((res) => res.data);
}

// Employees have no hard-delete endpoint — deactivating is a PATCH that sets
// is_active: false, and the backend automatically records terminated_at.
export function deactivateEmployee(employeeId) {
  return updateEmployee(employeeId, { is_active: false });
}

export function reactivateEmployee(employeeId) {
  return updateEmployee(employeeId, { is_active: true });
}

export function listEmployeeHistory(employeeId, params) {
  return apiClient
    .get(`/api/v1/hr/employees/${employeeId}/history`, { params })
    .then((res) => res.data);
}

export function listHiringHistory(params) {
  return apiClient.get("/api/v1/hr/history", { params }).then((res) => res.data);
}

export function getHrStats(params) {
  return apiClient.get("/api/v1/hr/stats", { params }).then((res) => res.data);
}

export function listHrReminders(params) {
  return apiClient.get("/api/v1/hr/reminders", { params }).then((res) => res.data);
}

export function listLeaveRequests(params) {
  return apiClient.get("/api/v1/hr/leave-requests", { params }).then((res) => res.data);
}

export function createLeaveRequest(payload) {
  return apiClient.post("/api/v1/hr/leave-requests", payload).then((res) => res.data);
}

export function updateLeaveRequest(leaveId, payload) {
  return apiClient
    .patch(`/api/v1/hr/leave-requests/${leaveId}`, payload)
    .then((res) => res.data);
}

// One decision endpoint for both outcomes: { status: "approved" | "rejected" }.
export function decideLeaveRequest(leaveId, payload) {
  return apiClient
    .post(`/api/v1/hr/leave-requests/${leaveId}/decision`, payload)
    .then((res) => res.data);
}

// Only pending requests can be cancelled; the backend flips status to cancelled.
export function cancelLeaveRequest(leaveId) {
  return apiClient.delete(`/api/v1/hr/leave-requests/${leaveId}`).then((res) => res.data);
}

export function getLeaveBalance(employeeId, year) {
  return apiClient
    .get(`/api/v1/hr/employees/${employeeId}/leave-balance`, { params: { year } })
    .then((res) => res.data);
}

export function listEmployeeDocuments(employeeId) {
  return apiClient
    .get(`/api/v1/hr/employees/${employeeId}/documents`)
    .then((res) => res.data);
}

// Content-Type is intentionally left to the browser so the multipart boundary
// is generated correctly (same pattern as students.js photo upload).
export function uploadEmployeeDocument(employeeId, formData) {
  return apiClient
    .post(`/api/v1/hr/employees/${employeeId}/documents`, formData)
    .then((res) => res.data);
}

export function deleteEmployeeDocument(documentId) {
  return apiClient.delete(`/api/v1/hr/documents/${documentId}`).then((res) => res.data);
}

export function uploadEmployeePhoto(employeeId, formData) {
  return apiClient
    .post(`/api/v1/hr/employees/${employeeId}/photo`, formData)
    .then((res) => res.data);
}
