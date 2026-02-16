import axios from "axios";

const LAST_FAILED_ROUTE_KEY = "lastFailedRoute";
const LAST_REDIRECT_AT_KEY = "lastNetworkRedirectAt";
const REDIRECT_COOLDOWN_MS = 2500;
const OFFLINE_REDIRECT_DELAY_MS = 1500;
let pendingOfflineRedirect = null;
const isOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

const redirectToNetworkError = () => {
  if (
    typeof window !== "undefined" &&
    window.location.pathname !== "/network-error"
  ) {
    if (isOffline()) {
      if (pendingOfflineRedirect) return;

      pendingOfflineRedirect = window.setTimeout(() => {
        pendingOfflineRedirect = null;
        if (!isOffline() || window.location.pathname === "/network-error") return;

        const failedRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (failedRoute && failedRoute !== "/network-error") {
          sessionStorage.setItem(LAST_FAILED_ROUTE_KEY, failedRoute);
        }
        sessionStorage.setItem(LAST_REDIRECT_AT_KEY, String(Date.now()));
        window.location.href = "/network-error";
      }, OFFLINE_REDIRECT_DELAY_MS);
      return;
    }

    const now = Date.now();
    const lastRedirectAt = Number(sessionStorage.getItem(LAST_REDIRECT_AT_KEY) || 0);
    if (now - lastRedirectAt < REDIRECT_COOLDOWN_MS) {
      return;
    }

    const failedRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (failedRoute && failedRoute !== "/network-error") {
      sessionStorage.setItem(LAST_FAILED_ROUTE_KEY, failedRoute);
    }
    sessionStorage.setItem(LAST_REDIRECT_AT_KEY, String(now));
    window.location.href = "/network-error";
  }
};

/**
 * Shared axios instance that:
 * 1. Sends cookies (`withCredentials: true`) — works on desktop browsers.
 * 2. Attaches an Authorization header from localStorage — works on mobile
 *    browsers that block third-party / cross-site cookies.
 */
const axiosInstance = axios.create({
  withCredentials: true, // still send cookies when the browser allows it
  timeout: 20000,
});

// ---- request interceptor: attach Bearer token ----
axiosInstance.interceptors.request.use(
  (config) => {
    const requestUrl = config.url || "";
    const isPublicAuthRoute =
      requestUrl.includes("/user/login") ||
      requestUrl.includes("/user/send-otp") ||
      requestUrl.includes("/user/verify-otp") ||
      requestUrl.includes("/user/reset-password");

    const token = localStorage.getItem("authToken");
    if (token && !isPublicAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (isPublicAuthRoute) {
      // Avoid credentialed CORS for public auth routes.
      config.withCredentials = false;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- response interceptor: handle errors ----
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetworkFailure =
      !error.response &&
      (error.code === "ERR_NETWORK" ||
        error.message === "Network Error" ||
        error.message?.includes("ECONNREFUSED"));
    const isHardConnectionRefused = error.message?.includes("ECONNREFUSED");

    // Redirect only when actually offline or server is unreachable/refused.
    if (isNetworkFailure && (isOffline() || isHardConnectionRefused)) {
      redirectToNetworkError();
    }

    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
