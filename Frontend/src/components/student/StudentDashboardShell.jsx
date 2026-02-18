import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { PiStudentBold } from "react-icons/pi";
import {
  FiHome,
  FiUser,
  FiActivity,
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import heroImage from "../../assets/college_47233.jpg";
import NetworkSpeedBadge from "../common/NetworkSpeedBadge";
import StudentDetails from "./StudentDetails";
import AttendanceOverview from "./AttendanceOverview";
import CoursesDetails from "./CoursesDetails";
import "./StudentDashboardShell.css";

const StudentDashboardShell = ({
  resolvedStudentData,
  roleDetails,
  totalSessions,
  strongAttendanceCount,
  lowAttendanceCount,
  overallAttendance,
  attendanceData,
  coursesData,
  onCourseClick,
  onLogout,
  todayLabel,
}) => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const userData = useSelector((state) => state.user.userData);

  /* ---------- Profile Image ---------- */
  const profileImage = (() => {
    const fileUrl = userData?.user?.profileImageUrl;
    const fileName = userData?.user?.profileImage;
    const base = apiBase?.replace("/api", "") || "";
    if (fileUrl) {
      if (fileUrl.startsWith("http")) return fileUrl;
      return `${base}${fileUrl}`;
    }
    if (fileName) {
      return `${base}/uploads/profile-images/${fileName}`;
    }
    return null;
  })();

  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth >= 1024 : true)
  );

  /* ---------- Resize ---------- */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------- Section ---------- */
  const currentSection = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/dashboard/profile")) return "profile";
    if (path.includes("/dashboard/attendance")) return "attendance";
    if (path.includes("/dashboard/courses")) return "courses";
    if (path.includes("/dashboard/fees")) return "fees";
    return "home";
  }, [location.pathname]);

  /* ---------- Menu ---------- */
  const menuItems = [
    { id: "home", label: "Home", path: "/dashboard", icon: FiHome },
    { id: "profile", label: "Profile", path: "/dashboard/profile", icon: FiUser },
    { id: "attendance", label: "Attendance", path: "/dashboard/attendance", icon: FiActivity },
    { id: "courses", label: "Courses", path: "/dashboard/courses", icon: FiBookOpen },
    { id: "fees", label: "Fees", path: "/dashboard/fees", icon: FiDollarSign },
  ];

  /* ---------- Initials ---------- */
  const userInitials = (userData?.user?.name || "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  /* ---------- Fee ---------- */
  const feeSummary = useMemo(() => {
    const total =
      Number(roleDetails?.totalAcademicFee) ||
      Number(roleDetails?.fees?.academic?.total) ||
      0;
    const paid =
      Number(roleDetails?.paidAcademicFee) ||
      Number(roleDetails?.fees?.academic?.paid) ||
      0;
    return { total, paid, remaining: Math.max(total - paid, 0) };
  }, [roleDetails]);

  const formatAmount = (v) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(v) || 0);

  /* ---------- Attendance ---------- */
  const dateWiseAttendance = useMemo(() => {
    const rows = [];
    (attendanceData || []).forEach((entry) => {
      const course = entry.course || {};
      (entry.recentSessions || []).forEach((session) => {
        rows.push({
          date: session.date,
          courseCode: course.code || "N/A",
          courseName: course.courseName || "Course",
          status: session.status || "no-data",
        });
      });
    });
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    return rows;
  }, [attendanceData]);

  const handleMenuClick = (item) => {
    navigate(item.path);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  /* ---------- Render ---------- */
  const renderContent = () => {
    if (currentSection === "profile")
      return <StudentDetails studentData={resolvedStudentData} />;

    if (currentSection === "attendance")
      return (
        <section className="student-attendance-table-card">
          <h3>Date-wise Attendance</h3>
        </section>
      );

    if (currentSection === "courses")
      return (
        <CoursesDetails
          coursesData={coursesData}
          onCourseClick={onCourseClick}
        />
      );

    if (currentSection === "fees")
      return (
        <section className="student-fees-page">
          <h3>Fee Overview</h3>
          <strong>{formatAmount(feeSummary.total)}</strong>
        </section>
      );

    return (
      <section className="student-home-hero">
        <img src={heroImage} alt="Campus" />
      </section>
    );
  };

  /* ---------- JSX ---------- */
  return (
    <>
      {/* NAVBAR */}
      <header className="student-admin-nav">
        <div className="student-admin-nav-inner">
          <div className="student-admin-brand">
            <PiStudentBold />
          </div>

          <div className="student-admin-nav-right">
            <div className="student-admin-welcome">
              <span>
                Welcome,{" "}
                {resolvedStudentData?.personalInfo?.name || "Student"}
              </span>
              <small>{todayLabel}</small>
            </div>

            <NetworkSpeedBadge />

            <button
              className="student-admin-logout"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div
        className={`student-admin-layout ${
          isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
      >
        {/* REOPEN BTN */}
        {!isSidebarOpen && (
          <button
            className="student-admin-sidebar-reopen"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FiChevronRight />
          </button>
        )}

        {/* SIDEBAR */}
        <aside
          className={`student-admin-sidebar ${
            isSidebarOpen ? "open" : ""
          }`}
        >
          {/* PROFILE */}
          <div className="student-admin-sidebar-profile">
            <div className="student-admin-sidebar-profile-main">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="student-admin-sidebar-avatar-img"
                />
              ) : (
                <div className="student-admin-sidebar-avatar">
                  {userInitials}
                </div>
              )}
            </div>

            <div className="student-admin-sidebar-profile-copy">
              <h2>
                {resolvedStudentData?.personalInfo?.name}
              </h2>
              <p>
                {resolvedStudentData?.personalInfo?.email}
              </p>
            </div>

            {/* TOGGLE */}
            <button
              className="student-admin-sidebar-toggle"
              onClick={() =>
                setIsSidebarOpen((prev) => !prev)
              }
            >
              {isSidebarOpen ? (
                <FiChevronLeft />
              ) : (
                <FiChevronRight />
              )}
            </button>
          </div>

          {/* MENU */}
          <div className="student-admin-sidebar-menu-scroll">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`student-admin-sidebar-btn ${
                    currentSection === item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleMenuClick(item)}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CONTENT */}
        <main className="student-admin-content">
          {renderContent()}
        </main>
      </div>
    </>
  );
};

export default StudentDashboardShell;
