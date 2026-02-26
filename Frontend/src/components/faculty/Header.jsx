import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import { clearUserData } from "../../redux/userSlice";
import { clearStudents } from "../../redux/studentSlice";
import { clearFaculty } from "../../redux/facultySlice";
import { clearLeaves } from "../../redux/leavesSlice";
import { clearTimetable } from "../../redux/timetableSlice";
import NetworkSpeedBadge from "../common/NetworkSpeedBadge";

function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const apiBase = useSelector((state) => state.config.apiBase);

  const handleLogout = async () => {
    try {
      await axios.post(`${apiBase}/user/logout`, {});
      toast.success("✅ Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error.message);
      toast.error(`❌ ${error.response?.data?.message || "Logout failed"}`);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      dispatch(clearUserData());
      dispatch(clearStudents());
      dispatch(clearFaculty());
      dispatch(clearLeaves());
      dispatch(clearTimetable());
      sessionStorage.removeItem("lastFailedRoute");
      sessionStorage.removeItem("lastNetworkRedirectAt");
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-white via-sky-50 to-blue-50 px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-cyan-600 font-bold text-white">FP</span>
        <div>
          <p className="m-0 text-base font-bold text-slate-900">Faculty Portal</p>
          <p className="m-0 text-xs text-slate-500">Attendance & Course Hub</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NetworkSpeedBadge />
        <button
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
