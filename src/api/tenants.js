import apiClient from "./client";

export function getMyModules() {
  return apiClient.get("/api/v1/tenants/me/modules").then((res) => res.data);
}

export function getMyTenant() {
  return apiClient.get("/api/v1/tenants/me").then((res) => res.data);
}

export function updateMyTenant(payload) {
  return apiClient.patch("/api/v1/tenants/me", payload).then((res) => res.data);
}

export function listTenants() {
  return apiClient.get("/api/v1/tenants").then((res) => res.data);
}

export function createTenant(payload) {
  return apiClient.post("/api/v1/tenants", payload).then((res) => res.data);
}

export function getTenant(tenantId) {
  return apiClient.get(`/api/v1/tenants/${tenantId}`).then((res) => res.data);
}

export function getTenantStats(tenantId) {
  return apiClient.get(`/api/v1/tenants/${tenantId}/stats`).then((res) => res.data);
}

export function updateTenantActive(tenantId, isActive) {
  return apiClient
    .patch(`/api/v1/tenants/${tenantId}`, { is_active: isActive })
    .then((res) => res.data);
}

// Activate a paid subscription. Pass either an explicit end date
// (subscription_ends_at) or a relative extension (extend_months); plan_note is
// optional. Returns the updated tenant object.
export function markTenantPaid(tenantId, payload) {
  return apiClient
    .post(`/api/v1/tenants/${tenantId}/mark-paid`, payload)
    .then((res) => res.data);
}

// Put a tenant back on a demo window. Pass either demo_days or an explicit
// demo_ends_at. Returns the updated tenant object.
export function setTenantDemo(tenantId, payload) {
  return apiClient
    .post(`/api/v1/tenants/${tenantId}/set-demo`, payload)
    .then((res) => res.data);
}

export function toggleModule(tenantId, moduleKey, isEnabled) {
  return apiClient
    .patch(`/api/v1/tenants/${tenantId}/modules/${moduleKey}`, {
      is_enabled: isEnabled,
    })
    .then((res) => res.data);
}
