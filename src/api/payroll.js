import apiClient from "./client";

// Teacher cabinet: the authenticated teacher's own salary for one month
// ("YYYY-MM"). teacher_id is NEVER sent — the backend forces it from the
// token. The centre must have finalized AND published the month, or the
// response carries no amount at all: { month, published: false }.
// Published shape: { month, published: true, total_amount, breakdown[],
// sessions_count, published_at }.
export function getMyPayroll(month) {
  return apiClient
    .get("/api/v1/teacher/payroll", { params: { month } })
    .then((res) => res.data);
}

// Published months only, oldest first:
// { salary_type, salary_amount, months: [{ month, total_amount, sessions_count }] }
export function getMyPayrollHistory() {
  return apiClient.get("/api/v1/teacher/payroll/history").then((res) => res.data);
}
