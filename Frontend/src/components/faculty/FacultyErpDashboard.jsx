import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "./Sidebar";
import NavBar from "./NavBar";
import { Menu } from "lucide-react";
import DashboardSection from "./DashboardSection";
import AttendanceSection from "./AttendanceSection";
import CoursesSection from "./CoursesSection";
import ProfileSection from "./ProfileSection";
import FacultyLeavesSection from "./FacultyLeavesSection";
import FacultyScheduleSection from "./FacultyScheduleSection";
import FacultyExamsSection from "./FacultyExamsSection";
import FacultyAdmitCardsSection from "./FacultyAdmitCardsSection";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import {
  fetchFacultyProfile,
  selectFacultyProfile,
  selectProfileLoadState,
  selectActiveSection,
  selectIsSidebarOpen,
  setSidebarOpen,
  toggleSidebar,
} from "../../redux/facultyDashboardSlice";
import "./FacultyDashboard.css";

export default function FacultyErpDashboard() {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const userData = useSelector((state) => state.user.userData);
  
  // Redux state
  const facultyProfile = useSelector(selectFacultyProfile);
  const profileLoadState = useSelector(selectProfileLoadState);
  const activeSection = useSelector(selectActiveSection);
  const isSidebarOpen = useSelector(selectIsSidebarOpen);

  // Use facultyProfile from Redux, fallback to userData
  const facultyData = facultyProfile || userData;
  const isLoading = profileLoadState === ADMIN_LOAD_STATES.PENDING;
  const isInitialLoad = profileLoadState === ADMIN_LOAD_STATES.INITIAL && !facultyData;

  // Fetch faculty profile on mount
  useEffect(() => {
    if (apiBase && profileLoadState === ADMIN_LOAD_STATES.INITIAL) {
      dispatch(fetchFacultyProfile({ apiBase }));
    }
  }, [apiBase, profileLoadState, dispatch]);

  // refresh handled elsewhere; no prop needed

  // Close sidebar handler (for overlay click)
  const closeSidebar = () => dispatch(setSidebarOpen(false));

  // Loading state
  if (isInitialLoad) {
    return (
      <div className="faculty-layout">
        <div className="faculty-loading-container">
          <div className="faculty-loading">
            <div className="faculty-loading-spinner">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p className="faculty-loading-text">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render section based on active selection
  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection facultyData={facultyData} />;
      case "attendance":
        return <AttendanceSection facultyData={facultyData} />;
      case "courses":
        return <CoursesSection facultyData={facultyData} />;
      case "schedule":
        return <FacultyScheduleSection facultyData={facultyData} />;
      case "leaves":
        return <FacultyLeavesSection facultyData={facultyData} />;
      case "exams":
        return <FacultyExamsSection facultyData={facultyData} />;
      case "admitCards":
        return <FacultyAdmitCardsSection facultyData={facultyData} />;
      case "profile":
        return <ProfileSection facultyData={facultyData} />;
      case "settings":
        // Settings removed — fallback to dashboard
        return <DashboardSection facultyData={facultyData} />;
      default:
        return <DashboardSection facultyData={facultyData} />;
    }
  };

  return (
    <>
      {/* Fixed Nav Bar */}
      <NavBar facultyData={facultyData} />

      {/* Floating menu button (under navbar) */}
      {!isSidebarOpen && (
        <button
          type="button"
          className="faculty-menu-btn faculty-menu-float"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Open sidebar"
          aria-expanded={isSidebarOpen}
        >
          <Menu size={20} />
        </button>
      )}

      <div className={`faculty-layout ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
        <div className="faculty-layout-bg" aria-hidden="true" />

        {/* Overlay for mobile */}
        <div
          className={`faculty-overlay ${isSidebarOpen ? "show" : ""}`}
          onClick={closeSidebar}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />

        {/* Sidebar */}
        <Sidebar facultyData={facultyData} />

        {/* Main Content */}
        <main className={`faculty-content ${isLoading ? "loading" : ""}`}>
          {renderSection()}
        </main>
      </div>
    </>
  );
}
