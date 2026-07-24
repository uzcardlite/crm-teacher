import apiClient from "./client";

export function getFinanceStats(params) {
  return apiClient.get("/api/v1/finance/stats", { params }).then((res) => res.data);
}

export function listFinanceDebtors(params) {
  return apiClient.get("/api/v1/finance/debtors", { params }).then((res) => res.data);
}

export function remindDebtors(payload) {
  return apiClient.post("/api/v1/finance/debtors/remind", payload).then((res) => res.data);
}

export function getFinancePayroll(params) {
  return apiClient.get("/api/v1/finance/payroll", { params }).then((res) => res.data);
}

export function getFinanceReport(params) {
  return apiClient.get("/api/v1/finance/report", { params }).then((res) => res.data);
}

// kind: "payments" | "expenses" | "debtors" | "report".
// Returns the raw axios response so the caller can read Content-Disposition.
export function downloadFinanceExport(kind, params) {
  return apiClient.get(`/api/v1/finance/export/${kind}`, { params, responseType: "blob" });
}
