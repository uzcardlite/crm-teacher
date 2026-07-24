import apiClient from "./client";

export function listContracts(params) {
  return apiClient.get("/api/v1/contracts", { params }).then((res) => res.data);
}

export function getContract(id) {
  return apiClient.get(`/api/v1/contracts/${id}`).then((res) => res.data);
}

export function createContract(body) {
  return apiClient.post("/api/v1/contracts", body).then((res) => res.data);
}

export function updateContract(id, body) {
  return apiClient.patch(`/api/v1/contracts/${id}`, body).then((res) => res.data);
}

export function deleteContract(id) {
  return apiClient.delete(`/api/v1/contracts/${id}`).then((res) => res.data);
}
