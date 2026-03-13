import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiBookOpen,
  FiClipboard,
  FiDollarSign,
  FiHome,
  FiLogOut,
  FiMapPin,
  FiMenu,
} from "react-icons/fi";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import "./ParentPortal.css";

const menuItems = [
  { key: "overview", label: "Overview", path: "/parent/dashboard", icon: FiHome },
  {
    key: "daily-subject",
    label: "Daily Attendance",
    path: "/parent/dashboard/daily-subject-attendance",
    icon: FiActivity,
  },
  { key: "hostel", label: "Hostel", path: "/parent/dashboard/hostel", icon: FiMapPin },
  { key: "assignments", label: "Assignments", path: "/parent/dashboard/assignments", icon: FiBookOpen },
  { key: "exams", label: "Exams", path: "/parent/dashboard/exams", icon: FiClipboard },
  { key: "fees", label: "Fees", path: "/parent/dashboard/fees", icon: FiDollarSign },
];

const ParentShell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth >= 1024 : true)
  );
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const token = String(localStorage.getItem("authToken") || localStorage.getItem("token") || "").trim();
    if (!token) {
      navigate("/parent/login", { replace: true });
      return;
    }

    const controller = new AbortController();

    const fetchDashboard = async () => {
      try {
        setLoadError("");
        setLoadState(ADMIN_LOAD_STATES.PENDING);
        const response = await axiosInstance.get("/api/parent/dashboard", {
          signal: controller.signal,
        });
        const nextData = response.data || null;
        setData(nextData);
        setLoadState(nextData ? ADMIN_LOAD_STATES.SUCCESS : ADMIN_LOAD_STATES.FAILURE);
        if (!nextData) {
          setLoadError("No dashboard data found.");
        }
      } catch (error) {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        const status = Number(error?.response?.status || 0);
        if (status === 401 || status === 403) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("token");
          localStorage.removeItem("parentStudent");
          navigate("/parent/login", { replace: true });
          return;
        }
        const message = error?.response?.data?.message || "Failed to fetch parent dashboard";
        setLoadError(message);
        setLoadState(ADMIN_LOAD_STATES.FAILURE);
        toast.error(message);
      }
    };

    fetchDashboard();

    return () => controller.abort();
  }, [navigate]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    []
  );

  const studentName = data?.student?.name || "Student";
  const enrollmentNumber = data?.student?.enrollmentNumber || "N/A";
  const studentEmail = data?.student?.email || "N/A";
  const userInitials = studentName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  const isMenuActive = (itemPath) => {
    if (itemPath === "/parent/dashboard") {
      return location.pathname === "/parent/dashboard";
    }
    return location.pathname.startsWith(itemPath);
  };

  const retryFetch = async () => {
    try {
      setLoadError("");
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      const response = await axiosInstance.get("/api/parent/dashboard");
      const nextData = response.data || null;
      setData(nextData);
      setLoadState(nextData ? ADMIN_LOAD_STATES.SUCCESS : ADMIN_LOAD_STATES.FAILURE);
      if (!nextData) setLoadError("No dashboard data found.");
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      if (status === 401 || status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("token");
        localStorage.removeItem("parentStudent");
        navigate("/parent/login", { replace: true });
        return;
      }
      const message = error?.response?.data?.message || "Failed to fetch parent dashboard";
      setLoadError(message);
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      toast.error(message);
    }
  };

  if (loadState === ADMIN_LOAD_STATES.INITIAL || loadState === ADMIN_LOAD_STATES.PENDING) {
    return (
      <div className="parent-portal parent-portal--dashboard">
        <div className="parent-card parent-state">
          <div className="parent-spinner" aria-hidden="true" />
          <p className="parent-state-title">Loading parent dashboard...</p>
          <p className="parent-state-subtitle">Please wait while we fetch the latest updates.</p>
        </div>
      </div>
    );
  }

  if (loadState === ADMIN_LOAD_STATES.FAILURE) {
    return (
      <div className="parent-portal parent-portal--dashboard">
        <div className="parent-card parent-state">
          <p className="parent-state-title">Unable to load dashboard</p>
          <p className="parent-state-subtitle">{loadError || "Something went wrong."}</p>
          <div className="parent-state-actions">
            <button type="button" className="parent-btn parent-btn--primary" onClick={retryFetch}>
              Retry
            </button>
            <button
              type="button"
              className="parent-btn parent-btn--ghost"
              onClick={() => navigate("/parent/login", { replace: true })}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-portal parent-portal--dashboard-shell">
      <header className="parent-dashboard-nav">
        <div className="parent-dashboard-nav-inner">
          <div className="parent-dashboard-nav-left">
            <button
              type="button"
              className="parent-dashboard-menu-toggle"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Toggle parent sidebar"
            >
              <FiMenu />
            </button>
            <div className="parent-dashboard-brand">
              <h1>Parent Desk</h1>
              <p>HU ERP PORTAL</p>
            </div>
          </div>
          <div className="parent-dashboard-nav-right">
            <div className="parent-dashboard-welcome">
              <span>Welcome {studentName}</span>
              <small>{todayLabel}</small>
            </div>
            <button type="button" onClick={handleLogout} className="parent-logout-btn">
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className={`parent-dashboard-layout ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
        {isSidebarOpen ? (
          <button
            type="button"
            className="parent-dashboard-overlay"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        ) : null}

        <aside className={`parent-dashboard-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="parent-sidebar-profile">
            <div className="parent-sidebar-avatar">{userInitials || "ST"}</div>
            <div className="parent-sidebar-profile-copy">
              <h2>{studentName}</h2>
              <p>{studentEmail}</p>
              <small>Enrollment: {enrollmentNumber}</small>
            </div>
          </div>
          <div className="parent-sidebar-menu">
            <span className="parent-sidebar-label">PARENT MENU</span>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`parent-sidebar-btn ${isMenuActive(item.path) ? "active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="parent-dashboard-content">
          <Outlet context={{ data }} />
        </main>
      </div>
    </div>
  );
};

export default ParentShell;
