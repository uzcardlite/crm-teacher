import apiClient from "./client";

export function listStudents(params) {
  return apiClient.get("/api/v1/students", { params }).then((res) => res.data);
}

export function createStudent(payload) {
  return apiClient.post("/api/v1/students", payload).then((res) => res.data);
}

export function getStudent(studentId) {
  return apiClient.get(`/api/v1/students/${studentId}`).then((res) => res.data);
}

export function getStudentGroups(studentId) {
  return apiClient.get(`/api/v1/students/${studentId}/groups`).then((res) => res.data);
}

export function updateStudent(studentId, payload) {
  return apiClient.patch(`/api/v1/students/${studentId}`, payload).then((res) => res.data);
}

export function deleteStudent(studentId) {
  return apiClient.delete(`/api/v1/students/${studentId}`).then((res) => res.data);
}

export function uploadStudentPhoto(studentId, file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient
    .post(`/api/v1/students/${studentId}/photo`, formData)
    .then((res) => res.data);
}
