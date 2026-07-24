import apiClient from "./client";

export function listRooms(params) {
  return apiClient.get("/api/v1/rooms", { params }).then((res) => res.data);
}

export function createRoom(payload) {
  return apiClient.post("/api/v1/rooms", payload).then((res) => res.data);
}
