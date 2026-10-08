import axios from "axios";

export const API_BASE_URL = (() => {
  if (typeof window === "undefined") return "/api";
  const raw = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim();
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  if (isLocal) {
    return raw.replace(/\/+$/, "").endsWith("/api")
      ? raw.replace(/\/+$/, "")
      : `${raw.replace(/\/+$/, "")}/api`;
  }

  // When accessed via external URL / Cloudflare Tunnel / Cloudflare Pages / Render
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    // If configured pointing to localhost but accessed from external device or tunnel, route through relative /api
    if (raw.includes("localhost") || raw.includes("127.0.0.1")) {
      return "/api";
    }
    return raw.replace(/\/+$/, "").endsWith("/api")
      ? raw.replace(/\/+$/, "")
      : `${raw.replace(/\/+$/, "")}/api`;
  }

  return "/api";
})();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sems-access-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes("/auth/")) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("sems-refresh-token");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
        localStorage.setItem("sems-access-token", data.access_token);
        localStorage.setItem("sems-refresh-token", data.refresh_token);

        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("sems-access-token");
        localStorage.removeItem("sems-refresh-token");
        localStorage.removeItem("sems-user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
