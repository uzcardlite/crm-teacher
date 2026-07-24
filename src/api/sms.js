import apiClient from "./client";

const BASE = "/api/v1/sms";

// Sends one SMS blast. Payload: { body, student_ids?, group_id?, phones? }.
// Response: { total, sent, skipped, failed }.
export function sendSms(payload) {
  return apiClient.post(`${BASE}/send`, payload).then((res) => res.data);
}

// Paginated delivery log. Params: status, date_from, date_to, page, size.
export function listSmsLogs(params) {
  return apiClient.get(`${BASE}/logs`, { params }).then((res) => res.data);
}

// Provider availability flag: { enabled: bool } — drives the disabled banner.
export function getSmsConfig() {
  return apiClient.get(`${BASE}/config`).then((res) => res.data);
}
