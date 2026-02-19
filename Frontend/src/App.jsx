import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import ResetPassword from "./components/ResetPassword/ResetPassword";
import Login from "./components/UserLogin/Login";
import UserRegister from "./components/UserRegister/UserRegister";
import Layout from "./components/Layout/Layout";
import Dashboard from "./components/pages/Dashboard";
import FacultyErpDashboard from "./components/faculty/FacultyErpDashboard";
import AdminHome from "./Admin/AdminHome";
import useGetCurrentUser from "./components/customHooks/getCurrentUser";
import Department from "./Admin/Department";
import AdminLayout from "./Admin/AdminLayout";
import Faculty from "./Admin/Faculty";
import Student from "./Admin/Student";
import Courses from "./Admin/Courses";
import Groups from "./Admin/Groups";
import Timetable from "./Admin/Timetable";
import Exam from "./Admin/Exam";
import Result from "./Admin/Result";
import Attendance from "./Admin/Attendance";
import Leaves from "./Admin/Leaves";
import Fees from "./Admin/Fees";
import FeesAcademic from "./Admin/FeesAcademic";
import FeesHostel from "./Admin/FeesHostel";
import FeesTransport from "./Admin/FeesTransport";
import FeesBackpapers from "./Admin/FeesBackpapers";
import ReportsHub from "./Admin/ReportsHub";
import FinancialAnalytics from "./Admin/FinancialAnalytics";
import StudentAnalytics from "./Admin/StudentAnalytics";
import FeesDiscounts from "./Admin/FeesDiscounts";
import FeesOthers from "./Admin/FeesOthers";
import StudentFeeMapping from "./Admin/StudentFeeMapping";
import StudentRecords from "./Admin/StudentRecords";
import BulkOperations from "./Admin/BulkOperations";
import PaymentMethods from "./Admin/PaymentMethods";
import AcademicCalendar from "./Admin/AcademicCalendar";
import GeneralSupport from "./Admin/GeneralSupport";
import Library from "./Admin/Library";
import Settings from "./Admin/Settings";
import FacultyLectureReport from "./Admin/FacultyLectureReport";
import SubjectAttendance from "./Admin/Subjectattendance";
import TeachingLoad from "./Admin/Teachingload";
import Assignment from "./Admin/Assignment";
import Alerts from "./Admin/Alert";
import NetworkError from "./components/NetworkError/NetworkError";
import PageNotFound from "./components/PageNotFound/PageNotFound";

const LAST_FAILED_ROUTE_KEY = "lastFailedRoute";
const OFFLINE_REDIRECT_DELAY_MS = 1500;

function App() {
  const authResolved = useGetCurrentUser();

  const userData = useSelector((state) => state.user.userData);
  console.log("Current User",userData);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authResolved) return;
    if (!userData?.user?.role) return;
    if (location.pathname === "/network-error") return;

    const savedRoute = sessionStorage.getItem(LAST_FAILED_ROUTE_KEY);
    if (!savedRoute || savedRoute === "/network-error") return;
    if (savedRoute === location.pathname) {
      sessionStorage.removeItem(LAST_FAILED_ROUTE_KEY);
      return;
    }

    const role = userData.user.role;
    const isAllowedRoute =
      savedRoute.startsWith("/network-error") ||
      savedRoute.startsWith("/page-not-found") ||
      savedRoute.startsWith("/login") ||
      savedRoute.startsWith("/reset-password") ||
      savedRoute.startsWith("/register") ||
      savedRoute === "/" ||
      (role === "admin" && savedRoute.startsWith("/admin")) ||
      (role === "faculty" && savedRoute.startsWith("/faculty")) ||
      (role === "student" && savedRoute.startsWith("/dashboard"));

    sessionStorage.removeItem(LAST_FAILED_ROUTE_KEY);
    if (isAllowedRoute) {
      navigate(savedRoute, { replace: true });
    }
  }, [authResolved, userData, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === "/network-error") return;

    let offlineTimer = null;

    const redirectIfStillOffline = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const failedRoute = `${location.pathname}${location.search}${location.hash}`;
        if (failedRoute && failedRoute !== "/network-error") {
          sessionStorage.setItem(LAST_FAILED_ROUTE_KEY, failedRoute);
        }
        navigate("/network-error", { replace: true });
      }
    };

    const handleOffline = () => {
      if (offlineTimer) clearTimeout(offlineTimer);
      offlineTimer = window.setTimeout(
        redirectIfStillOffline,
        OFFLINE_REDIRECT_DELAY_MS
      );
    };

    const handleOnline = () => {
      if (offlineTimer) {
        clearTimeout(offlineTimer);
        offlineTimer = null;
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (offlineTimer) clearTimeout(offlineTimer);
    };
  }, [location.pathname, location.search, location.hash, navigate]);

  if (
    !authResolved &&
    location.pathname !== "/network-error" &&
    location.pathname !== "/page-not-found"
  ) {
    return null;
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            userData ? (
              userData.user?.role === "faculty" ? (
                <Navigate to="/faculty/faculty-dashboard" replace />
              ) : userData.user?.role === "admin" ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Layout />
            )
          }
        />

        <Route
          path="/login"
          element={
            userData ? (
              userData.user?.role === "faculty" ? (
                <Navigate to="/faculty/faculty-dashboard" replace />
              ) : userData.user?.role === "admin" ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/reset-password"
          element={
            userData ? (
              userData.user?.role === "faculty" ? (
                <Navigate to="/faculty/faculty-dashboard" replace />
              ) : userData.user?.role === "admin" ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <ResetPassword />
            )
          }
        />

        <Route
          path="/register"
          element={
            userData ? (
              userData.user?.role === "faculty" ? (
                <Navigate to="/faculty/faculty-dashboard" replace />
              ) : userData.user?.role === "admin" ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <UserRegister />
            )
          }
        />

        <Route
          path="/faculty/*"
          element={
            userData?.user?.role === "faculty" ? (
              <Routes>
                <Route path="faculty-dashboard" element={<FacultyErpDashboard />} />
                <Route path="*" element={<Navigate to="/page-not-found" replace />} />
              </Routes>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/dashboard/*"
          element={
            userData?.user?.role === "student" ? (
              <Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/*"
          element={
            userData?.user?.role === "admin" ? (
              <AdminLayout />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route path="dashboard" element={<AdminHome />} />
          <Route path="department" element={<Department />} />
          <Route path="faculty" element={<Faculty />} />
          <Route path="student" element={<Student />} />
          <Route path="courses" element={<Courses />} />
          <Route path="groups" element={<Groups />} />
          <Route path="assignment" element={<Assignment />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="exam" element={<Exam />} />
          <Route path="result" element={<Result />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="fees" element={<Fees />} />
          <Route path="fees/mapping" element={<StudentFeeMapping />} />
          <Route path="fees/records" element={<StudentRecords />} />
          <Route path="fees/bulk" element={<BulkOperations />} />
          <Route path="fees/academic" element={<FeesAcademic />} />
          <Route path="fees/structure" element={<FeesAcademic />} />
          <Route path="fees/hostel" element={<FeesHostel />} />
          <Route path="fees/transport" element={<FeesTransport />} />
          <Route path="fees/backpapers" element={<FeesBackpapers />} />
          <Route path="fees/reports" element={<ReportsHub />} />
          <Route path="fees/financial" element={<FinancialAnalytics />} />
          <Route path="fees/student-analytics" element={<StudentAnalytics />} />
          <Route path="fees/others" element={<FeesOthers />} />
          <Route path="fees/payment-methods" element={<PaymentMethods />} />
          <Route path="fees/academic-calendar" element={<AcademicCalendar />} />
          <Route path="fees/discounts" element={<FeesDiscounts />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="general-support" element={<GeneralSupport />} />
          <Route path="library" element={<Library />} />
          <Route path="faculty-lecture-report" element={<FacultyLectureReport />} />
          <Route path="subject-attendance" element={<SubjectAttendance />} />
          <Route path="teaching-load" element={<TeachingLoad />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/page-not-found" replace />} />
        </Route>

        <Route path="/network-error" element={<NetworkError />} />
        <Route path="/page-not-found" element={<PageNotFound />} />

        <Route path="*" element={<Navigate to="/page-not-found" replace />} />
      </Routes>
    </>
  );
}

export default App;
