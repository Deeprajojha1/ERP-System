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

import { useState, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import axios from '../../utils/axiosInstance';
import { clearUserData, setUserData } from '../../redux/userSlice';
import { useNavigate } from 'react-router-dom';

// Import child components
import AttendanceCalendar from '../student/AttendanceCalendar';
import StudentDashboardShell from '../student/StudentDashboardShell';

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
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
    } catch (error) {
      console.error(
        'Logout failed:',
        error.response?.data || error.message
      );
    } finally {
      dispatch(clearUserData());
      sessionStorage.removeItem("lastFailedRoute");
      sessionStorage.removeItem("lastNetworkRedirectAt");
      navigate("/", { replace: true });
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

  const attendanceData = useMemo(
    () => (Array.isArray(userData?.attendanceData) ? userData.attendanceData : []),
    [userData?.attendanceData]
  );
  const enrolledCourses = useMemo(
    () => (Array.isArray(userData?.enrolledCourses) ? userData.enrolledCourses : []),
    [userData?.enrolledCourses]
  );

  useEffect(() => {
    const shouldFetchStudentData =
      apiBase &&
      user?.role === 'student' &&
      !Array.isArray(userData?.enrolledCourses);

    if (!shouldFetchStudentData) return;

    const fetchStudentData = async () => {
      try {
        const res = await axios.get(`${apiBase}/user/me`, {
          withCredentials: true,
        });
        dispatch(setUserData(res.data));
      } catch (error) {
        console.error(
          'Failed to refresh student dashboard data:',
          error.response?.data || error.message
        );
      }
    };

    fetchStudentData();
  }, [apiBase, user?.role, userData?.enrolledCourses, dispatch]);

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

  const totalSessions = attendanceData.reduce(
    (total, item) => total + (item?.totalSessions || 0),
    0
  );
  const lowAttendanceCount = coursesData.filter(
    (course) => Number(course.attendancePercentage || 0) < 75
  ).length;
  const strongAttendanceCount = coursesData.filter(
    (course) => Number(course.attendancePercentage || 0) >= 90
  ).length;
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    []
  );

  /**
   * RENDER: Dashboard UI
   */
  return (
    <div className="student-dashboard-page">
      <StudentDashboardShell
        resolvedStudentData={resolvedStudentData}
        roleDetails={roleDetails}
        totalSessions={totalSessions}
        strongAttendanceCount={strongAttendanceCount}
        lowAttendanceCount={lowAttendanceCount}
        overallAttendance={userData?.overallAttendance}
        attendanceData={attendanceData}
        coursesData={coursesData}
        onCourseClick={handleCourseClick}
        onLogout={handleLogout}
        todayLabel={todayLabel}
      />

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
