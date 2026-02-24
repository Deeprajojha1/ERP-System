import axiosInstance from "../../utils/axiosinstance";

export const allocateStudentApi = async (data) => {
  const response = await axiosInstance.post(
    "/api/hostel-allocation/allocate",
    data
  );
  return response.data;
};

export const vacateStudentApi = async (studentId) => {
  const response = await axiosInstance.post(
    "/api/hostel-allocation/vacate",
    { studentId }
  );
  return response.data;
};