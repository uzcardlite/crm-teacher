import apiClient from "./client";

export function getDashboard(params) {
  return apiClient.get("/api/v1/dashboard", { params }).then((res) => res.data);
}

export function getDashboardAnalytics({ months, filial_id, academic_year_id } = {}) {
  return apiClient
    .get("/api/v1/dashboard/analytics", {
      params: {
        months,
        filial_id: filial_id || undefined,
        academic_year_id: academic_year_id || undefined,
      },
    })
    .then((res) => res.data);
}
