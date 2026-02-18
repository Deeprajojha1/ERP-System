import { Home, ClipboardList, BookOpen, User, Settings } from "lucide-react";

export default function Sidebar({ activeSection, setActiveSection }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "attendance", label: "Take Attendance", icon: ClipboardList },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "profile", label: "My Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="faculty-sidebar">
      <div className="faculty-sidebar-header">
        <h1 className="faculty-sidebar-title">Faculty Portal</h1>
      </div>
      <div className="faculty-sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`faculty-menu-item ${activeSection === item.id ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
