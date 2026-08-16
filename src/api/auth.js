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

// Appearance prefs (theme/language) stored on the account. Merge semantics:
// send only what changed, the server keeps the rest.
export function updateUiPrefs(payload) {
  return apiClient.patch("/api/v1/auth/me/ui-prefs", payload).then((res) => res.data);
}

// Bottom tab-bar customization ({ order, hidden }). Shares the backend's
// sidebar_prefs column with the admin app; the paths are this app's own.
export function updateTabBarPrefs(payload) {
  return apiClient.patch("/api/v1/auth/me/sidebar", payload).then((res) => res.data);
}
