import axiosInstance from "../../utils/axiosInstance";

export const getHostelSummaryApi = async () => {
  const response = await axiosInstance.get(
    "/api/hostels/summary/dashboard"
  );
  return response.data;
};

export const createHostelApi = async (data) => {
  const response = await axiosInstance.post(
    "/api/hostels",
    data
  );
  return response.data;
};

export const updateHostelApi = async (id, data) => {
  const response = await axiosInstance.put(`/api/hostels/${id}`, data);
  return response.data;
};

export const deleteHostelApi = async (id) => {
  const response = await axiosInstance.delete(`/api/hostels/${id}`);
  return response.data;
};
