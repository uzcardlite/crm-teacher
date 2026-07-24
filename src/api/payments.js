import apiClient from "./client";

export function listPayments(params) {
  return apiClient.get("/api/v1/payments", { params }).then((res) => res.data);
}

export function createPayment(payload) {
  return apiClient.post("/api/v1/payments", payload).then((res) => res.data);
}

export function updatePayment(paymentId, payload) {
  return apiClient.patch(`/api/v1/payments/${paymentId}`, payload).then((res) => res.data);
}

export function deletePayment(paymentId) {
  return apiClient.delete(`/api/v1/payments/${paymentId}`).then((res) => res.data);
}

export function getDebtors(params) {
  return apiClient.get("/api/v1/payments/debtors", { params }).then((res) => res.data);
}
