import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearUserData } from "../../redux/userSlice";
import { LogOut, RefreshCw } from "lucide-react";
import AlertNotifications from "../common/AlertNotifications";

export default function NavBar({ facultyData, onRefresh }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    dispatch(clearUserData());
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleRefresh = async () => {
    if (onRefresh && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const getInitials = (name) => {
    if (!name) return "FA";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const facultyName = facultyData?.user?.name || "Faculty";
  const departmentName = facultyData?.facultyDetails?.department?.name || "Department";

  return (
    <nav className="faculty-navbar">
      <div className="faculty-navbar-left">
        <h2 className="faculty-navbar-name">{facultyName}</h2>
        <p className="faculty-navbar-dept">{departmentName}</p>
      </div>
      <div className="faculty-navbar-right">
        {onRefresh && (
          <button 
            onClick={handleRefresh} 
            className="faculty-navbar-btn"
            title="Refresh data"
            disabled={refreshing}
          >
            <RefreshCw size={20} className={refreshing ? "spinning" : ""} />
          </button>
        )}
        <AlertNotifications />
        <button onClick={handleLogout} className="faculty-logout-btn">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
        <div className="faculty-avatar">
          {getInitials(facultyName)}
        </div>
      </div>
    </nav>
  );
}