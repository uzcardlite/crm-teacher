import apiClient from "./client";

// Both return the whole axios response (not `.data`) so `saveBlobResponse`
// can read the Content-Disposition header for the server-supplied filename.
export function downloadFinanceReport(params) {
  return apiClient.get("/api/v1/reports/finance/export", { params, responseType: "blob" });
}

export function downloadAttendanceReport(params) {
  return apiClient.get("/api/v1/reports/attendance/export", { params, responseType: "blob" });
}
