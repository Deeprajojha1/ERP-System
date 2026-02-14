import axios from "axios";

/**
 * Shared axios instance that:
 * 1. Sends cookies (`withCredentials: true`) — works on desktop browsers.
 * 2. Attaches an Authorization header from localStorage — works on mobile
 *    browsers that block third-party / cross-site cookies.
 */
const axiosInstance = axios.create({
  withCredentials: true, // still send cookies when the browser allows it
});

// ---- request interceptor: attach Bearer token ----
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- response interceptor: clear token on 401 ----
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
