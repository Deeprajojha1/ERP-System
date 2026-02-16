import axios from "axios";

const MIN_NETWORK_SPEED_MBPS = 0.512; // 512 kbps

const getConnection = () => {
  if (typeof navigator === "undefined") return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

const isBelowMinimumSpeed = () => {
  if (typeof navigator === "undefined") return false;
  if (!navigator.onLine) return true;

  const connection = getConnection();
  const downlink = connection?.downlink;
  const effectiveType = (connection?.effectiveType || "").toLowerCase();

  if (typeof downlink === "number") {
    return downlink < MIN_NETWORK_SPEED_MBPS;
  }

  // Fallback heuristic for browsers that expose only effectiveType.
  return effectiveType === "slow-2g" || effectiveType === "2g";
};

const redirectToNetworkError = () => {
  if (
    typeof window !== "undefined" &&
    window.location.pathname !== "/network-error"
  ) {
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
  timeout: 10000,
});

// ---- request interceptor: attach Bearer token ----
axiosInstance.interceptors.request.use(
  (config) => {
    if (isBelowMinimumSpeed()) {
      redirectToNetworkError();
      const slowNetworkError = new Error(
        "Network speed is below minimum required threshold."
      );
      slowNetworkError.code = "ERR_NETWORK_SLOW";
      return Promise.reject(slowNetworkError);
    }

    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
        error.code === "ERR_NETWORK_SLOW" ||
        error.code === "ECONNABORTED" ||
        error.message === "Network Error" ||
        error.message?.toLowerCase().includes("timeout") ||
        error.message?.includes("ECONNREFUSED"));

    // Redirect to network error page for offline/slow network failures.
    if (isNetworkFailure) {
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
