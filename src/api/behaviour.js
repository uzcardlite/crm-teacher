import apiClient from "./client";

// Admin read-only behaviour list. Backend paginates and joins student_name +
// group_name + teacher_name. Params:
// { student_id?, group_id?, teacher_id?, page, size } ->
// { items, total, page, size }.
export function listBehaviour(params) {
  return apiClient.get("/api/v1/behaviour", { params }).then((res) => res.data);
}
