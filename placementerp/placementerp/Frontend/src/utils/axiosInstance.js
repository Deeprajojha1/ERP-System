import axios from "axios";

const LAST_FAILED_ROUTE_KEY = "lastFailedRoute";
const LAST_REDIRECT_AT_KEY = "lastNetworkRedirectAt";
const REDIRECT_COOLDOWN_MS = 2500;
const OFFLINE_REDIRECT_DELAY_MS = 1500;
let pendingOfflineRedirect = null;
const getStoredAuthToken = () => {
  if (typeof window === "undefined") return "";
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  return String(token).trim();
};
const isPublicAuthRoute = (url = "") =>
  url.includes("/user/login") ||
  url.includes("/user/send-otp") ||
  url.includes("/user/verify-otp") ||
  url.includes("/user/reset-password");
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
    // Keep sending cookies and also attach bearer token fallback.
    const token = getStoredAuthToken();
    if (token) {
      config.headers = config.headers || {};
      if (!config.headers.Authorization && !config.headers.authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const skipNetworkRedirect = Boolean(error.config?.skipNetworkRedirect);
    const isNetworkFailure =
      !error.response &&
      (error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED" ||
        error.message === "Network Error" ||
        error.message?.includes("ECONNREFUSED"));
    const isHardConnectionRefused = error.message?.includes("ECONNREFUSED");
    const requestUrl = error.config?.url || "";
    const isAuthRoute = isPublicAuthRoute(requestUrl);

    if (
      !skipNetworkRedirect &&
      isNetworkFailure &&
      !isAuthRoute &&
      (isOffline() || isHardConnectionRefused || error.code === "ERR_NETWORK")
    ) {
      redirectToNetworkError();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
