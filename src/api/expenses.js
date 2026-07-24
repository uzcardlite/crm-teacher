import apiClient from "./client";

export function listExpenses(params) {
  return apiClient.get("/api/v1/expenses", { params }).then((res) => res.data);
}

export function createExpense(payload) {
  return apiClient.post("/api/v1/expenses", payload).then((res) => res.data);
}

export function updateExpense(expenseId, payload) {
  return apiClient.patch(`/api/v1/expenses/${expenseId}`, payload).then((res) => res.data);
}

export function deleteExpense(expenseId) {
  return apiClient.delete(`/api/v1/expenses/${expenseId}`).then((res) => res.data);
}

export function getExpenseSummary(params) {
  return apiClient.get("/api/v1/expenses/summary", { params }).then((res) => res.data);
}
