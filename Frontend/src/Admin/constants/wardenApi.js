import axiosInstance from "../../utils/axiosInstance";

export const deleteWardenApi = async (id) => {
  const response = await axiosInstance.delete(`/api/admin/warden/${id}`);
  return response.data;
};
