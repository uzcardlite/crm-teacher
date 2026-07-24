import apiClient from "./client";

export function listRoles(tenantId) {
  return apiClient
    .get("/api/v1/roles", { params: tenantId ? { tenant_id: tenantId } : {} })
    .then((res) => res.data);
}

export function createRole(payload) {
  return apiClient.post("/api/v1/roles", payload).then((res) => res.data);
}

export function toggleRoleModule(roleId, moduleKey, enabled) {
  return apiClient
    .patch(`/api/v1/roles/${roleId}/modules/${moduleKey}`, { enabled })
    .then((res) => res.data);
}
