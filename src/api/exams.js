import apiClient from "./client";

export function listExams(params) {
  return apiClient.get("/api/v1/exams", { params }).then((res) => res.data);
}

export function createExam(payload) {
  return apiClient.post("/api/v1/exams", payload).then((res) => res.data);
}

export function bulkSaveGrades(examId, payload) {
  return apiClient.post(`/api/v1/exams/${examId}/grades`, payload).then((res) => res.data);
}

export function listExamGrades(examId) {
  return apiClient.get(`/api/v1/exams/${examId}/grades`).then((res) => res.data);
}
