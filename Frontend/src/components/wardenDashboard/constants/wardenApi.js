import axiosInstance from "../../../utils/axiosInstance";

export const getWardenOutpassesApi = async (params = {}) => {
  const response = await axiosInstance.get("/api/warden/outpasses", { params });
  return response.data;
};

export const updateWardenOutpassApi = async (id, payload) => {
  const response = await axiosInstance.patch(`/api/warden/outpasses/${id}`, payload);
  return response.data;
};

export const getWardenTodayOutpassesApi = async () => {
  const response = await axiosInstance.get("/api/warden/outpasses/today");
  return response.data;
};

export const scanWardenOutpassQrApi = async (payload) => {
  const response = await axiosInstance.post("/api/warden/outpasses/scan", payload);
  return response.data;
};

export const getGateSecurityOutpassApi = async (params = {}) => {
  const response = await axiosInstance.get("/api/gate-security/outpasses", { params });
  return response.data;
};

export const scanGateSecurityOutpassQrApi = async (payload) => {
  const response = await axiosInstance.post("/api/gate-security/outpasses/scan", payload);
  return response.data;
};

export const getWardenComplaintsApi = async (params = {}) => {
  const response = await axiosInstance.get("/api/warden/complaints", { params });
  return response.data;
};

export const updateWardenComplaintApi = async (id, payload) => {
  const response = await axiosInstance.patch(`/api/warden/complaints/${id}`, payload);
  return response.data;
};

export const getWardenRoomsApi = async () => {
  const response = await axiosInstance.get("/api/warden/rooms");
  return response.data;
};

export const updateWardenRoomStatusApi = async (roomId, payload) => {
  const response = await axiosInstance.patch(`/api/warden/rooms/${roomId}/status`, payload);
  return response.data;
};

export const getWardenStudentsApi = async () => {
  const response = await axiosInstance.get("/api/warden/students");
  return response.data;
};

export const getWardenAlertsApi = async (params = {}) => {
  const response = await axiosInstance.get("/api/warden/alerts", { params });
  return response.data;
};

export const createWardenStudentAlertApi = async (payload) => {
  const response = await axiosInstance.post("/api/warden/student-alerts", payload);
  return response.data;
};

export const getWardenStudentAlertsApi = async (params = {}) => {
  const response = await axiosInstance.get("/api/warden/student-alerts", { params });
  return response.data;
};

export const createWardenSupportTicketApi = async (payload) => {
  const response = await axiosInstance.post("/api/warden/support-tickets", payload);
  return response.data;
};

export const getWardenSupportTicketsApi = async (params = {}) => {
  const response = await axiosInstance.get("/api/warden/support-tickets", { params });
  return response.data;
};

export const getWardenStudentOutpassHistoryApi = async (studentId) => {
  const response = await axiosInstance.get("/api/warden/outpasses", { params: { studentId } });
  return response.data;
};

export const getWardenStudentComplaintHistoryApi = async (studentId) => {
  const response = await axiosInstance.get("/api/warden/complaints", { params: { studentId } });
  return response.data;
};
