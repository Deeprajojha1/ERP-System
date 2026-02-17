import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearUserData } from "../../redux/userSlice";
import { Bell, LogOut } from "lucide-react";

export default function NavBar({ facultyData }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(clearUserData());
    localStorage.removeItem("token");
    navigate("/login");
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
        <button className="faculty-navbar-btn">
          <Bell size={20} />
        </button>
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
