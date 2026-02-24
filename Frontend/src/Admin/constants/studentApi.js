import axiosInstance from "../../utils/axiosInstance";

export const getAllStudentsApi = async () => {
  const { data } = await axiosInstance.get("/admin/students");
  return data.students || data;
};
