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
import { ADMIN_LOAD_STATES } from '../../Admin/constants/loadStates';

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
  const userLoading = useSelector((state) => state.user.loading);
  const userError = useSelector((state) => state.user.error);
  const apiBase = useSelector((state) => state.config.apiBase);
  const user = userData?.user;
  const roleDetails = userData?.roleDetails;

  const dashboardLoadState = useMemo(() => {
    if (userLoading) return ADMIN_LOAD_STATES.PENDING;
    if (userData) return ADMIN_LOAD_STATES.SUCCESS;
    if (userError) return ADMIN_LOAD_STATES.FAILURE;
    return ADMIN_LOAD_STATES.INITIAL;
  }, [userLoading, userData, userError]);

  const dashboardFailureMessage = useMemo(
    () =>
      String(userError || '').trim() ||
      'Unable to load student dashboard right now. Please try again.',
    [userError]
  );

  /**
   * STATE: showCalendar
   * Controls visibility of the attendance calendar modal
   * @type {boolean}
   */
  const [showCalendar, setShowCalendar] = useState(false);
  const [studentCoursesFromApi, setStudentCoursesFromApi] = useState([]);
  const [courseContentByCourse, setCourseContentByCourse] = useState({});

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
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
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
        phoneNumber: user?.phoneNumber || user?.phone || 'N/A',
        DOB: user?.DOB || user?.dateOfBirth || 'N/A',
        // Keep legacy keys for any older consumers.
        phone: user?.phoneNumber || user?.phone || 'N/A',
        dateOfBirth: user?.DOB || user?.dateOfBirth || 'N/A',
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
        university: 'Haridwar University',
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

  useEffect(() => {
    const shouldFetchCourses = apiBase && user?.role === "student";
    if (!shouldFetchCourses) {
      setStudentCoursesFromApi([]);
      return;
    }

    let isMounted = true;
    const fetchStudentCourses = async () => {
      try {
        const res = await axios.get(`${apiBase}/student/courses`, {
          withCredentials: true,
        });
        const list = Array.isArray(res?.data?.courses) ? res.data.courses : [];
        if (isMounted) setStudentCoursesFromApi(list);
      } catch (error) {
        console.error(
          "Failed to fetch student courses from /student/courses:",
          error.response?.data || error.message
        );
        if (isMounted) setStudentCoursesFromApi([]);
      }
    };

    fetchStudentCourses();
    return () => {
      isMounted = false;
    };
  }, [apiBase, user?.role]);

  useEffect(() => {
    const shouldFetchCourseContent = apiBase && user?.role === "student";
    if (!shouldFetchCourseContent) {
      setCourseContentByCourse({});
      return;
    }

    let isMounted = true;
    const fetchStudentCourseContent = async () => {
      try {
        const res = await axios.get(`${apiBase}/student/course-content`, {
          withCredentials: true,
        });
        const contentMap = res?.data?.contentByCourse;
        if (isMounted) {
          setCourseContentByCourse(
            contentMap && typeof contentMap === "object" ? contentMap : {}
          );
        }
      } catch (error) {
        console.error(
          "Failed to fetch student course content from /student/course-content:",
          error.response?.data || error.message
        );
        if (isMounted) setCourseContentByCourse({});
      }
    };

    fetchStudentCourseContent();
    return () => {
      isMounted = false;
    };
  }, [apiBase, user?.role]);

  const effectiveEnrolledCourses = useMemo(() => {
    if (Array.isArray(studentCoursesFromApi) && studentCoursesFromApi.length > 0) {
      return studentCoursesFromApi;
    }
    const roleDetailsGroupCourses = Array.isArray(roleDetails?.group?.courseIds)
      ? roleDetails.group.courseIds
      : [];
    if (roleDetailsGroupCourses.length > 0) {
      return roleDetailsGroupCourses;
    }
    return enrolledCourses;
  }, [studentCoursesFromApi, enrolledCourses, roleDetails]);

  const coursesData = useMemo(() => {
    return effectiveEnrolledCourses.map((course) => {
      const courseId = String(course?._id || course?.id || "");
      const contentBucket = courseId ? courseContentByCourse?.[courseId] : null;
      const assignmentItems = Array.isArray(contentBucket?.combinedAssignments)
        ? contentBucket.combinedAssignments
        : Array.isArray(course?.assignments)
        ? course.assignments
        : [];
      const materialItems = Array.isArray(contentBucket?.materials)
        ? contentBucket.materials
        : Array.isArray(course?.materials)
        ? course.materials
        : Array.isArray(course?.resources)
        ? course.resources
        : [];
      const attendance = attendanceData.find(
        (item) => {
          const attendanceCourseId = String(item?.course?._id || item?.course || "");
          return attendanceCourseId && attendanceCourseId === courseId;
        }
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
        id: course?._id || course?.id,
        courseCode: course?.code || course?.courseCode || "N/A",
        courseName: course?.courseName || course?.name || "Course",
        credits: course?.credit ?? course?.credits ?? "N/A",
        semester: course?.semester ?? roleDetails?.semester ?? null,
        academicYear: course?.academicYear ?? roleDetails?.academicYear ?? null,
        courseType: course?.type || course?.courseType || null,
        status: course?.status || "active",
        instructor:
          contentBucket?.facultyName ||
          course?.instructor ||
          course?.facultyName ||
          "N/A",
        schedule: 'N/A',
        room: roleDetails?.group?.roomNo || 'N/A',
        totalClasses,
        attendedClasses,
        attendancePercentage: percentage,
        assignments: assignmentItems,
        assignmentsCount:
          Number(contentBucket?.counts?.combinedAssignments) ||
          Number(course?.assignmentsCount) ||
          assignmentItems.length,
        materials: materialItems,
        resources: materialItems,
      };
    });
  }, [effectiveEnrolledCourses, attendanceData, roleDetails, courseContentByCourse]);

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
  if (dashboardLoadState === ADMIN_LOAD_STATES.PENDING) {
    return (
      <div className="student-dashboard-page student-dashboard-state-wrap">
        <div className="student-dashboard-state-card" role="status" aria-live="polite">
          <div className="student-dashboard-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="student-dashboard-state-text">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (dashboardLoadState === ADMIN_LOAD_STATES.FAILURE) {
    return (
      <div className="student-dashboard-page student-dashboard-state-wrap">
        <div className="student-dashboard-state-card student-dashboard-state-card-error">
          <p className="student-dashboard-error-title">Failed To Load Dashboard</p>
          <p className="student-dashboard-error-message">{dashboardFailureMessage}</p>
        </div>
      </div>
    );
  }

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
          selectedCourse={selectedCourse}
          onClose={handleCloseCalendar}
        />
      )}
    </div>
  );
};

export default Dashboard;
