import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Sidebar from "./Sidebar";
import NavBar from "./NavBar";
import DashboardSection from "./DashboardSection";
import AttendanceSection from "./AttendanceSection";
import CoursesSection from "./CoursesSection";
import ProfileSection from "./ProfileSection";
import SettingsSection from "./SettingsSection";
import Toast from "./Toast";
import "./FacultyDashboard.css";

export default function FacultyErpDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [toast, setToast] = useState({ show: false, text: "", type: "success" });
  const [facultyData, setFacultyData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get user data from Redux store
  const userData = useSelector((state) => state.user.userData);

  useEffect(() => {
    if (userData) {
      setFacultyData(userData);
      setLoading(false);
    }
  }, [userData]);

  const showToast = (text, type = "success") => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: "", type: "success" }), 3000);
  };

  if (loading) {
    return (
      <div className="faculty-layout">
        <div className="faculty-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="admin-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-layout">
      <div className="faculty-layout-bg"></div>
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>
        <NavBar facultyData={facultyData} />
        <main className="faculty-content">
          {activeSection === "dashboard" && <DashboardSection facultyData={facultyData} />}
          {activeSection === "attendance" && <AttendanceSection facultyData={facultyData} showToast={showToast} />}
          {activeSection === "courses" && <CoursesSection facultyData={facultyData} showToast={showToast} />}
          {activeSection === "profile" && <ProfileSection facultyData={facultyData} />}
          {activeSection === "settings" && <SettingsSection />}
        </main>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
