import apiClient from "./client";

// Admin read-only booking list. Backend returns a flat AdminBookingOut[] array
// (student_name + teacher_name denormalized, tenant-scoped). No mutation
// endpoints exist for admins. Params: { teacher_id?, status? }.
export function listBookings(params) {
  return apiClient.get("/api/v1/booking", { params }).then((res) => res.data);
}
