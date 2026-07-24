import apiClient from "./client";

export function listFilials() {
  return apiClient.get("/api/v1/filials").then((res) => res.data);
}

export function createFilial(payload) {
  return apiClient.post("/api/v1/filials", payload).then((res) => res.data);
}

export function updateFilial(filialId, payload) {
  return apiClient.patch(`/api/v1/filials/${filialId}`, payload).then((res) => res.data);
}

export function deleteFilial(filialId) {
  return apiClient.delete(`/api/v1/filials/${filialId}`).then((res) => res.data);
}
