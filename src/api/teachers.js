import apiClient from "./client";

export function listTeachers(params) {
  return apiClient.get("/api/v1/teachers", { params }).then((res) => res.data);
}

export function createTeacher(payload) {
  return apiClient.post("/api/v1/teachers", payload).then((res) => res.data);
}

export function updateTeacher(teacherId, payload) {
  return apiClient.patch(`/api/v1/teachers/${teacherId}`, payload).then((res) => res.data);
}

export function deleteTeacher(teacherId) {
  return apiClient.delete(`/api/v1/teachers/${teacherId}`).then((res) => res.data);
}

// Give an existing teacher a login for the teacher cabinet. Backend creates a
// User (role="teacher", same tenant) and links it. Payload: { phone, password }.
export function createTeacherLogin(teacherId, payload) {
  return apiClient
    .post(`/api/v1/teachers/${teacherId}/login`, payload)
    .then((res) => res.data);
}
