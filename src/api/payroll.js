import apiClient from "./client";

export function getTeacherPayroll(teacherId, month) {
  return apiClient
    .get(`/api/v1/teachers/${teacherId}/payroll`, { params: { month } })
    .then((res) => res.data);
}

export function finalizeTeacherPayroll(teacherId, month) {
  return apiClient
    .post(`/api/v1/teachers/${teacherId}/payroll/finalize`, { month })
    .then((res) => res.data);
}

export function getTeacherPayrollHistory(teacherId) {
  return apiClient.get(`/api/v1/teachers/${teacherId}/payroll/history`).then((res) => res.data);
}

// Teacher cabinet: the authenticated teacher's own payroll for one month
// ("YYYY-MM"). teacher_id is NEVER sent — the backend forces it from the token
// for security. Response: { total_amount, salary_type, breakdown[] }.
export function getMyPayroll(month) {
  return apiClient
    .get("/api/v1/teacher/payroll", { params: { month } })
    .then((res) => res.data);
}
