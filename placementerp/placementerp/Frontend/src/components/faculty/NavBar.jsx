import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearUserData } from "../../redux/userSlice";
import { clearFacultyDashboard, selectIsSidebarOpen } from "../../redux/facultyDashboardSlice";
import { BookOpen } from "lucide-react";
import { ClipLoader } from "react-spinners";
import AlertNotifications from "../common/AlertNotifications";
import NetworkSpeedBadge from "../common/NetworkSpeedBadge";

export default function NavBar({ facultyData }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loggingOut, setLoggingOut] = useState(false);
  const facultyName = facultyData?.user?.name || "Faculty";
  const isSidebarOpen = useSelector(selectIsSidebarOpen);

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
    <nav className="faculty-nav">
      <div className="faculty-nav-left">
        <div className="faculty-nav-brand">
          <div className="faculty-brand-icon">
            <BookOpen size={24} />
          </div>
          <div className="faculty-brand-copy">
            <h1>Faculty ERP</h1>
            <p>{facultyName}</p>
          </div>
        </div>
      </div>

      <div className="faculty-nav-right">
        <NetworkSpeedBadge />

        {/* Refresh button removed */}

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="faculty-logout-btn"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ClipLoader size={16} color="#1e293b" />
          ) : (
            <>Logout</>
          )}
        </button>

        {/* Notifications */}
        <div className="faculty-nav-notifications">
          <AlertNotifications />
        </div>
      </div>
    </nav>
  );
}
