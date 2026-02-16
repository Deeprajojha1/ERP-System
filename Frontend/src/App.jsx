import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import ResetPassword from "./components/ResetPassword/ResetPassword";
import Login from "./components/UserLogin/Login";
import UserRegister from "./components/UserRegister/UserRegister";
import Layout from "./components/Layout/Layout";
import Dashboard from "./components/pages/Dashboard";
import AttendancePage from "./components/faculty/AttendancePage";
import FacultyDashboard from "./components/faculty/FacultyDashboard";
import FacultyLeaves from "./components/faculty/FacultyLeaves";
import Header from "./components/faculty/Header";
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
import FeesOthers from "./Admin/FeesOthers";
import GeneralSupport from "./Admin/GeneralSupport";
import Library from "./Admin/Library";
import Settings from "./Admin/Settings";
import NetworkError from "./components/NetworkError/NetworkError";
import PageNotFound from "./components/PageNotFound/PageNotFound";

const LAST_FAILED_ROUTE_KEY = "lastFailedRoute";

function App() {
  useGetCurrentUser();

  const userData = useSelector((state) => state.user.userData);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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
  }, [userData, location.pathname, navigate]);

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

        {userData?.user?.role === "faculty" && (
          <Route
            path="/faculty/*"
            element={
              <div className="app">
                <Header />

                <main className="main">
                  <Routes>
                    <Route path="faculty-dashboard" element={<FacultyDashboard />} />
                    <Route path="course/:courseId" element={<AttendancePage />} />
                    <Route path="leaves" element={<FacultyLeaves />} />
                    <Route path="*" element={<Navigate to="/page-not-found" replace />} />
                  </Routes>
                </main>
              </div>
            }
          />
        )}

        {userData?.user?.role === "student" && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
          </>
        )}

        {userData?.user?.role === "admin" && (
          <Route path="/admin/*" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminHome />} />
            <Route path="department" element={<Department />} />
            <Route path="faculty" element={<Faculty />} />
            <Route path="student" element={<Student />} />
            <Route path="courses" element={<Courses />} />
            <Route path="groups" element={<Groups />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="exam" element={<Exam />} />
            <Route path="result" element={<Result />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="fees" element={<Fees />} />
            <Route path="fees/academic" element={<FeesAcademic />} />
            <Route path="fees/hostel" element={<FeesHostel />} />
            <Route path="fees/transport" element={<FeesTransport />} />
            <Route path="fees/backpapers" element={<FeesBackpapers />} />
            <Route path="fees/others" element={<FeesOthers />} />
            <Route path="general-support" element={<GeneralSupport />} />
            <Route path="library" element={<Library />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/page-not-found" replace />} />
          </Route>
        )}

        <Route path="/network-error" element={<NetworkError />} />
        <Route path="/page-not-found" element={<PageNotFound />} />

        <Route path="*" element={<Navigate to="/page-not-found" replace />} />
      </Routes>
    </>
  );
}

export default App;
