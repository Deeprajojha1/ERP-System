import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Home,
  ClipboardList,
  BookOpen,
  User,
  Calendar,
  FileText,
  Award,
  ShieldCheck,
} from "lucide-react";
import {
  setActiveSection,
  setSidebarOpen,
  selectActiveSection,
} from "../../redux/facultyDashboardSlice";

const buildProfileImageUrl = (apiBase, fileUrl, fileName) => {
  const backendBase = String(apiBase || "").replace(/\/api\/?$/, "");

  if (fileUrl) {
    if (fileUrl.startsWith("http") || fileUrl.startsWith("data:")) return fileUrl;
    return `${backendBase}${fileUrl}`;
  }

  if (!fileName) return null;
  if (fileName.startsWith("http") || fileName.startsWith("data:")) return fileName;

  const normalizedFileName = String(fileName)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${backendBase}/uploads/profile-images/${normalizedFileName}`;
};

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, section: "DASHBOARD" },
  { id: "attendance", label: "Take Attendance", icon: ClipboardList, section: "MANAGEMENT" },
  { id: "courses", label: "My Courses", icon: BookOpen, section: "MANAGEMENT" },
  { id: "schedule", label: "Schedule", icon: Calendar, section: "ACADEMICS" },
  { id: "leaves", label: "Leave Management", icon: FileText, section: "ACADEMICS" },
  { id: "exams", label: "Exam Blueprints", icon: Award, section: "ACADEMICS" },
  { id: "admitCards", label: "Admit Cards", icon: ShieldCheck, section: "ACADEMICS" },
  { id: "profile", label: "My Profile", icon: User, section: "ACCOUNT" },
  // Settings removed
];

// Group menu items by section
const menuSections = [
  { label: "DASHBOARD", items: menuItems.filter(item => item.section === "DASHBOARD") },
  { label: "MANAGEMENT", items: menuItems.filter(item => item.section === "MANAGEMENT") },
  { label: "ACADEMICS", items: menuItems.filter(item => item.section === "ACADEMICS") },
  { label: "ACCOUNT", items: menuItems.filter(item => item.section === "ACCOUNT") },
];

export default function Sidebar({ facultyData }) {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const userData = useSelector((state) => state.user.userData);
  const activeSection = useSelector(selectActiveSection);
  const [failedImageSrc, setFailedImageSrc] = useState(null);

  // User info - prioritize userData from Redux (updated after profile image upload)
  const user = userData?.user || facultyData?.user || {};
  const userName = user.name || "Faculty User";
  const userEmail = user.email || "faculty@university.edu";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  // Get profile image URL - prioritize userData which gets updated after upload
  const userImg = buildProfileImageUrl(
    apiBase,
    user.profileImageUrl || user.profileImage,
    user.profileImage
  );
  
  // Reset failed image when profile image changes
  useEffect(() => {
    if (userImg) {
      setFailedImageSrc(null);
    }
  }, [userImg]);

  const canRenderAvatar = Boolean(userImg && failedImageSrc !== userImg);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        dispatch(setSidebarOpen(true));
      } else {
        dispatch(setSidebarOpen(false));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  const handleMenuClick = (sectionId) => {
    dispatch(setActiveSection(sectionId));
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      dispatch(setSidebarOpen(false));
    }
  };

  const closeSidebar = () => {
    dispatch(setSidebarOpen(false));
  };

  return (
    <div className="faculty-sidebar">
      {/* Profile Section */}
      <div className="sidebar-profile">
        <div className="sidebar-profile-main">
          <div className="sidebar-avatar">
            {canRenderAvatar ? (
              <img
                src={userImg}
                alt="User"
                className="avatarimg"
                onError={() => setFailedImageSrc(userImg)}
              />
            ) : (
              userInitials || "FA"
            )}
          </div>
          <div className="sidebar-profile-copy">
            <h2>{userName}</h2>
            <p>{userEmail}</p>
          </div>
        </div>
        <button
          className="sidebar-close sidebar-profile-close"
          type="button"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        >
          <svg
            className="sidebar-toggle-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M4 7h16M4 12h16M4 17h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Menu Scroll Area */}
      <div className="sidebar-menu-scroll">
        <div className="sidebar-header">
          <span className="sidebar-title">Menu</span>
        </div>

        {menuSections.map((section) => (
          <div className="sidebar-section" key={section.label}>
            <label className="sidebar-label">{section.label}</label>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMenuClick(item.id)}
                  className={`sidebar-btn ${activeSection === item.id ? "active" : ""}`}
                >
                  <Icon size={18} />
                  <span className="sidebar-text">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

