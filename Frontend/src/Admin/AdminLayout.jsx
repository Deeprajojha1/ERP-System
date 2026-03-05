import React, { useEffect, useState } from "react";
import { MdCastForEducation } from "react-icons/md";
import { useSelector } from "react-redux";
import { MdDashboardCustomize } from "react-icons/md";
import { GoOrganization } from "react-icons/go";
import { GiTeacher } from "react-icons/gi";
import { PiStudentFill } from "react-icons/pi";
import { GiJusticeStar } from "react-icons/gi";
import { MdOutlineSchedule } from "react-icons/md";
import { PiExamFill } from "react-icons/pi";
import { VscOutput } from "react-icons/vsc";
import { TbReportSearch } from "react-icons/tb";
import { MdRecordVoiceOver } from "react-icons/md";
import { GiKoholintEgg } from "react-icons/gi";
import { LuBadgeIndianRupee } from "react-icons/lu";
import {
  FiBell,
  FiBookOpen,
  FiHome,
  FiSettings,
  FiChevronDown,
  FiLayers,
  FiPercent,
  FiFileText,
  FiClock,
  FiTrendingUp,
  FiCreditCard,
  FiCalendar,
  FiBriefcase,
  FiLifeBuoy,
} from "react-icons/fi";
import { useDispatch } from "react-redux";
import axios from "../utils/axiosInstance";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import NetworkSpeedBadge from "../components/common/NetworkSpeedBadge";
import toast from "react-hot-toast";
import { clearUserData } from "../redux/userSlice";
import { clearStudents } from "../redux/studentSlice";
import { clearFaculty } from "../redux/facultySlice";
import { clearDepartments } from "../redux/departmentSlice";
import {
  clearLeaves,
  fetchAdminLeaves,
  selectPendingAdminLeavesCount,
} from "../redux/leavesSlice";
import { clearTimetable } from "../redux/timetableSlice";
import { clearFeeState } from "../redux/feeSlice";
import collegeLogo from "../assets/college_47233.jpg";
import "./AdminHome.css";
import Leaves from "./Leaves";

const FEE_MENU_SECTIONS = [
  {
    label: "DASHBOARD",
    items: [
      {
        label: "Fee Dashboard",
        paths: ["/admin/fees"],
        Icon: MdDashboardCustomize,
      },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [
      {
        label: "Fee Structure",
        paths: ["/admin/fees/structure", "/admin/fees/academic"],
        Icon: FiLayers,
      },
      {
        label: "Discounts & Scholarships",
        paths: ["/admin/fees/discounts", "/admin/fees/others"],
        Icon: FiPercent,
      },
      {
        label: "Payment Methods",
        paths: ["/admin/fees/payment-methods"],
        Icon: FiCreditCard,
      },
      {
        label: "Academic Calendar",
        paths: ["/admin/fees/academic-calendar"],
        Icon: FiCalendar,
      },
    ],
  },
  {
    label: "STUDENT MANAGEMENT",
    items: [
      {
        label: "Student Fee Mapping",
        paths: ["/admin/fees/mapping"],
        matchChildren: false,
        Icon: PiStudentFill,
      },
      {
        label: "Student Records",
        paths: ["/admin/fees/records"],
        matchChildren: false,
        Icon: FiBookOpen,
      },
      {
        label: "Bulk Operations",
        paths: ["/admin/fees/bulk"],
        matchChildren: false,
        Icon: LuBadgeIndianRupee,
      },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      {
        label: "Reports Hub",
        paths: ["/admin/fees/reports"],
        Icon: FiFileText,
      },
      {
        label: "Financial Analytics",
        paths: ["/admin/fees/financial"],
        Icon: FiClock,
      },
      {
        label: "Student Analytics",
        paths: ["/admin/fees/student-analytics"],
        Icon: FiTrendingUp,
      },
    ],
  },
];

const isFeePath = (pathname = "") =>
  FEE_MENU_SECTIONS.some((section) =>
    section.items.some((item) =>
      item.paths.some((path) => pathname.startsWith(path))
    )
  );

const buildProfileImageUrl = (apiBase, fileUrl, fileName) => {
  const backendBase = String(apiBase || "").replace(/\/api\/?$/, "");

  if (fileUrl) {
    if (fileUrl.startsWith("http") || fileUrl.startsWith("data:")) return fileUrl;
    return `${backendBase}${fileUrl}`;
  }

  if (!fileName) return null;
  if (fileName.startsWith("http") || fileName.startsWith("data:")) return fileName;

  const normalizedFileName = String(fileName)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${backendBase}/uploads/profile-images/${normalizedFileName}`;
};

const AdminLayout = () => {
  const userData = useSelector((state) => state.user.userData);
  const apiBase = useSelector((state) => state.config.apiBase);
  const leaveRequestCount = useSelector(selectPendingAdminLeavesCount);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth >= 769
  );
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isFeeMenuOpen, setIsFeeMenuOpen] = useState(() =>
    isFeePath(location.pathname)
  );
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);
  const userName = userData?.user?.name || "Admin User";
  const userEmail = userData?.user?.email || "admin@university.edu";
  const userImg = buildProfileImageUrl(
    apiBase,
    userData?.user?.profileImageUrl,
    userData?.user?.profileImage
  );
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const hasLeaveAlerts = leaveRequestCount > 0;
  const isFeeRouteActive = isFeePath(location.pathname);
  const defaultFeeRoute =
    FEE_MENU_SECTIONS[0]?.items?.[0]?.paths?.[0] || "/admin/fees";

  const pathMatches = (targetPath, allowChildren = true) => {
    if (!targetPath) return false;
    if (location.pathname === targetPath) return true;
    if (!allowChildren) return false;
    return location.pathname.startsWith(`${targetPath}/`);
  };

  useEffect(() => {
    if (!apiBase || userData?.user?.role !== "admin") return;
    if (!location.pathname.startsWith("/admin/leaves")) return;

    dispatch(fetchAdminLeaves());
    const intervalId = setInterval(() => {
      dispatch(fetchAdminLeaves());
    }, 60000);

    return () => clearInterval(intervalId);
  }, [apiBase, userData?.user?.role, location.pathname, dispatch]);

  useEffect(() => {
    if (isFeeRouteActive) {
      setIsFeeMenuOpen(true);
    }
  }, [isFeeRouteActive]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [userImg]);

  const handleFeesButtonClick = () => {
    setIsFeeMenuOpen((prev) => !prev);
    if (!isFeeRouteActive) {
      navigate(defaultFeeRoute);
    }
  };

  const isFeesButtonActive =
    isFeeRouteActive || (isFeeMenuOpen && pathMatches(defaultFeeRoute));

  const handleLogout = async () => {
    try {
      await axios.post(
        `${apiBase}/user/logout`,
        {},
        { withCredentials: true }
      );
      toast.success("Logged out successfully");
    } catch (error) {
      console.error(
        "Logout failed:",
        error.response?.data || error.message
      );
      toast.error(`${error.response?.data?.message || "Logout failed"}`);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      dispatch(clearUserData());
      dispatch(clearStudents());
      dispatch(clearFaculty());
      dispatch(clearDepartments());
      dispatch(clearLeaves());
      dispatch(clearTimetable());
      dispatch(clearFeeState());
      sessionStorage.removeItem("lastFailedRoute");
      sessionStorage.removeItem("lastNetworkRedirectAt");
      navigate("/", { replace: true });
    }
  };

  return (
    <>
      <nav className="admin-nav">
        <div className="admin-left">
          <div className="admin-nav-brand" onClick={() => navigate("/admin/dashboard")}>
            <div className="admin-brand-icon">
              <img
                className="college-img"
                src={collegeLogo}
                alt="college-logo"
              />
            </div>
            <div className="admin-brand-copy">
              <h1>ERP Admin</h1>
              <p>Management Portal</p>
            </div>
          </div>
        </div>
        <div className="admin-right">
          <NetworkSpeedBadge />
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
          <button
            className="admin-leave-alert"
            type="button"
            onClick={() => navigate("/admin/leaves")}
            aria-label={
              hasLeaveAlerts
                ? `Faculty leave alerts: ${leaveRequestCount}`
                : "Faculty leave alerts"
            }
            title={
              hasLeaveAlerts
                ? `Pending leave requests: ${leaveRequestCount}`
                : "Faculty leave alerts"
            }
          >
            <FiBell />
            {hasLeaveAlerts && (
              <span className="admin-leave-badge">{leaveRequestCount}</span>
            )}
          </button>
        </div>
      </nav>

      {!isSidebarOpen && (
        <button
          className="admin-menu-btn admin-menu-float"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
          aria-expanded={isSidebarOpen}
        >
          <svg
            className="sidebar-toggle-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
                d="M4 7h16M4 12h16M4 17h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <div
        className={`admin-layout ${
          isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
      >
        <div className="admin-layout-bg" aria-hidden="true" />
        <div
          className={`admin-overlay ${isSidebarOpen ? "show" : ""}`}
          onClick={() => setIsSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />

        {/* ===== SIDEBAR ===== */}
        <div className="admin-sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-profile-main">
              <div className="sidebar-avatar">
                {userImg && !avatarLoadFailed ? (
                  <img
                    src={userImg}
                    alt="User"
                    className="avatarimg"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  userInitials || "AD"
                )}
              </div>
              <div className="sidebar-profile-copy">
                <h2>{userName}</h2>
                <p>{userEmail}</p>
              </div>
            </div>
            <button
              className="sidebar-close sidebar-profile-close"
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <svg
                className="sidebar-toggle-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="sidebar-menu-scroll">
            <div className="sidebar-header">
              <span className="sidebar-title">Menu</span>
            </div>
            <div className="sidebar-section">
              <label className="sidebar-label">DASHBOARD</label>
              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/dashboard") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/dashboard");
                }}
              >
                <MdDashboardCustomize />
                <span className="sidebar-text">Dashboard</span>
              </button>
            </div>

            <div className="sidebar-section">
              <label className="sidebar-label">MANAGEMENT</label>
              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/department") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/department");
                }}
              >
                <GoOrganization />
                <span className="sidebar-text">Department</span>
              </button>

              <button type="button" className={`sidebar-btn ${isActive("/admin/faculty") ? "active" : ""}`} onClick={() => {
                  navigate("/admin/faculty");
                }}>
                <GiTeacher />
                <span className="sidebar-text">Faculty</span>
              </button>

              <button type="button" className={`sidebar-btn ${isActive("/admin/student") ? "active" : ""}`} onClick={() => {
                  navigate("/admin/student");
                }}>
                <PiStudentFill />
                <span className="sidebar-text">Students</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/student-discipline") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/student-discipline");
                }}
              >
                <PiStudentFill />
                <span className="sidebar-text">Student Discipline</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/student-id-cards") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/student-id-cards");
                }}
              >
                <PiStudentFill />
                <span className="sidebar-text">Student ID Cards</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/hostel") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/hostel");
                }}
              >
                <FiHome />
                <span className="sidebar-text">Hostel</span>
              </button>
            </div>

            <div className="sidebar-section">
              <label className="sidebar-label">ACADEMICS</label>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/courses") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/courses");
                }}
              >
                <MdCastForEducation />
                <span className="sidebar-text">Courses</span>
              </button>

              <button
                className={`sidebar-btn ${isActive("/admin/groups") ? "active" : ""}`}
                type="button"
                onClick={() => {
                  navigate("/admin/groups");
                }}
              >
                <GiJusticeStar />
                <span className="sidebar-text">Groups</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/classrooms") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/classrooms");
                }}
              >
                <FiLayers />
                <span className="sidebar-text">Classrooms</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/assignment") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/assignment");
                }}
              >
                <MdCastForEducation />
                <span className="sidebar-text">Assignments</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/timetable") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/timetable");
                }}
              >
                <MdOutlineSchedule />
                <span className="sidebar-text">Timetable</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/exam") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/exam");
                }}
              >
                <PiExamFill />
                <span className="sidebar-text">Exams</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/exam-blueprint") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/exam-blueprint");
                }}
              >
                <PiExamFill />
                <span className="sidebar-text">Exam Blueprint</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/result") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/result");
                }}
              >
                <VscOutput />
                <span className="sidebar-text">Results</span>
              </button>
            </div>

            <div className="sidebar-section">
              <label className="sidebar-label">OPERATIONS</label>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/attendance") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/attendance");
                }}
              >
                <MdRecordVoiceOver />
                <span className="sidebar-text">Attendance</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/leaves") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/leaves");
                }}
              >
                <GiKoholintEgg />
                <span className="sidebar-text">Leaves</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${
                  isActive("/admin/placement/jobs") || isActive("/admin/external-jobs")
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  navigate("/admin/placement/jobs");
                }}
              >
                <FiBriefcase />
                <span className="sidebar-text">Placement Jobs</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${
                  isActive("/admin/placement/applications") ||
                  isActive("/admin/external-job-applications")
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  navigate("/admin/placement/applications");
                }}
              >
                <FiBriefcase />
                <span className="sidebar-text">Placement Applications</span>
              </button>

              <div
                className={`sidebar-dropdown ${
                  isFeeRouteActive ? "open" : ""
                }`}
              >
                <button
                  type="button"
                  className={`sidebar-btn sidebar-dropdown-toggle ${
                    isFeesButtonActive ? "active" : ""
                  }`}
                  onClick={handleFeesButtonClick}
                  aria-expanded={isFeeMenuOpen}
                >
                  <LuBadgeIndianRupee />
                  <span className="sidebar-text">Fees</span>
                  <FiChevronDown className="sidebar-dropdown-caret" />
                </button>

                <div
                  className={`sidebar-submenu ${isFeeMenuOpen ? "show" : ""}`}
                >
                  {FEE_MENU_SECTIONS.map((section) => (
                    <div
                      className="sidebar-submenu-section"
                      key={section.label}
                    >
                      <span className="sidebar-subtitle">{section.label}</span>
                      {section.items.map((item) => {
                        const allowChildren = item.matchChildren !== false;
                        const active = item.paths.some((path) =>
                          pathMatches(path, allowChildren)
                        );
                        const Icon = item.Icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            className={`sidebar-subitem ${
                              active ? "active" : ""
                            }`}
                            onClick={() => navigate(item.paths[0])}
                            data-muted={section.label === "DASHBOARD"}
                          >
                            <Icon />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <label className="sidebar-label">SYSTEM</label>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/alerts") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/alerts");
                }}
              >
                <FiBell />
                <span className="sidebar-text">Alerts</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/warden-support-tickets") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/warden-support-tickets");
                }}
              >
                <FiLifeBuoy />
                <span className="sidebar-text">Warden Support</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/general-support") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/general-support");
                }}
              >
                <TbReportSearch />
                <span className="sidebar-text">General Reports</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/faculty-lecture-report") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/faculty-lecture-report");
                }}
              >
                <TbReportSearch />
                <span className="sidebar-text">Faculty Lecture Report</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/subject-attendance") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/subject-attendance");
                }}
              >
                <TbReportSearch />
                <span className="sidebar-text">Subject Attendance</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/teaching-load") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/teaching-load");
                }}
              >
                <TbReportSearch />
                <span className="sidebar-text">Teaching Load</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/library") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/library");
                }}
              >
                <FiBookOpen />
                <span className="sidebar-text">Library</span>
              </button>

              <button
                type="button"
                className={`sidebar-btn ${isActive("/admin/settings") ? "active" : ""}`}
                onClick={() => {
                  navigate("/admin/settings");
                }}
              >
                <FiSettings />
                <span className="sidebar-text">Settings</span>
              </button>
            </div>
          </div>

        </div>

        {/* ===== CONTENT ===== */}
        <div className="admin-content">
          {location.pathname.endsWith("/leaves") ? (
            <Leaves />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
