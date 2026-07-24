import apiClient from "./client";

export function listParents(params) {
  return apiClient.get("/api/v1/parents", { params }).then((res) => res.data);
}

export function getParentsSummary() {
  return apiClient.get("/api/v1/parents/summary").then((res) => res.data);
}

export function exportParents(params) {
  return apiClient
    .get("/api/v1/parents/export", { params, responseType: "blob" })
    .then((res) => res.data);
}
