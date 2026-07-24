import apiClient from "./client";

const BASE = "/api/v1/marketing";

// --- bloggers ---------------------------------------------------------------

export function listBloggers(params) {
  return apiClient.get(`${BASE}/bloggers`, { params }).then((res) => res.data);
}

export function getBlogger(bloggerId) {
  return apiClient.get(`${BASE}/bloggers/${bloggerId}`).then((res) => res.data);
}

export function createBlogger(payload) {
  return apiClient.post(`${BASE}/bloggers`, payload).then((res) => res.data);
}

export function updateBlogger(bloggerId, payload) {
  return apiClient.patch(`${BASE}/bloggers/${bloggerId}`, payload).then((res) => res.data);
}

// --- posts ------------------------------------------------------------------

export function listMarketingPosts(params) {
  return apiClient.get(`${BASE}/posts`, { params }).then((res) => res.data);
}

export function getMarketingPost(postId) {
  return apiClient.get(`${BASE}/posts/${postId}`).then((res) => res.data);
}

export function createMarketingPost(payload) {
  return apiClient.post(`${BASE}/posts`, payload).then((res) => res.data);
}

export function updateMarketingPost(postId, payload) {
  return apiClient.patch(`${BASE}/posts/${postId}`, payload).then((res) => res.data);
}

export function deleteMarketingPost(postId) {
  return apiClient.delete(`${BASE}/posts/${postId}`).then((res) => res.data);
}

// --- stats / timeline / export ----------------------------------------------

export function getMarketingStats(params) {
  return apiClient.get(`${BASE}/stats`, { params }).then((res) => res.data);
}

export function getMarketingTimeline(month) {
  return apiClient.get(`${BASE}/timeline`, { params: { month } }).then((res) => res.data);
}

// Returns the raw axios response so the caller can read Content-Disposition.
export function downloadMarketingPostsExport(params) {
  return apiClient.get(`${BASE}/export/posts`, { params, responseType: "blob" });
}
