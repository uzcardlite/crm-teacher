import apiClient from "./client";

export function listStudentLeads(params) {
  return apiClient.get("/api/v1/student-leads", { params }).then((res) => res.data);
}

export function createStudentLead(payload) {
  return apiClient.post("/api/v1/student-leads", payload).then((res) => res.data);
}

export function updateStudentLeadStage(leadId, stage) {
  return apiClient
    .patch(`/api/v1/student-leads/${leadId}/stage`, { stage })
    .then((res) => res.data);
}

export function updateStudentLeadAssignee(leadId, assignedUserId) {
  return apiClient
    .patch(`/api/v1/student-leads/${leadId}/assign`, { assigned_user_id: assignedUserId })
    .then((res) => res.data);
}

export function updateStudentLeadNote(leadId, note) {
  return apiClient.patch(`/api/v1/student-leads/${leadId}/note`, { note }).then((res) => res.data);
}

export function deleteStudentLead(leadId) {
  return apiClient.delete(`/api/v1/student-leads/${leadId}`).then((res) => res.data);
}

// Creates a Student from a lead and links them in one backend transaction.
// `payload` must include `filial_id`; `birth_date`/`parent_name` are optional.
export function convertStudentLead(leadId, payload) {
  return apiClient
    .post(`/api/v1/student-leads/${leadId}/convert`, payload)
    .then((res) => res.data);
}
