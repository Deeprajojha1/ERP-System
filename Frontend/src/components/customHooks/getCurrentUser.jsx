import { useEffect } from "react";
import axios from "../../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { setUserData, clearUserData } from "../../redux/userSlice";
import { clearStudents } from "../../redux/studentSlice";
import { clearFaculty } from "../../redux/facultySlice";
import { clearLeaves } from "../../redux/leavesSlice";
import { clearTimetable, selectTimetableRevision } from "../../redux/timetableSlice";

const useGetCurrentUser = () => {
    const dispatch = useDispatch();
    const apiBase = useSelector((state) => state.config.apiBase);
    const timetableRevision = useSelector(selectTimetableRevision);
    
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
                const isNetworkFailure =
                    !error.response &&
                    (
                        error.code === "ERR_NETWORK" ||
                        error.code === "ERR_NETWORK_SLOW" ||
                        error.code === "ECONNABORTED" ||
                        error.message === "Network Error" ||
                        error.message?.toLowerCase().includes("timeout") ||
                        error.message?.includes("ECONNREFUSED")
                    );
                const isOnNetworkErrorPage =
                    typeof window !== "undefined" &&
                    window.location.pathname === "/network-error";

                if (status !== 401 && status !== 403 && !isNetworkFailure && !isOnNetworkErrorPage) {
                    toast.error(error.response?.data?.message || "Failed to fetch current user", {
                        icon: "\u274C",
                    });
                }
                // Clear cached data only when auth is invalid/expired.
                if (status === 401 || status === 403) {
                    dispatch(clearUserData());
                    dispatch(clearStudents());
                    dispatch(clearFaculty());
                    dispatch(clearLeaves());
                    dispatch(clearTimetable());
                }
            }
        };
        fetchUser();

    }, [dispatch, apiBase, timetableRevision]);
};

export default useGetCurrentUser;
