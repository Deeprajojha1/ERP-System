import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CalendarDays, Utensils, Clock4, Building2 } from "lucide-react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { sidebarItems } from "./mockData";
import { fetchWardenHostels, fetchWardenProfile } from "../../redux/wardenSlice";
import axiosInstance from "../../utils/axiosInstance";
import "./wardenScope.css";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const safeText = (value) => String(value || "").trim();

const normalizeTime = (value, fallback) => (safeText(value) ? safeText(value) : fallback);

function FoodMenu() {
  const dispatch = useDispatch();
  const profileState = useSelector((state) => state.warden.profile);
  const hostels = useSelector((state) => state.warden.hostels);
  const hostelsLoading = useSelector((state) => state.warden.loading.hostels);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState("");
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [menu, setMenu] = useState({ hostelName: "", foodMenu: [] });

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const profile = useMemo(
    () => ({
      name: profileState?.name || "Warden",
      role: profileState?.role || "warden",
    }),
    [profileState]
  );

  useEffect(() => {
    dispatch(fetchWardenProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!hostelsLoading && (!Array.isArray(hostels) || hostels.length === 0)) {
      dispatch(fetchWardenHostels());
    }
  }, [dispatch, hostels, hostelsLoading]);

  useEffect(() => {
    if (selectedHostelId) return;
    const firstId = Array.isArray(hostels) && hostels[0]?.id ? String(hostels[0].id) : "";
    if (firstId) setSelectedHostelId(firstId);
  }, [hostels, selectedHostelId]);

  useEffect(() => {
    const fetchMenu = async () => {
      const hostelId = String(selectedHostelId || "").trim();
      if (!hostelId) {
        setMenu({ hostelName: "", foodMenu: [] });
        setMenuError("");
        setMenuLoading(false);
        return;
      }

      try {
        setMenuLoading(true);
        setMenuError("");
        const response = await axiosInstance.get(`/api/hostels/${hostelId}/menu`);
        setMenu({
          hostelName: response?.data?.hostelName || "",
          foodMenu: Array.isArray(response?.data?.foodMenu) ? response.data.foodMenu : [],
        });
      } catch (error) {
        setMenuError(error?.response?.data?.message || "Failed to load food menu.");
        setMenu({ hostelName: "", foodMenu: [] });
      } finally {
        setMenuLoading(false);
      }
    };

    fetchMenu();
  }, [selectedHostelId]);

  const menuByDay = useMemo(() => {
    const map = new Map();
    (Array.isArray(menu.foodMenu) ? menu.foodMenu : []).forEach((entry) => {
      const day = safeText(entry?.day);
      if (day) map.set(day, entry);
    });

    return DAY_ORDER.map((day) => {
      const hit = map.get(day) || {};
      return {
        day,
        breakfast: safeText(hit.breakfast),
        lunch: safeText(hit.lunch),
        snacks: safeText(hit.snacks),
        dinner: safeText(hit.dinner),
        breakfastTime: normalizeTime(hit.breakfastTime, "07:30 AM"),
        lunchTime: normalizeTime(hit.lunchTime, "01:00 PM"),
        snacksTime: normalizeTime(hit.snacksTime, "05:00 PM"),
        dinnerTime: normalizeTime(hit.dinnerTime, "08:00 PM"),
        notes: safeText(hit.notes),
      };
    });
  }, [menu.foodMenu]);

  const hostelOptions = useMemo(() => (Array.isArray(hostels) ? hostels : []), [hostels]);

  return (
    <div className="warden-scope min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#eef4ff] to-[#f4f7fb] text-gray-900">
      <div className="flex">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
          items={sidebarItems}
        />

        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            />
            <div className="relative h-full w-72 border-r border-gray-200 bg-white p-4 shadow-xl">
              <Sidebar
                isCollapsed={false}
                onToggle={() => setIsMobileSidebarOpen(false)}
                items={sidebarItems}
                mobile
              />
            </div>
          </div>
        )}

        <div className="min-h-screen flex-1">
          <TopNavbar
            currentDate={currentDate}
            profile={profile}
            onMobileMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          <main className="p-6">
            <section className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Food Menu</h1>
              <p className="mt-2 text-gray-600">View the day-wise mess menu for assigned hostels.</p>
            </section>

            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label htmlFor="hostel-select" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Hostel
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      id="hostel-select"
                      value={selectedHostelId}
                      onChange={(e) => setSelectedHostelId(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      disabled={hostelsLoading || hostelOptions.length === 0}
                    >
                      {hostelOptions.length === 0 ? (
                        <option value="">No hostels assigned</option>
                      ) : (
                        hostelOptions.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} {h.type ? `(${h.type})` : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarDays className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span className="font-semibold text-gray-900">{menu.hostelName || "—"}</span>
                </div>
              </div>
            </section>

            {menuError && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {menuError}
              </div>
            )}

            {menuLoading ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-blue-50/40 p-12 text-center">
                <Utensils className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-gray-600">Loading menu…</p>
              </div>
            ) : (
              <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {menuByDay.map((day) => (
                  <article key={day.day} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <header className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">{day.day}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        <Clock4 className="h-3.5 w-3.5" aria-hidden="true" />
                        Timings
                      </span>
                    </header>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-[#f8fbff] to-[#f3f7ff] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Breakfast</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{day.breakfast || "—"}</p>
                          </div>
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {day.breakfastTime}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-[#f8fbff] to-[#f3f7ff] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lunch</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{day.lunch || "—"}</p>
                          </div>
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {day.lunchTime}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-[#f8fbff] to-[#f3f7ff] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Snacks</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{day.snacks || "—"}</p>
                          </div>
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {day.snacksTime}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-[#f8fbff] to-[#f3f7ff] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dinner</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{day.dinner || "—"}</p>
                          </div>
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {day.dinnerTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {day.notes ? (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Notes</p>
                        <p className="mt-1 text-sm text-gray-700">{day.notes}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default FoodMenu;
