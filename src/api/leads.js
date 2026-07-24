import apiClient from "./client";

export function listLeads(params) {
  return apiClient.get("/api/v1/leads", { params }).then((res) => res.data);
}

export function updateLeadStage(leadId, stage) {
  return apiClient.patch(`/api/v1/leads/${leadId}/stage`, { stage }).then((res) => res.data);
}

export function updateLeadAssignee(leadId, assignedUserId) {
  return apiClient
    .patch(`/api/v1/leads/${leadId}/assign`, { assigned_user_id: assignedUserId })
    .then((res) => res.data);
}

export function updateLeadNote(leadId, note) {
  return apiClient.patch(`/api/v1/leads/${leadId}/note`, { note }).then((res) => res.data);
}
