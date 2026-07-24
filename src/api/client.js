import axios from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../utils/tokenStorage";

// Fall back to the production backend so the build works even when
// VITE_API_URL is not set in the deploy environment (.env is gitignored).
const baseURL =
  import.meta.env.VITE_API_URL || "https://crm-backend-production-49b2.up.railway.app";

const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

function redirectToLogin() {
  clearTokens();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// Full-screen block route for an expired subscription. Tokens are kept (the
// user is still authenticated — only their tenant's subscription lapsed), so
// they can log out from the block screen.
function redirectToExpired() {
  if (window.location.pathname !== "/subscription-expired") {
    window.location.href = "/subscription-expired";
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh");

    // A module-gated endpoint returns 403 subscription_expired once the tenant
    // subscription lapses — send the (still-authenticated) user to the block
    // screen. Covers both tenant admins and teachers.
    if (status === 403 && error.response?.data?.detail === "subscription_expired") {
      redirectToExpired();
      return Promise.reject(error);
    }

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${baseURL}/api/v1/auth/refresh`, { refresh_token: refreshToken })
          .then((res) => {
            setTokens(res.data);
            return res.data.access_token;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
