import apiClient from "./client";

export function listAcademicYears() {
  return apiClient.get("/api/v1/academic-years").then((res) => res.data);
}
