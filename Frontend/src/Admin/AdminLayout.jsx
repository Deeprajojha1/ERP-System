import React, { useState } from "react";
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
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { clearUserData } from "../redux/userSlice";
import { clearStudents } from "../redux/studentSlice";
import { clearFaculty } from "../redux/facultySlice";
import "./AdminHome.css";
import Leaves from "./Leaves";

const AdminLayout = () => {
  const userData = useSelector((state) => state.user.userData);
  const apiBase = useSelector((state) => state.config.apiBase);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth >= 769
  );

  const handleLogout = async () => {
    try {
      await axios.post(
        `${apiBase}/user/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error(
        "Logout failed:",
        error.response?.data || error.message
      );
    } finally {
      dispatch(clearUserData());
      dispatch(clearStudents());
      dispatch(clearFaculty());
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <nav className="admin-nav">
        {/* Left */}
        <div className="admin-left">
          <h1 className="admin-logo">
            <MdCastForEducation />
            Admin Dashboard
          </h1>
          <span className="admin-university">Haridwar University</span>
        </div>

        {/* Right */}
        <div className="admin-right">
          {userData?.user && (
            <span className="admin-user">Hello, {userData.user.name}</span>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
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
              d="M6 4v16M10 12h8m0 0-4-4m4 4-4 4"
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
        <div
          className={`admin-overlay ${isSidebarOpen ? "show" : ""}`}
          onClick={() => setIsSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />

        {/* ===== SIDEBAR ===== */}
        <div className="admin-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">Menu</span>
            <button
              className="sidebar-close"
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
                  d="M18 4v16M14 12H6m0 0 4-4m-4 4 4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="sidebar-section">
            <label className="sidebar-label">DASHBOARD</label>
            <button
              className="sidebar-btn"
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
              className="sidebar-btn"
              onClick={() => {
                navigate("/admin/department");
              }}
            >
              <GoOrganization />
              <span className="sidebar-text">Department</span>
            </button>

            <button className="sidebar-btn" onClick={() => {
                navigate("/admin/faculty");
              }}>
              <GiTeacher />
              <span className="sidebar-text">Faculty</span>
            </button>

            <button className="sidebar-btn" onClick={() => {
                navigate("/admin/student");
              }}>
              <PiStudentFill />
              <span className="sidebar-text">Students</span>
            </button>
          </div>

          <div className="sidebar-section">
            <label className="sidebar-label">ACADEMICS</label>

            <button
              className="sidebar-btn"
              onClick={() => {
                navigate("/admin/courses");
              }}
            >
              <GiJusticeStar />
              <span className="sidebar-text">Courses</span>
            </button>

            <button
              className="sidebar-btn"
              onClick={() => {
                navigate("/admin/timetable");
              }}
            >
              <MdOutlineSchedule />
              <span className="sidebar-text">Timetable</span>
            </button>

            <button
              className="sidebar-btn"
              onClick={() => {
                navigate("/admin/exam");
              }}
            >
              <PiExamFill />
              <span className="sidebar-text">Exams</span>
            </button>

            <button
              className="sidebar-btn"
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
              className="sidebar-btn"
              onClick={() => {
                navigate("/admin/attendance");
              }}
            >
              <MdRecordVoiceOver />
              <span className="sidebar-text">Attendance</span>
            </button>

            <button
              className="sidebar-btn"
              onClick={() => {
                navigate("/admin/leaves");
              }}
            >
              <GiKoholintEgg />
              <span className="sidebar-text">Leaves</span>
            </button>

            <button
              className="sidebar-btn"
              onClick={() => {
                navigate("/admin/fees");
              }}
            >
              <LuBadgeIndianRupee />
              <span className="sidebar-text">Fees</span>
            </button>
          </div>

          <div className="sidebar-section">
            <label className="sidebar-label">SYSTEM</label>

            <button
              className="sidebar-btn"
              onClick={() => {
                navigate("/admin/general-support");
              }}
            >
              <TbReportSearch />
              <span className="sidebar-text">General Reports</span>
            </button>
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
