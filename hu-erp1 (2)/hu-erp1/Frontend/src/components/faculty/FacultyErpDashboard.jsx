import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import Sidebar from "./Sidebar";
import NavBar from "./NavBar";
import DashboardSection from "./DashboardSection";
import AttendanceSection from "./AttendanceSection";
import CoursesSection from "./CoursesSection";
import ProfileSection from "./ProfileSection";
import SettingsSection from "./SettingsSection";
import Toast from "./Toast";
import "./FacultyDashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function FacultyErpDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [toast, setToast] = useState({ show: false, text: "", type: "success" });
  const [facultyData, setFacultyData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get user data from Redux store (for initial fast load)
  const userData = useSelector((state) => state.user.userData);

  // Fetch fresh faculty data from backend
  const fetchFacultyData = async () => {
    try {
      console.log("Fetching faculty data from:", `${API_BASE_URL}/faculty/me`);
      
      const response = await axios.get(`${API_BASE_URL}/faculty/me`, {
        withCredentials: true,
      });

      console.log("Faculty data received:", response.data);
      setFacultyData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching faculty data:", error);
      
      // Fallback to Redux data if API fails
      if (userData) {
        console.log("Using Redux data as fallback");
        setFacultyData(userData);
      }
      setLoading(false);
    }
  };

  // Initial load: use Redux data immediately, then fetch fresh data
  useEffect(() => {
    if (userData) {
      // Set Redux data immediately for fast initial render
      setFacultyData(userData);
      setLoading(false);
    }
    
    // Fetch fresh data from backend
    fetchFacultyData();
  }, []);

  const showToast = (text, type = "success") => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: "", type: "success" }), 3000);
  };

  if (loading && !facultyData) {
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
        <NavBar facultyData={facultyData} onRefresh={fetchFacultyData} />
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
