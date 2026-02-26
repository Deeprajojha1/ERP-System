import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearUserData } from "../../redux/userSlice";
import { clearFacultyDashboard } from "../../redux/facultyDashboardSlice";
import { BookOpen } from "lucide-react";
import { ClipLoader } from "react-spinners";
import AlertNotifications from "../common/AlertNotifications";
import NetworkSpeedBadge from "../common/NetworkSpeedBadge";

export default function NavBar({ facultyData }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loggingOut, setLoggingOut] = useState(false);
  const facultyName = facultyData?.user?.name || "Faculty";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      dispatch(clearUserData());
      dispatch(clearFacultyDashboard());
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  

  return (
    <nav className="fixed left-0 right-0 top-0 z-[90] flex h-[74px] w-full items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 text-gray-800 shadow-[0_6px_18px_rgba(15,23,42,0.06)] backdrop-blur md:gap-3 md:px-[18px]">
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex cursor-pointer items-center gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-cyan-600 text-white sm:h-[46px] sm:w-[46px]">
            <BookOpen size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="m-0 text-[15px] font-bold leading-tight text-slate-900 sm:text-base">Faculty ERP</h1>
            <p className="mt-0.5 hidden text-xs text-slate-500 min-[420px]:block">{facultyName}</p>
          </div>
        </div>
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-2">
        <NetworkSpeedBadge />

        {/* Refresh button removed */}

        {/* Notifications */}
        <div className="flex items-center">
          <AlertNotifications />
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white transition-colors duration-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 max-[768px]:px-3 max-[768px]:py-[7px] max-[768px]:text-[13px]"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ClipLoader size={16} color="#1e293b" />
          ) : (
            <>Logout</>
          )}
        </button>
      </div>
    </nav>
  );
}
