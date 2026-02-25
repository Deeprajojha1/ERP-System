import axiosInstance from "../../utils/axiosInstance";

export const getAllStudentsApi = async () => {
  const { data } = await axiosInstance.get("/admin/students");
  return data.students || data;
};

export const getStudentByEnrollmentApi = async (enrollmentNumber) => {
  const response = await axiosInstance.get(
    `/api/hostel-allocation/student/${encodeURIComponent(enrollmentNumber)}`
  );
  return response.data;
};
