import apiClient from "./client";

// Teacher cabinet: the authenticated teacher's own payroll for one month
// ("YYYY-MM"). teacher_id is NEVER sent — the backend forces it from the token
// for security. Response: { total_amount, salary_type, breakdown[] }.
export function getMyPayroll(month) {
  return apiClient
    .get("/api/v1/teacher/payroll", { params: { month } })
    .then((res) => res.data);
}

// Last 6 months of the teacher's own payroll:
// { salary_type, salary_amount, months: [{ month, total_amount, sessions_count }] }
export function getMyPayrollHistory() {
  return apiClient.get("/api/v1/teacher/payroll/history").then((res) => res.data);
}
