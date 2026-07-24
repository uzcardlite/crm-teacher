import apiClient from "./client";

export function listUsers() {
  return apiClient.get("/api/v1/users").then((res) => res.data);
}

export function listSuperAdmins() {
  return apiClient.get("/api/v1/users/super-admins").then((res) => res.data);
}

export function createUser(payload) {
  return apiClient.post("/api/v1/users", payload).then((res) => res.data);
}

export function updateUser(userId, payload) {
  return apiClient.patch(`/api/v1/users/${userId}`, payload).then((res) => res.data);
}

export function deactivateUser(userId) {
  return apiClient.patch(`/api/v1/users/${userId}/deactivate`).then((res) => res.data);
}
