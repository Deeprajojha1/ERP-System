import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LifeBuoy, MessageSquare, ShieldAlert, RefreshCw } from "lucide-react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { sidebarItems } from "./mockData";
import { fetchWardenProfile } from "../../redux/wardenSlice";
import { createWardenSupportTicketApi, getWardenSupportTicketsApi } from "./constants/wardenApi";
import "./wardenScope.css";

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusChipClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "resolved") return "bg-green-100 text-green-800 ring-green-600/20";
  if (normalized === "closed") return "bg-gray-100 text-gray-800 ring-gray-600/20";
  if (normalized === "in-progress") return "bg-blue-100 text-blue-800 ring-blue-600/20";
  return "bg-yellow-100 text-yellow-800 ring-yellow-600/20";
};

function WardenSupport() {
  const dispatch = useDispatch();
  const profileState = useSelector((state) => state.warden.profile);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: "", priority: "medium", message: "" });

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

  const loadTickets = async () => {
    try {
      setListLoading(true);
      setListError("");
      const payload = await getWardenSupportTicketsApi();
      setTickets(Array.isArray(payload?.tickets) ? payload.tickets : []);
    } catch (error) {
      setListError(error?.response?.data?.message || "Failed to load tickets.");
      setTickets([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const subject = String(form.subject || "").trim();
    const message = String(form.message || "").trim();
    if (!subject || !message) return;

    try {
      setSubmitting(true);
      await createWardenSupportTicketApi({
        subject,
        message,
        priority: form.priority,
      });
      setForm({ subject: "", priority: "medium", message: "" });
      await loadTickets();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

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
            <section className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Admin Support</h1>
              <p className="mt-2 text-gray-600">Raise an issue to admin and track its status.</p>
            </section>

            <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <header className="mb-4 flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <h2 className="text-base font-semibold text-gray-900">Create Ticket</h2>
              </header>

              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="grid gap-1 text-sm font-semibold text-gray-700 md:col-span-2">
                    Subject
                    <input
                      value={form.subject}
                      onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Short summary"
                      maxLength={120}
                      required
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-gray-700">
                    Priority
                    <select
                      value={form.priority}
                      onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>

                <label className="grid gap-1 text-sm font-semibold text-gray-700">
                  Message (min 10 characters)
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    className="min-h-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Describe the issue in detail…"
                    maxLength={2000}
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
                  disabled={submitting}
                >
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {submitting ? "Submitting…" : "Submit Ticket"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <header className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-orange-600" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-gray-900">My Tickets</h2>
                </div>
                <button
                  type="button"
                  onClick={loadTickets}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-blue-50"
                  disabled={listLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                  Refresh
                </button>
              </header>

              {listError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {listError}
                </div>
              )}

              {listLoading ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-blue-50/40 p-10 text-center text-sm text-gray-600">
                  Loading tickets…
                </div>
              ) : tickets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-600">
                  No tickets yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {tickets.map((t) => (
                    <li key={t?._id || t?.id} className="flex items-start justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{t.subject}</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {formatDateTime(t.createdAt)} · {t.hostel?.name ? `Hostel: ${t.hostel.name}` : "Hostel —"}
                          {t.priority ? ` · Priority: ${String(t.priority).toUpperCase()}` : ""}
                        </p>
                        {t.message ? <p className="mt-2 line-clamp-2 text-sm text-gray-700">{t.message}</p> : null}
                      </div>
                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusChipClass(
                            t.status
                          )}`}
                        >
                          {String(t.status || "open")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default WardenSupport;

