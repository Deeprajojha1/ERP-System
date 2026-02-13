/**
 * Dashboard.jsx - Main Dashboard Page Component
 * 
 * This is the main page of the application after login.
 * It displays student information, attendance, and courses.
 * 
 * Components included:
 * - StudentDetails: Shows student personal and academic info
 * - AttendanceOverview: Displays overall attendance with download
 * - CoursesDetails: Shows all enrolled courses
 * - AttendanceCalendar: Modal for viewing course-specific attendance
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Course click to view attendance calendar
 * - Responsive design
 * 
 * Note: React 18+ with new JSX transform - no need to import React
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import axios from '../../utils/axiosInstance';
import { clearUserData } from '../../redux/userSlice';

// Import child components
import StudentDetails from '../student/StudentDetails';
import CoursesDetails from '../student/CoursesDetails';
import AttendanceOverview from '../student/AttendanceOverview';
import AttendanceCalendar from '../student/AttendanceCalendar';

// Import styles
import './Dashboard.css';

/**
 * Dashboard Component
 * 
 * Main dashboard page that orchestrates all child components
 * Manages state for calendar modal and selected course
 * 
 * @returns {JSX.Element} Dashboard page UI
 */
const Dashboard = () => {
  // Hook for programmatic navigation
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const apiBase = useSelector((state) => state.config.apiBase);
  const user = userData?.user;
  const roleDetails = userData?.roleDetails;

  /**
   * STATE: showCalendar
   * Controls visibility of the attendance calendar modal
   * @type {boolean}
   */
  const [showCalendar, setShowCalendar] = useState(false);

  /**
   * STATE: selectedCourse
   * Stores the course that user clicked to view attendance
   * @type {Object|null}
   */
  const [selectedCourse, setSelectedCourse] = useState(null);

  /**
   * Handle course card click
   * Opens calendar modal with selected course data
   * 
   * @param {Object} course - Course object from coursesData
   */
  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setShowCalendar(true);
  };

  /**
   * Handle calendar modal close
   * Closes the calendar and clears selected course
   */
  const handleCloseCalendar = () => {
    setShowCalendar(false);
    setSelectedCourse(null);
  };

  /**
   * Handle logout
   * Clears user session and redirects to login
   */
  const handleLogout = async () => {
    try {
      await axios.post(`${apiBase}/user/logout`, {});
      localStorage.removeItem("authToken");
    } catch (error) {
      console.error(
        'Logout failed:',
        error.response?.data || error.message
      );
    } finally {
      dispatch(clearUserData());
      navigate('/login', { replace: true });
    }
  };

  const resolvedStudentData = useMemo(() => {
    return {
      personalInfo: {
        studentId: roleDetails?.enrollmentNumber || 'N/A',
        name: user?.name || 'Student',
        email: user?.email || 'N/A',
        phone: user?.phoneNumber || 'N/A',
        dateOfBirth: user?.DOB || 'N/A',
        address: 'N/A',
      },
      parentInfo: {
        fatherName: roleDetails?.fatherName || 'N/A',
        fatherPhone: roleDetails?.fatherPhoneNumber || 'N/A',
      },
      academicInfo: {
        course: roleDetails?.department?.name || 'N/A',
        semester: roleDetails?.semester
          ? `Semester ${roleDetails.semester}`
          : 'N/A',
        academicYear: roleDetails?.academicYear || 'N/A',
        rollNumber: roleDetails?.enrollmentNumber || 'N/A',
        section: roleDetails?.group?.name || 'N/A',
        batch: 'N/A',
        university: 'N/A',
        college: 'N/A',
      },
    };
  }, [user, roleDetails]);

  const attendanceData = userData?.attendanceData || [];
  const enrolledCourses = userData?.enrolledCourses || [];

  const coursesData = useMemo(() => {
    return enrolledCourses.map((course) => {
      const attendance = attendanceData.find(
        (item) => item.course?._id === course._id
      );
      const totalClasses = attendance?.totalSessions || 0;
      const attendedClasses = attendance?.presentCount || 0;
      const percentage =
        typeof attendance?.attendancePercentage === 'number'
          ? attendance.attendancePercentage
          : totalClasses > 0
          ? Number(((attendedClasses / totalClasses) * 100).toFixed(1))
          : 0;

      return {
        id: course._id,
        courseCode: course.code,
        courseName: course.courseName,
        credits: course.credit ?? 'N/A',
        instructor: 'N/A',
        schedule: 'N/A',
        room: roleDetails?.group?.roomNo || 'N/A',
        totalClasses,
        attendedClasses,
        attendancePercentage: percentage,
      };
    });
  }, [enrolledCourses, attendanceData, roleDetails]);

  /**
   * RENDER: Dashboard UI
   */
  return (
    <div className="dashboard">
      {/* 
        HEADER SECTION
        Contains title, academic year, and welcome message
      */}
      <header className="dashboard-header">
        <div className="header-content">
          {/* Left side: Title and academic year */}
          <div className="header-left">
            <h1>Student Dashboard</h1>
            <p>Academic Year {resolvedStudentData.academicInfo.academicYear}</p>
          </div>
          
          {/* Right side: Welcome message */}
          <div className="header-right">
            <span className="welcome-text">
              Welcome, {resolvedStudentData.personalInfo.name}
            </span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* 
        MAIN CONTENT SECTION
        Contains all dashboard components
      */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          
          {/* 
            STUDENT DETAILS COMPONENT
            Displays student personal info, father details, and academic info
            Props: studentData object
          */}
          <StudentDetails studentData={resolvedStudentData} />

          {/* 
            ATTENDANCE OVERVIEW COMPONENT
            Shows overall attendance percentage and download button
            Props: coursesData array, studentData object
          */}
          <AttendanceOverview 
            overallAttendance={userData?.overallAttendance}
            attendanceData={attendanceData}
            studentData={resolvedStudentData} 
          />

          {/* 
            COURSES DETAILS COMPONENT
            Displays all enrolled courses as clickable cards
            Props: coursesData array, onCourseClick callback
          */}
          <CoursesDetails 
            coursesData={coursesData} 
            onCourseClick={handleCourseClick}
          />
        </div>
      </main>

      {/* 
        ATTENDANCE CALENDAR MODAL
        Conditionally rendered when showCalendar is true
        Shows course-specific attendance in calendar view
        Props: attendanceData, coursesData, selectedCourse, onClose callback
      */}
      {showCalendar && (
        <AttendanceCalendar
          attendanceData={attendanceData}
          coursesData={coursesData}
          selectedCourse={selectedCourse}
          onClose={handleCloseCalendar}
        />
      )}
    </div>
  );
};

export default Dashboard;
