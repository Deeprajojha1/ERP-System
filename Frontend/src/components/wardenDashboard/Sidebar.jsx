import { Building, ChevronLeft, ChevronRight, ShieldCheck, LayoutDashboard, Bed, Users, LogOut, Clock, AlertCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

function Sidebar({ isCollapsed, onToggle, items, mobile = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const iconMap = {
    Overview: LayoutDashboard,
    Rooms: Bed,
    Students: Users,
    Outpass: Clock,
    Complaints: AlertCircle,
  };

  const getRoutePath = (itemName) => {
    const routeMap = {
      Overview: "/warden-dashboard",
      Rooms: "/warden-rooms",
      Students: "/warden-students",
      Outpass: "/warden-outpass",
      Complaints: "/warden-complaints",
    };
    return routeMap[itemName] || "/warden-dashboard";
  };

  const isActiveRoute = (itemName) => {
    const path = getRoutePath(itemName);
    return location.pathname === path;
  };

  const layoutClass = mobile
    ? "flex h-full w-full flex-col border-r border-gray-200 bg-white px-3 py-6"
    : `sticky top-0 hidden h-screen flex-col border-r border-gray-200 bg-gradient-to-b from-blue-50 to-blue-100 px-3 py-6 transition-all duration-200 lg:flex ${
        isCollapsed ? "w-20" : "w-64"
      }`;

  return (
    <aside className={layoutClass}>
      <div className="mb-8 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${isCollapsed ? "justify-center" : ""}`}>
          <span className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 text-white shadow-lg">
            <Building className="h-5 w-5" aria-hidden="true" />
          </span>
          {!isCollapsed && (
            <div>
              <h2 className="text-sm font-bold tracking-tight text-blue-900">
                HU Warden
              </h2>
              <p className="text-xs text-blue-600">Management</p>
            </div>
          )}
        </div>
        {!mobile && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-200 hover:text-blue-900"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav aria-label="Warden dashboard navigation" className="flex-1">
        <p className={`mb-4 text-xs font-semibold uppercase tracking-wider text-blue-700 ${isCollapsed ? "text-center" : ""}`}>
          {isCollapsed ? "Menu" : "Quick Access"}
        </p>
        <ul className="space-y-2">
          {(items || []).map((item) => {
            const IconComponent = iconMap[item] || ShieldCheck;
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => navigate(getRoutePath(item))}
                  className={`flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    isActiveRoute(item)
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-blue-900 hover:bg-blue-200"
                  } ${isCollapsed ? "justify-center" : "justify-start"}`}
                  title={isCollapsed ? item : ""}
                >
                  <IconComponent className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {!isCollapsed && <span className="ml-3">{item}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-blue-200 pt-4">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-blue-900 transition-all duration-200 hover:bg-blue-200"
          title={isCollapsed ? "Logout" : ""}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
