import apiClient from "./client";

export function listMenus(params) {
  return apiClient.get("/api/v1/menu", { params }).then((res) => res.data);
}

export function createMenu(body) {
  return apiClient.post("/api/v1/menu", body).then((res) => res.data);
}

export function updateMenu(id, body) {
  return apiClient.patch(`/api/v1/menu/${id}`, body).then((res) => res.data);
}

export function deleteMenu(id) {
  return apiClient.delete(`/api/v1/menu/${id}`).then((res) => res.data);
}
