import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { clearUserData } from "../../redux/userSlice";
import { clearStudents } from "../../redux/studentSlice";
import { clearFaculty } from "../../redux/facultySlice";
import "./Header.css";

function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user.userData);
  const apiBase = useSelector((state) => state.config.apiBase);
  const user = userData?.user;
  const roleDetails = userData?.roleDetails;
  const name = user?.name || "Faculty";
  const designation = roleDetails?.designation || "Faculty";

  const handleLogout = async () => {
    try {
      await axios.post(
        `${apiBase}/user/logout`,
        {},
        { withCredentials: true }
      );
      toast.success("✅ Logged out successfully");
    } catch (error) {
      console.error(
        "Logout failed:",
        error.response?.data || error.message
      );
      toast.error(`❌ ${error.response?.data?.message || "Logout failed"}`);
    } finally {
      dispatch(clearUserData());
      dispatch(clearStudents());
      dispatch(clearFaculty());
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark">FP</span>
        <div>
          <p className="brand-title">Faculty Portal</p>
          <p className="brand-subtitle">Attendance & Course Hub</p>
        </div>
      </div>
      <div className="header-meta">
        <div className="chip">Spring 2026</div>
        <div className="chip muted">
          {name} - {designation}
        </div>
        <button className="chip logout-chip" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
