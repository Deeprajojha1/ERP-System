import axiosInstance from "../../utils/axiosInstance";

export const getRoomsByHostelApi = async (hostelId) => {
  const response = await axiosInstance.get(
    `/api/rooms/${hostelId}`
  );
  return response.data;
};

export const createRoomApi = async (data) => {
  const response = await axiosInstance.post(
    `/api/rooms`,
    data
  );
  return response.data;
};

export const updateRoomApi = async (id, data) => {
  const response = await axiosInstance.put(`/api/rooms/${id}`, data);
  return response.data;
};

export const deleteRoomApi = async (id) => {
  const response = await axiosInstance.delete(
    `/api/rooms/${id}`
  );
  return response.data;
};
