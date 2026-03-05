import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MessageSquare, Send, RefreshCw, Building2, CalendarClock } from "lucide-react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { sidebarItems } from "./mockData";
import { fetchWardenHostels, fetchWardenProfile } from "../../redux/wardenSlice";
import { createWardenStudentAlertApi, getWardenStudentAlertsApi } from "./constants/wardenApi";
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

function StudentMessages() {
  const dispatch = useDispatch();
  const profileState = useSelector((state) => state.warden.profile);
  const hostels = useSelector((state) => state.warden.hostels);
  const hostelsLoading = useSelector((state) => state.warden.loading.hostels);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({
    title: "",
    message: "",
    priority: "info",
    expiresAt: "",
  });

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

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError("");
      const payload = await getWardenStudentAlertsApi();
      setMessages(Array.isArray(payload?.alerts) ? payload.alerts : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load messages.");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = String(form.title || "").trim();
    const message = String(form.message || "").trim();
    if (!title || !message) return;

    try {
      setSubmitting(true);
      await createWardenStudentAlertApi({
        hostelId: selectedHostelId || undefined,
        title,
        message,
        priority: form.priority,
        expiresAt: form.expiresAt || undefined,
      });
      setForm({ title: "", message: "", priority: "info", expiresAt: "" });
      await loadMessages();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

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
            <section className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Student Messages</h1>
              <p className="mt-2 text-gray-600">Send special announcements to hostel students.</p>
            </section>

            <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <header className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <h2 className="text-base font-semibold text-gray-900">Send Message</h2>
              </header>

              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="grid gap-1 text-sm font-semibold text-gray-700">
                    Hostel
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <select
                        value={selectedHostelId}
                        onChange={(e) => setSelectedHostelId(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        disabled={hostelsLoading || hostelOptions.length === 0}
                        required
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
                  </label>

                  <label className="grid gap-1 text-sm font-semibold text-gray-700">
                    Priority
                    <select
                      value={form.priority}
                      onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm font-semibold text-gray-700">
                    Expires At (optional)
                    <div className="relative">
                      <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={form.expiresAt}
                        onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </label>
                </div>

                <label className="grid gap-1 text-sm font-semibold text-gray-700">
                  Title
                  <input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Example: Mess timing changed today"
                    maxLength={120}
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-gray-700">
                  Message
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    className="min-h-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Write the full message…"
                    maxLength={2000}
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {submitting ? "Sending…" : "Send to Students"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <header className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Sent Messages</h2>
                  <p className="text-sm text-gray-600">Students will see these in their notifications.</p>
                </div>
                <button
                  type="button"
                  onClick={loadMessages}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-blue-50"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                  Refresh
                </button>
              </header>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-blue-50/40 p-10 text-center text-sm text-gray-600">
                  Loading messages…
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-600">
                  No messages sent yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {messages.map((m) => (
                    <li key={m._id} className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                          <p className="mt-1 text-sm text-gray-700">{m.message}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDateTime(m.createdAt)} {m.expiresAt ? `· Expires: ${formatDateTime(m.expiresAt)}` : ""}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          {String(m.priority || "info")}
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

export default StudentMessages;

