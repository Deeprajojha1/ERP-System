import { useEffect } from "react";
import axios from "../../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { setUserData, clearUserData } from "../../redux/userSlice";
import { clearStudents } from "../../redux/studentSlice";
import { clearFaculty } from "../../redux/facultySlice";

const useGetCurrentUser = () => {
    const dispatch = useDispatch();
    const userData = useSelector((state) => state.user.userData);
    const apiBase = useSelector((state) => state.config.apiBase);
    
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${apiBase}/user/me`, {
                    withCredentials: true,
                });
                console.log("Fetched user data:", res.data);
                dispatch(setUserData(res.data));

            } catch (error) {
                console.log("Get Current User Error:", error.response?.data || error.message);
                const status = error.response?.status;
                if (status !== 401 && status !== 403) {
                    toast.error(error.response?.data?.message || "Failed to fetch current user", {
                        icon: "\u274C",
                    });
                }
                // Clear all cached data if token is invalid/expired
                dispatch(clearUserData());
                dispatch(clearStudents());
                dispatch(clearFaculty());
            }
        };
        fetchUser();

    }, [dispatch, apiBase]);
};

export default useGetCurrentUser;
