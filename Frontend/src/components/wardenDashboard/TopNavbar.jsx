import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "../../utils/axiosInstance";
import { clearUserData } from "../../redux/userSlice";
import { clearStudents } from "../../redux/studentSlice";
import { clearFaculty } from "../../redux/facultySlice";
import { clearLeaves } from "../../redux/leavesSlice";
import { clearTimetable } from "../../redux/timetableSlice";
import { clearWarden, fetchWardenHostels, fetchWardenOverview } from "../../redux/wardenSlice";
import { getWardenAlertsApi } from "./constants/wardenApi";

function TopNavbar({
  currentDate,
  profile,
  onMobileMenuToggle,
  dashboardTitle = "Warden Dashboard",
  enableWardenPanels = true,
  showSidebarToggle = true,
  enableProfileMenu = false,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const hostels = useSelector((state) => state.warden.hostels);
  const hostelsLoading = useSelector((state) => state.warden.loading.hostels);
  const overview = useSelector((state) => state.warden.overview);
  const overviewLoading = useSelector((state) => state.warden.loading.overview);
  const apiBase = useSelector((state) => state.config.apiBase);

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (!enableWardenPanels) return;
    if (!hostelsLoading && (!Array.isArray(hostels) || hostels.length === 0)) {
      dispatch(fetchWardenHostels());
    }
  }, [dispatch, hostels, hostelsLoading, enableWardenPanels]);

  useEffect(() => {
    if (!enableWardenPanels) return;
    if (!overviewLoading && !overview) {
      dispatch(fetchWardenOverview());
    }
  }, [dispatch, overview, overviewLoading, enableWardenPanels]);

  const hostelNames = useMemo(
    () => (Array.isArray(hostels) ? hostels.map((h) => h?.name).filter(Boolean) : []),
    [hostels]
  );

  const hostelLabel = useMemo(() => {
    if (hostelNames.length === 0) return "";
    if (hostelNames.length === 1) return hostelNames[0];
    return `${hostelNames[0]} +${hostelNames.length - 1}`;
  }, [hostelNames]);

  const profileInitials = useMemo(() => {
    const name = String(profile.name || "").trim();
    if (!name) return "WD";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "W";
    const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "") || "";
    return (first + last).toUpperCase();
  }, [profile.name]);

  const pendingCount = useMemo(() => {
    const pendingOutpass = Number(overview?.pendingOutpass || 0);
    const pendingComplaints = Number(overview?.pendingComplaints || 0);
    return pendingOutpass + pendingComplaints;
  }, [overview?.pendingComplaints, overview?.pendingOutpass]);

  const totalBadgeCount = pendingCount + (Array.isArray(alerts) ? alerts.length : 0);
  const badgeText = totalBadgeCount > 99 ? "99+" : String(totalBadgeCount);

  const fetchAlerts = async () => {
    if (!enableWardenPanels) {
      setAlerts([]);
      setAlertsError("");
      return;
    }
    try {
      setAlertsLoading(true);
      setAlertsError("");
      const payload = await getWardenAlertsApi();
      const list = Array.isArray(payload?.alerts) ? payload.alerts : [];
      setAlerts(list.slice(0, 8));
    } catch (error) {
      setAlertsError(error?.response?.data?.message || "Failed to load admin messages.");
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    if (!enableWardenPanels) return;
    // lightweight: only prefetch once so bell badge can reflect admin messages too
    if (alertsLoading) return;
    if (Array.isArray(alerts) && alerts.length > 0) return;
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableWardenPanels]);

  const handleLogout = async () => {
    try {
      if (apiBase) {
        await axios.post(
          `${apiBase}/user/logout`,
          {},
          {
            withCredentials: true,
            skipNetworkRedirect: true,
          }
        );
      }
    } catch (_error) {
      // Ignore logout failures; clear local state regardless.
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("token");
      }
      dispatch(clearUserData());
      dispatch(clearStudents());
      dispatch(clearFaculty());
      dispatch(clearLeaves());
      dispatch(clearTimetable());
      dispatch(clearWarden());
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-gradient-to-r from-[#f8fbff] via-[#eef5ff] to-[#f6fbff] px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showSidebarToggle && (
            <button
              type="button"
              onClick={onMobileMenuToggle}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{dashboardTitle}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
              <span>{currentDate}</span>
              {enableWardenPanels && hostelLabel && (
                <span
                  className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700"
                  title={hostelNames.join(", ")}
                >
                  {hostelNames.length > 1 ? "Hostels:" : "Hostel:"} {hostelLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {enableWardenPanels && (
            <>
              <button
                type="button"
                className="relative rounded-xl border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-blue-50"
                aria-label="Open notifications"
                title={totalBadgeCount > 0 ? `${totalBadgeCount} notifications` : "No notifications"}
                onClick={() => {
                  setIsAlertsOpen((prev) => !prev);
                  if (!isAlertsOpen && !alertsLoading) {
                    fetchAlerts();
                  }
                }}
              >
                <Bell className="h-5 w-5" />
                {totalBadgeCount > 0 && (
                  <span
                    className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white shadow"
                    aria-label={`${totalBadgeCount} notifications`}
                  >
                    {badgeText}
                  </span>
                )}
              </button>

              {isAlertsOpen && (
                <div className="absolute right-6 top-[72px] z-30 w-[min(92vw,420px)] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      <p className="text-xs text-gray-600">Admin messages + pending hostel items</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-blue-50"
                      onClick={() => setIsAlertsOpen(false)}
                      aria-label="Close notifications"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-[#f8fbff] to-[#f3f7ff] p-3">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Pending items</span>
                      <span className="font-semibold text-gray-900">{pendingCount}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {Number(overview?.pendingOutpass || 0)} outpass · {Number(overview?.pendingComplaints || 0)} complaints
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin Messages</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      onClick={fetchAlerts}
                      disabled={alertsLoading}
                    >
                      {alertsLoading ? "Loading..." : "Refresh"}
                    </button>
                  </div>

                  {alertsError && (
                    <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      {alertsError}
                    </div>
                  )}

                  {alertsLoading ? (
                    <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-blue-50/40 p-6 text-center text-sm text-gray-600">
                      Loading messages...
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
                      No admin messages right now.
                    </div>
                  ) : (
                    <ul className="mt-3 max-h-[320px] divide-y divide-gray-100 overflow-auto">
                      {alerts.map((a) => (
                        <li key={a._id} className="py-3">
                          <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-700">{a.message}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {a.createdAt ? new Date(a.createdAt).toLocaleString("en-IN") : "-"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-left transition-colors hover:bg-blue-50"
              aria-label="Open profile menu"
              onClick={() => {
                if (!enableProfileMenu) return;
                setIsProfileOpen((prev) => !prev);
              }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {profileInitials}
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-semibold text-gray-900">{profile.name}</span>
                <span className="block text-xs text-gray-600">{profile.role}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {enableProfileMenu && isProfileOpen && (
              <div className="absolute right-0 top-[56px] z-30 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;
