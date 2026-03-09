import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiLogOut, FiMenu } from "react-icons/fi";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import "./ParentPortal.css";

const menuItems = [
  { key: "overview", label: "Overview", path: "/parent/dashboard" },
  { key: "daily-subject", label: "Daily Subject Attendance", path: "/parent/dashboard/daily-subject-attendance" },
  { key: "hostel", label: "Hostel Attendance", path: "/parent/dashboard/hostel" },
  { key: "assignments", label: "Assignments", path: "/parent/dashboard/assignments" },
  { key: "exams", label: "Exams", path: "/parent/dashboard/exams" },
  { key: "fees", label: "Fees", path: "/parent/dashboard/fees" },
];

const ParentShell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const token = String(localStorage.getItem("authToken") || localStorage.getItem("token") || "").trim();
    if (!token) {
      navigate("/parent/login", { replace: true });
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/api/parent/dashboard");
        setData(response.data || null);
      } catch (error) {
        const status = Number(error?.response?.status || 0);
        if (status === 401 || status === 403) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("token");
          localStorage.removeItem("parentStudent");
          navigate("/parent/login", { replace: true });
          return;
        }
        toast.error(error?.response?.data?.message || "Failed to fetch parent dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/api/user/logout");
    } catch {
      // Ignore logout API failure; local cleanup is enough.
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("parentStudent");
    navigate("/parent/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="parent-portal parent-portal--dashboard">
        <div className="parent-card parent-state">Loading parent dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="parent-portal parent-portal--dashboard">
        <div className="parent-card parent-state">No dashboard data found.</div>
      </div>
    );
  }

  return (
    <div className="parent-portal parent-portal--dashboard">
      <div className="parent-dashboard-head">
        <div>
          <h1>Parent Dashboard</h1>
          <p>
            {data?.student?.name || "Student"} ({data?.student?.enrollmentNumber || "N/A"})
          </p>
        </div>
        <div className="parent-head-actions">
          <div className="parent-feature-menu" ref={menuRef}>
            <button
              type="button"
              className="parent-menu-btn"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Open features menu"
              title="Menu"
            >
              <FiMenu />
            </button>
            {isMenuOpen ? (
              <div className="parent-menu-popover">
                {menuItems.map((item) => (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={`parent-menu-link ${location.pathname === item.path ? "active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={handleLogout} className="parent-logout-btn">
            <FiLogOut />
            Logout
          </button>
        </div>
      </div>

      <Outlet context={{ data }} />
    </div>
  );
};

export default ParentShell;
