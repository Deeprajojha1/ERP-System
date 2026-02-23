import { useEffect, useState } from "react";
import axios from "../../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { setUserData, clearUserData } from "../../redux/userSlice";
import { clearStudents } from "../../redux/studentSlice";
import { clearFaculty } from "../../redux/facultySlice";
import { clearLeaves } from "../../redux/leavesSlice";
import { clearTimetable } from "../../redux/timetableSlice";

const useGetCurrentUser = () => {
    const dispatch = useDispatch();
    const userData = useSelector((state) => state.user.userData);
    const apiBase = useSelector((state) => state.config.apiBase);
    const [authResolved, setAuthResolved] = useState(() => Boolean(userData));
    
    useEffect(() => {
        let isMounted = true;
        const markResolved = () => {
            if (isMounted) setAuthResolved(true);
        };

        if (!apiBase) {
            markResolved();
            return () => {
                isMounted = false;
            };
        }
        if (typeof window !== "undefined" && window.location.pathname === "/network-error") {
            markResolved();
            return () => {
                isMounted = false;
            };
        }
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${apiBase}/user/me`, {
                    withCredentials: true,
                });
                console.log("Fetched user data:", res.data);
                dispatch(setUserData(res.data));

            } catch (error) {
                const status = error.response?.status;
                if (status !== 401 && status !== 403) {
                    console.log("Get Current User Error:", error.response?.data || error.message);
                }
                const isNetworkFailure =
                    !error.response &&
                    (
                        error.code === "ERR_NETWORK" ||
                        error.message === "Network Error" ||
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
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("authToken");
                        localStorage.removeItem("token");
                    }
                    dispatch(clearUserData());
                    dispatch(clearStudents());
                    dispatch(clearFaculty());
                    dispatch(clearLeaves());
                    dispatch(clearTimetable());
                }
            } finally {
                markResolved();
            }
        };
        fetchUser();

        return () => {
            isMounted = false;
        };
    }, [dispatch, apiBase]);

    return authResolved;
};

export default useGetCurrentUser;
