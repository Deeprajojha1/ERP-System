import axiosInstance from "../../utils/axiosInstance";

export const getSingleHostelApi = async (id) => {
  const response = await axiosInstance.get(`/api/hostels/${id}`, {
    params: { noCache: true },
  });
  return response.data;
};

export const getHostelSummaryApi = async () => {
  const response = await axiosInstance.get("/api/hostels/summary/dashboard");
  return response.data;
};

export const createHostelApi = async (data) => {
  const response = await axiosInstance.post("/api/hostels", data);
  return response.data;
};

export const getHostelWardenOptionsApi = async () => {
  const response = await axiosInstance.get("/api/admin/faculty?minimal=true");
  const list = Array.isArray(response.data?.faculty) ? response.data.faculty : [];
  return list.map((faculty) => ({
    id: faculty?._id || "",
    employeeId: faculty?.employeeId || "",
    name: faculty?.user?.name || "Unknown Faculty",
    email: faculty?.user?.email || "",
  }));
};

export const updateHostelApi = async (id, data) => {
  const response = await axiosInstance.put(`/api/hostels/${id}`, data);
  return response.data;
};

export const deleteHostelApi = async (id) => {
  const response = await axiosInstance.delete(`/api/hostels/${id}`);
  return response.data;
};

export const getHostelMenuApi = async (id) => {
  const response = await axiosInstance.get(`/api/hostels/${id}/menu`);
  return response.data;
};

export const updateHostelMenuApi = async (id, payload) => {
  const response = await axiosInstance.put(`/api/hostels/${id}/menu`, payload);
  return response.data;
};

export const getHostelComplaintsApi = async (hostelId, params = {}) => {
  const response = await axiosInstance.get(`/api/hostels/${hostelId}/complaints`, {
    params,
  });
  return response.data;
};

export const updateHostelComplaintStatusApi = async (complaintId, payload) => {
  const response = await axiosInstance.patch(
    `/api/hostels/complaints/${complaintId}/status`,
    payload
  );
  return response.data;
};
