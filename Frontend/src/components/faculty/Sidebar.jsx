import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  ClipboardCheck,
  BookOpen,
  CalendarDays,
  CalendarClock,
  FileText,
  IdCard,
  User,
  PanelLeftClose,
} from "lucide-react";
import {
  selectActiveSection,
  setActiveSection,
  setSidebarOpen,
} from "../../redux/facultyDashboardSlice";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "leaves", label: "Leaves", icon: CalendarClock },
  { id: "exams", label: "Exams", icon: FileText },
  { id: "admitCards", label: "Admit Cards", icon: IdCard },
  { id: "profile", label: "Profile", icon: User },
];

const getInitial = (name) => {
  if (!name || typeof name !== "string") return "F";
  return name.trim().charAt(0).toUpperCase() || "F";
};

export default function Sidebar({ facultyData }) {
  const dispatch = useDispatch();
  const activeSection = useSelector(selectActiveSection);

  const profile = useMemo(() => {
    const user = facultyData?.user || {};
    const details = facultyData?.facultyDetails || facultyData?.roleDetails || {};
    return {
      name: user.name || "Faculty Member",
      designation: details.designation || "Faculty",
      avatar:
        user.avatar ||
        user.profileImage ||
        user.profilePicture ||
        details.profileImage ||
        "",
    };
  }, [facultyData]);

  const handleSectionClick = (sectionId) => {
    dispatch(setActiveSection(sectionId));
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      dispatch(setSidebarOpen(false));
    }
  };

  return (
    <aside className="faculty-sidebar" aria-label="Faculty navigation">
      <div className="sidebar-profile">
        <div className="sidebar-profile-main">
          <div className="sidebar-avatar" aria-hidden="true">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="avatarimg" />
            ) : (
              <span>{getInitial(profile.name)}</span>
            )}
          </div>
          <div className="sidebar-profile-copy">
            <h2>{profile.name}</h2>
            <p>{profile.designation}</p>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-close sidebar-profile-close"
          onClick={() => dispatch(setSidebarOpen(false))}
          aria-label="Close sidebar"
        >
          <PanelLeftClose className="sidebar-toggle-icon" />
        </button>
      </div>

      <div className="sidebar-header">
        <span className="sidebar-title">Navigation</span>
      </div>

      <div className="sidebar-menu-scroll">
        <div className="sidebar-section" role="navigation" aria-label="Faculty sections">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-btn ${isActive ? "active" : ""}`}
                onClick={() => handleSectionClick(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={18} />
                <span className="sidebar-text">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="faculty-sidebar-footer">
        <p className="faculty-sidebar-version">Faculty ERP</p>
      </div>
    </aside>
  );
}
