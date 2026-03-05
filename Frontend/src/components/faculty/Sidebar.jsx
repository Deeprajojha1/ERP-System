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

export default function Sidebar({ facultyData, isSidebarOpen }) {
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
    <div
      className={`z-[60] flex min-h-[calc(100dvh-74px)] flex-col border-r border-slate-200 bg-white transition-all duration-300 lg:fixed lg:left-0 lg:top-[74px] lg:h-[calc(100dvh-74px)] ${
        isSidebarOpen
          ? "fixed left-0 top-[74px] w-[min(82vw,280px)] translate-x-0 lg:w-[292px]"
          : "fixed left-0 top-[74px] w-[min(82vw,280px)] -translate-x-full lg:w-0 lg:min-w-0 lg:overflow-hidden lg:border-r-0"
      }`}
    >
      {/* Profile Section */}
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-gray-300 p-4">
        <div className="min-w-0 flex items-center gap-3">
          <div className="inline-flex h-11 w-11 min-w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-300 to-blue-200 text-lg font-bold text-sky-700">
            {canRenderAvatar ? (
              <img
                src={userImg}
                alt="User"
                className="h-full w-full rounded-full object-cover"
                onError={() => setFailedImageSrc(userImg)}
              />
            ) : (
              userInitials || "FA"
            )}
          </div>
          <div className="min-w-0">
            <h2 className="m-0 break-words text-base font-semibold leading-tight text-gray-800">{userName}</h2>
            <p className="mt-0.5 break-words text-[13px] leading-tight text-gray-500">{userEmail}</p>
          </div>
        </div>
        <button
          className="hidden h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 transition-colors duration-200 hover:from-blue-100 hover:to-blue-200 max-[1023px]:inline-flex"
          type="button"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        >
          <svg
            className="h-[22px] w-[22px]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M4 7h16M4 12h16M4 17h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Menu Scroll Area */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex shrink-0 items-center justify-start px-[14px] pb-1.5 pt-2.5">
          <span className="mr-auto text-[11px] text-slate-500">Menu</span>
        </div>

        {menuSections.map((section) => (
          <div className="flex flex-col gap-2 px-3 pb-1" key={section.label}>
            <label className="ml-2 mt-1 hidden text-[10px] font-semibold tracking-[1.1px] text-slate-500">{section.label}</label>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full cursor-pointer rounded-xl bg-transparent px-3.5 py-3 text-left text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-900 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={isActive ? "shrink-0 text-sky-600" : "shrink-0 text-gray-600"}
                    />
                    <span className="flex-1">{item.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

