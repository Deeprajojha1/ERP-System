import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { PiStudentBold } from "react-icons/pi";
import {
  FiHome,
  FiUser,
  FiActivity,
  FiBookOpen,
  FiClipboard,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiTrendingUp,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import heroImage from "../../assets/college_47233.jpg";
import NetworkSpeedBadge from "../common/NetworkSpeedBadge";
import AlertNotifications from "../common/AlertNotifications";
import StudentDetails from "./StudentDetails";
import AttendanceOverview from "./AttendanceOverview";
import CoursesDetails from "./CoursesDetails";
import StudentExamCenter from "./StudentExamCenter";
import LinkedinAnalyzer from "./linkedin/LinkedinAnalyzer";
import StudentIdCardSection from "./StudentIdCardSection";
import "./StudentDashboardShell.css";

const StudentDashboardShell = ({
  resolvedStudentData,
  roleDetails,
  totalSessions,
  overallAttendance,
  attendanceData,
  coursesData,
  onCourseClick,
  onLogout,
  todayLabel,
}) => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const userData = useSelector((state) => state.user.userData);
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth >= 1024 : true)
  );
  const [isExamFocusMode, setIsExamFocusMode] = useState(false);
  const [failedAvatarSrc, setFailedAvatarSrc] = useState(null);

  // Keep existing profile image resolution behavior.
  const profileImage = (() => {
    const fileUrl = userData?.user?.profileImageUrl;
    const fileName = userData?.user?.profileImage;
    const base = apiBase?.replace("/api", "") || "";
    if (fileUrl) {
      if (fileUrl.startsWith("http") || fileUrl.startsWith("data:")) return fileUrl;
      return `${base}${fileUrl}`;
    }
    if (fileName) {
      if (fileName.startsWith("http") || fileName.startsWith("data:")) return fileName;
      return `${base}/uploads/profile-images/${fileName}`;
    }
    return null;
  })();
  const canRenderAvatar = Boolean(profileImage && failedAvatarSrc !== profileImage);

  const studentName =
    resolvedStudentData?.personalInfo?.name ||
    userData?.user?.name ||
    "Student";
  const studentEmail =
    resolvedStudentData?.personalInfo?.email ||
    userData?.user?.email ||
    "";
  const enrolledCoursesCount = Array.isArray(coursesData) ? coursesData.length : 0;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentSection = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/dashboard/profile")) return "profile";
    if (path.includes("/dashboard/attendance")) return "attendance";
    if (path.includes("/dashboard/courses")) return "courses";
    if (path.includes("/dashboard/exams")) return "exams";
    if (path.includes("/dashboard/fees")) return "fees";
    if (path.includes("/dashboard/id-card")) return "id-card";
    if (path.includes("/dashboard/linkedin-analyzer")) return "linkedin";
    return "home";
  }, [location.pathname]);

  const menuItems = [
    { id: "home", label: "Home", path: "/dashboard", icon: FiHome },
    { id: "profile", label: "Profile", path: "/dashboard/profile", icon: FiUser },
    { id: "attendance", label: "Attendance", path: "/dashboard/attendance", icon: FiActivity },
    { id: "courses", label: "Courses", path: "/dashboard/courses", icon: FiBookOpen },
    { id: "exams", label: "Exams", path: "/dashboard/exams", icon: FiClipboard },
    { id: "fees", label: "Fees", path: "/dashboard/fees", icon: FiDollarSign },
    { id: "id-card", label: "ID Card", path: "/dashboard/id-card", icon: FiUser },
    {
      id: "linkedin",
      label: "LinkedIn AI",
      path: "/dashboard/linkedin-analyzer",
      icon: FiTrendingUp,
    },
  ];

  const userInitials = (studentName || "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  const feeSummary = useMemo(() => {
    const total =
      Number(roleDetails?.totalAcademicFee) ||
      Number(roleDetails?.fees?.academic?.total) ||
      0;
    const paid =
      Number(roleDetails?.paidAcademicFee) ||
      Number(roleDetails?.fees?.academic?.paid) ||
      0;
    const remaining = Math.max(total - paid, 0);
    return { total, paid, remaining };
  }, [roleDetails]);

  const formatAmount = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

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
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const renderHome = () => (
    <div className="student-home-stack">
      <section className="student-home-hero">
        <div className="student-home-image-wrap">
          <img src={heroImage} alt="Campus" className="student-home-image" />
        </div>
        <div className="student-home-hero-copy">
          <h3>Welcome Back</h3>
          <p>Track your attendance, courses, and fee status from one place.</p>
        </div>
      </section>

      <section className="student-fee-summary">
        <article className="student-fee-card">
          <p>Total Academic Fee</p>
          <strong>{formatAmount(feeSummary.total)}</strong>
        </article>
        <article className="student-fee-card">
          <p>Paid</p>
          <strong>{formatAmount(feeSummary.paid)}</strong>
        </article>
        <article className="student-fee-card">
          <p>Remaining</p>
          <strong>{formatAmount(feeSummary.remaining)}</strong>
        </article>
      </section>

      <AttendanceOverview
        overallAttendance={overallAttendance}
        attendanceData={attendanceData}
        studentData={resolvedStudentData}
      />
    </div>
  );

  const renderDateWiseAttendance = () => (
    <section className="student-attendance-table-card">
      <h3>Date-wise Attendance</h3>
      {dateWiseAttendance.length === 0 ? (
        <p className="student-empty-state">No date-wise attendance data available.</p>
      ) : (
        <div className="student-attendance-table-wrap">
          <table className="student-attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dateWiseAttendance.map((row, idx) => (
                <tr key={`${row.date}-${row.courseCode}-${idx}`}>
                  <td>
                    {Number.isNaN(new Date(row.date).getTime())
                      ? "N/A"
                      : new Date(row.date).toLocaleDateString("en-IN")}
                  </td>
                  <td>{row.courseCode}</td>
                  <td>{row.courseName}</td>
                  <td>
                    <span className={`attendance-chip ${row.status}`}>
                      {row.status === "present"
                        ? "Present"
                        : row.status === "absent"
                        ? "Absent"
                        : "No Data"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderFees = () => (
    <section className="student-fees-page">
      <h3>Fee Overview</h3>
      <div className="student-fee-summary">
        <article className="student-fee-card">
          <p>Total Academic Fee</p>
          <strong>{formatAmount(feeSummary.total)}</strong>
        </article>
        <article className="student-fee-card">
          <p>Paid</p>
          <strong>{formatAmount(feeSummary.paid)}</strong>
        </article>
        <article className="student-fee-card">
          <p>Remaining</p>
          <strong>{formatAmount(feeSummary.remaining)}</strong>
        </article>
      </div>
    </section>
  );

  const renderContent = () => {
    if (currentSection === "profile") {
      return <StudentDetails studentData={resolvedStudentData} />;
    }
    if (currentSection === "attendance") {
      return renderDateWiseAttendance();
    }
    if (currentSection === "courses") {
      return (
        <CoursesDetails
          coursesData={coursesData}
          roleDetails={roleDetails}
          onCourseClick={onCourseClick}
        />
      );
    }
    if (currentSection === "exams") {
      return <StudentExamCenter onExamFocusModeChange={setIsExamFocusMode} />;
    }
    if (currentSection === "fees") {
      return renderFees();
    }
    if (currentSection === "id-card") {
      return <StudentIdCardSection roleDetails={roleDetails} />;
    }
    if (currentSection === "linkedin") {
      return <LinkedinAnalyzer />;
    }
    return renderHome();
  };

  return (
    <>
      {!isExamFocusMode && (
        <header className="student-admin-nav">
          <div className="student-admin-nav-inner">
            <div className="student-admin-nav-left">
              <div className="student-admin-brand">
                <PiStudentBold className="icons circle" />
                <div className="student-admin-brand-copy">
                  <h1>Student Desk</h1>
                  <p>HU ERP Portal</p>
                </div>
              </div>
            </div>

            <div className="student-admin-nav-right">
              <div className="student-admin-welcome">
                <span>Welcome, {studentName}</span>
                <small>{todayLabel}</small>
              </div>
              <NetworkSpeedBadge />
              <AlertNotifications />
              <button className="student-admin-logout" type="button" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>
      )}
      <div
        className={`student-admin-layout ${
          isExamFocusMode ? "exam-focus-mode" : isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
      >
        {!isExamFocusMode && !isSidebarOpen && (
          <button
            type="button"
            className="student-admin-sidebar-reopen"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <FiChevronRight />
          </button>
        )}

        {!isExamFocusMode && (
          <aside
            id="student-dashboard-sidebar"
            className={`student-admin-sidebar ${isSidebarOpen ? "open" : ""}`}
          >
            <div className="student-admin-sidebar-profile">
              <div className="student-admin-sidebar-profile-main">
                {canRenderAvatar ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="student-admin-sidebar-avatar-img"
                    onError={() => setFailedAvatarSrc(profileImage)}
                  />
                ) : (
                  <div className="student-admin-sidebar-avatar">{userInitials || "ST"}</div>
                )}
                <div className="student-admin-sidebar-profile-copy">
                  <h2>{studentName}</h2>
                  <p>{studentEmail}</p>
                </div>
              </div>
              <button
                type="button"
                className="student-admin-sidebar-toggle"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle sidebar"
              >
                {isSidebarOpen ? <FiChevronLeft /> : <FiChevronRight />}
              </button>
            </div>

            <div className="student-admin-sidebar-menu-scroll">
              <div className="student-admin-sidebar-header">
                <span className="student-admin-sidebar-title">Menu</span>
              </div>

              <div className="student-admin-sidebar-section">
                <label className="student-admin-sidebar-label">DASHBOARD</label>
                {menuItems.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`student-admin-sidebar-btn ${
                        currentSection === item.id ? "active" : ""
                      }`}
                      onClick={() => handleMenuClick(item)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="student-admin-sidebar-section">
                <label className="student-admin-sidebar-label">ACADEMICS</label>
                {menuItems.slice(2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`student-admin-sidebar-btn ${
                        currentSection === item.id ? "active" : ""
                      }`}
                      onClick={() => handleMenuClick(item)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        <main className="student-admin-content">
          {currentSection === "home" ? (
            <>
              {renderContent()}
              <section id="overview" className="student-admin-stats">
                <article className="student-admin-stat">
                  <p>Enrolled Courses</p>
                  <strong>{enrolledCoursesCount}</strong>
                </article>
                <article className="student-admin-stat">
                  <p>Total Sessions</p>
                  <strong>{totalSessions}</strong>
                </article>
              </section>
            </>
          ) : currentSection === "exams" ? (
            <>{renderContent()}</>
          ) : (
            <>
              <section id="overview" className="student-admin-stats">
                <article className="student-admin-stat">
                  <p>Enrolled Courses</p>
                  <strong>{enrolledCoursesCount}</strong>
                </article>
                <article className="student-admin-stat">
                  <p>Total Sessions</p>
                  <strong>{totalSessions}</strong>
                </article>
              </section>
              {renderContent()}
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default StudentDashboardShell;


