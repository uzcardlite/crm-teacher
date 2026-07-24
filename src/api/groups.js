import apiClient from "./client";

export function listGroups(params) {
  return apiClient.get("/api/v1/groups", { params }).then((res) => res.data);
}

export function createGroup(payload) {
  return apiClient.post("/api/v1/groups", payload).then((res) => res.data);
}

export function getGroup(groupId) {
  return apiClient.get(`/api/v1/groups/${groupId}`).then((res) => res.data);
}

export function updateGroup(groupId, payload) {
  return apiClient.patch(`/api/v1/groups/${groupId}`, payload).then((res) => res.data);
}

export function deleteGroup(groupId) {
  return apiClient.delete(`/api/v1/groups/${groupId}`).then((res) => res.data);
}

export function listGroupStudents(groupId) {
  return apiClient.get(`/api/v1/groups/${groupId}/students`).then((res) => res.data);
}

// `joinedDate` is only sent when the caller actually has one. Omitting the
// field lets the backend default it to today; sending null would not be the
// same thing. It drives the prorated first month, so the student is billed
// only for the lessons left after they joined.
export function addStudentToGroup(groupId, studentId, joinedDate) {
  const payload = { student_id: studentId };
  if (joinedDate) payload.joined_date = joinedDate;
  return apiClient
    .post(`/api/v1/groups/${groupId}/students`, payload)
    .then((res) => res.data);
}

// Enrols several students at once, all with the same joined date. The
// server treats already-enrolled ids as a no-op (returned in
// `already_active`, not an error) and enrols nobody at all if any id is
// invalid or the batch would exceed remaining capacity.
export function addStudentsToGroupBulk(groupId, studentIds, joinedDate) {
  const payload = { student_ids: studentIds };
  if (joinedDate) payload.joined_date = joinedDate;
  return apiClient
    .post(`/api/v1/groups/${groupId}/students/bulk`, payload)
    .then((res) => res.data);
}

export function removeStudentFromGroup(groupId, studentId) {
  return apiClient
    .delete(`/api/v1/groups/${groupId}/students/${studentId}`)
    .then((res) => res.data);
}
