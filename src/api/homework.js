import apiClient from "./client";

// Admin read-only homework list. Backend paginates and joins group_name +
// teacher_name. Params: { group_id?, teacher_id?, page, size } ->
// { items, total, page, size }.
export function listHomework(params) {
  return apiClient.get("/api/v1/homework", { params }).then((res) => res.data);
}
