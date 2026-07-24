import apiClient from "./client";

export function listEvents(params) {
  return apiClient.get("/api/v1/turnstile/events", { params }).then((res) => res.data);
}

export function createEvent(payload) {
  return apiClient.post("/api/v1/turnstile/events", payload).then((res) => res.data);
}

export function listDevices() {
  return apiClient.get("/api/v1/turnstile/devices").then((res) => res.data);
}

export function createDevice(payload) {
  return apiClient.post("/api/v1/turnstile/devices", payload).then((res) => res.data);
}

export function updateDevice(id, payload) {
  return apiClient.patch(`/api/v1/turnstile/devices/${id}`, payload).then((res) => res.data);
}

export function deleteDevice(id) {
  return apiClient.delete(`/api/v1/turnstile/devices/${id}`).then((res) => res.data);
}
