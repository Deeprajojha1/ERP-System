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
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-sky-50 via-blue-50 to-slate-100">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-blue-100 bg-white/80 px-8 py-7 shadow-lg backdrop-blur">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="m-0 text-sm font-medium text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Render section based on active selection
  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection facultyData={facultyData} isScheduleLoading={isLoading} />;
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
        // Settings removed - fallback to dashboard
        return <DashboardSection facultyData={facultyData} isScheduleLoading={isLoading} />;
      default:
        return <DashboardSection facultyData={facultyData} isScheduleLoading={isLoading} />;
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
          className="fixed left-0 top-[74px] z-[95] inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-lg border border-white/20 bg-[#0b2d6b] text-white transition-colors duration-200 hover:bg-[#10398a]"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Open sidebar"
          aria-expanded={isSidebarOpen}
        >
          <Menu size={20} />
        </button>
      )}

      <div className="relative mt-[74px] flex min-h-[calc(100dvh-74px)] bg-[#f2f6fb]">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,#f4f8fc_0%,#eef3f9_65%,#ecf1f7_100%)]"
          aria-hidden="true"
        />

        {/* Overlay for mobile */}
        <div
          className={`fixed inset-0 z-[45] bg-black/35 transition-opacity duration-200 lg:hidden ${
            isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={closeSidebar}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />

        {/* Sidebar */}
        <Sidebar facultyData={facultyData} isSidebarOpen={isSidebarOpen} />

        {/* Main Content */}
        <main
          className={`relative z-[1] min-w-0 flex-1 overflow-x-hidden p-[clamp(16px,2.2vw,26px)] pt-[max(20px,clamp(16px,2.2vw,26px))] transition-[margin] duration-300 ${isSidebarOpen ? "lg:ml-[292px]" : "lg:ml-0"} ${isLoading ? "opacity-90" : ""}`}
        >
          <div className="mx-auto w-full max-w-[1600px]">
            {renderSection()}
          </div>
        </main>
      </div>
    </>
  );
}

