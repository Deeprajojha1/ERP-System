import axiosInstance from "../../utils/axiosInstance";

export const updateWardenApi = async (id, payload) => {
  const response = await axiosInstance.patch(`/api/admin/warden/${id}`, payload);
  return response.data;
};

export const deleteWardenApi = async (id) => {
  const response = await axiosInstance.delete(`/api/admin/warden/${id}`);
  return response.data;
};
