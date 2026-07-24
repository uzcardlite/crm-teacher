import apiClient from "./client";

export function listAttendance(params) {
  return apiClient.get("/api/v1/attendance", { params }).then((res) => res.data);
}

export function bulkMarkAttendance(payload) {
  return apiClient.post("/api/v1/attendance/bulk", payload).then((res) => res.data);
}

export function getMonthlyReport(params) {
  return apiClient.get("/api/v1/attendance/report", { params }).then((res) => res.data);
}
