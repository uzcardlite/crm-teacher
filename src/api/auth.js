import apiClient from "./client";

export function login(phone, password) {
  return apiClient
    .post("/api/v1/auth/login", { phone, password })
    .then((res) => res.data);
}

export function getMe() {
  return apiClient.get("/api/v1/auth/me").then((res) => res.data);
}

export function updateMe(payload) {
  return apiClient.patch("/api/v1/auth/me", payload).then((res) => res.data);
}

export function changePassword(payload) {
  return apiClient
    .post("/api/v1/auth/change-password", payload)
    .then((res) => res.data);
}

export function uploadMyPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post("/api/v1/auth/me/photo", formData).then((res) => res.data);
}
