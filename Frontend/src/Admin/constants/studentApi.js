import axiosInstance from "../../utils/axioInstance";

export const getAllStudentsApi = async () => {
  const { data } = await axiosInstance.get("/admin/students");
  return data.students || data;
};