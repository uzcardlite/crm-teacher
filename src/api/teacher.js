import apiClient from "./client";

// Teacher cabinet endpoints (/api/v1/teacher/*). Every call is scoped to the
// authenticated teacher on the backend — no teacher_id is ever sent from the
// client. These mirror the admin group/attendance/exam calls but hit the
// teacher-only, ownership-guarded routes.

export function getTeacherMe() {
  return apiClient.get("/api/v1/teacher/me").then((res) => res.data);
}

export function listMyGroups() {
  return apiClient.get("/api/v1/teacher/groups").then((res) => res.data);
}

export function listMyGroupStudents(groupId) {
  return apiClient
    .get(`/api/v1/teacher/groups/${groupId}/students`)
    .then((res) => res.data);
}

export function getMyStudent(studentId) {
  return apiClient.get(`/api/v1/teacher/students/${studentId}`).then((res) => res.data);
}

export function getMySchedule() {
  return apiClient.get("/api/v1/teacher/schedule").then((res) => res.data);
}

export function listMyAttendance(params) {
  return apiClient
    .get("/api/v1/teacher/attendance", { params })
    .then((res) => res.data);
}

export function bulkMarkMyAttendance(payload) {
  return apiClient
    .post("/api/v1/teacher/attendance/bulk", payload)
    .then((res) => res.data);
}

export function listMyDailyGrades(params) {
  return apiClient
    .get("/api/v1/teacher/daily-grades", { params })
    .then((res) => res.data);
}

export function bulkSaveMyDailyGrades(payload) {
  return apiClient
    .post("/api/v1/teacher/daily-grades/bulk", payload)
    .then((res) => res.data);
}

export function listMyExams(params) {
  return apiClient.get("/api/v1/teacher/exams", { params }).then((res) => res.data);
}

export function createMyExam(payload) {
  return apiClient.post("/api/v1/teacher/exams", payload).then((res) => res.data);
}

export function listMyExamGrades(examId) {
  return apiClient
    .get(`/api/v1/teacher/exams/${examId}/grades`)
    .then((res) => res.data);
}

export function bulkSaveMyExamGrades(examId, payload) {
  return apiClient
    .post(`/api/v1/teacher/exams/${examId}/grades`, payload)
    .then((res) => res.data);
}

export function listMyHomework(params) {
  return apiClient
    .get("/api/v1/teacher/homework", { params })
    .then((res) => res.data);
}

export function createMyHomework(payload) {
  return apiClient.post("/api/v1/teacher/homework", payload).then((res) => res.data);
}

export function updateMyHomework(id, payload) {
  return apiClient.put(`/api/v1/teacher/homework/${id}`, payload).then((res) => res.data);
}

export function deleteMyHomework(id) {
  return apiClient.delete(`/api/v1/teacher/homework/${id}`).then((res) => res.data);
}

export function listMyBehaviour(groupId) {
  return apiClient
    .get("/api/v1/teacher/behaviour", { params: { group_id: groupId } })
    .then((res) => res.data);
}

export function createBehaviour(payload) {
  return apiClient.post("/api/v1/teacher/behaviour", payload).then((res) => res.data);
}

export function updateBehaviour(id, payload) {
  return apiClient.put(`/api/v1/teacher/behaviour/${id}`, payload).then((res) => res.data);
}

export function deleteBehaviour(id) {
  return apiClient.delete(`/api/v1/teacher/behaviour/${id}`).then((res) => res.data);
}

// Teacher booking: the teacher opens free time slots; parents book them from
// the portal. Every route is scoped to the authenticated teacher on the
// backend — no teacher_id is ever sent from the client. After any mutation the
// caller reloads the relevant list (loadSlots/loadBookings pattern).

export function listMySlots() {
  return apiClient.get("/api/v1/teacher/booking/slots").then((res) => res.data);
}

export function createMySlot(payload) {
  return apiClient.post("/api/v1/teacher/booking/slots", payload).then((res) => res.data);
}

export function deleteMySlot(id) {
  return apiClient.delete(`/api/v1/teacher/booking/slots/${id}`).then((res) => res.data);
}

export function listMyBookings() {
  return apiClient.get("/api/v1/teacher/booking/bookings").then((res) => res.data);
}

export function confirmMyBooking(id) {
  return apiClient.post(`/api/v1/teacher/booking/bookings/${id}/confirm`).then((res) => res.data);
}

export function cancelMyBooking(id) {
  return apiClient.post(`/api/v1/teacher/booking/bookings/${id}/cancel`).then((res) => res.data);
}

// Teacher <-> parent chat. Threads and messages come back fully denormalized
// from the backend (student/parent names, group, unread counts) so the client
// never joins. Ordering is done server-side: threads by last_message_at DESC,
// messages by created_at ASC.

export function listChatThreads() {
  return apiClient.get("/api/v1/teacher/chat/threads").then((res) => res.data);
}

export function createChatThread(payload) {
  return apiClient.post("/api/v1/teacher/chat/threads", payload).then((res) => res.data);
}

export function listChatMessages(threadId) {
  return apiClient
    .get(`/api/v1/teacher/chat/threads/${threadId}/messages`)
    .then((res) => res.data);
}

export function sendChatMessage(threadId, body) {
  return apiClient
    .post(`/api/v1/teacher/chat/threads/${threadId}/messages`, { body })
    .then((res) => res.data);
}

export function markChatRead(threadId) {
  return apiClient
    .post(`/api/v1/teacher/chat/threads/${threadId}/read`)
    .then((res) => res.data);
}

export function getChatUnreadCount() {
  return apiClient.get("/api/v1/teacher/chat/unread-count").then((res) => res.data);
}
