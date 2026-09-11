import axios from "axios";

// Frontend and backend share the same host (ingress routes /api to the backend),
// so fall back to the current origin when REACT_APP_BACKEND_URL is missing or stale.
// This keeps auth/API calls working after a fresh clone or platform migration.
const configured = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/$/, "");
const BASE =
  configured ||
  (typeof window !== "undefined" ? window.location.origin : "");

const api = axios.create({
  baseURL: `${BASE}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sl_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
