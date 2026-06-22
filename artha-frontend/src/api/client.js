import axios from "axios";
import { formatFriendlyError } from "../lib/errorParser";

function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request Interceptor: Attach authentication headers automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (userId) {
      config.headers["X-User-Id"] = userId;
      config.headers["X-USER-ID"] = userId; // Fallback support for microservices using uppercase header
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Centralize error messages and handle session expiration (401)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const body = error.response?.data;

    // 1. Handle unauthorized/expired token (401)
    if (status === 401) {
      localStorage.removeItem("artha_jwt");
      localStorage.removeItem("artha_user_id");
      localStorage.removeItem("artha_user");
      
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth";
      }
      
      const friendlyErr = formatFriendlyError("Your session has expired. Please log in again.");
      return Promise.reject(new Error(friendlyErr));
    }

    // 2. Extract error message
    let rawError = "Request failed";
    if (body) {
      // Check for Spring Boot validation 'errors' array
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        rawError = body.errors;
      } else {
        rawError = body.message || body.error || body.detail || `Request failed with status ${status}`;
      }
    } else if (status) {
      rawError = `Request failed with status ${status}`;
    } else {
      rawError = error.message || "Connection error";
    }

    // Parse into user-friendly message
    let friendlyMessage = formatFriendlyError(rawError);
    if ((status === 502 || status === 503) && typeof rawError === "string" && !rawError.toLowerCase().includes("offline")) {
      friendlyMessage = "System is currently starting up or offline. Please wait 10 seconds and try again.";
    }

    return Promise.reject(new Error(friendlyMessage));
  }
);

export default apiClient;
