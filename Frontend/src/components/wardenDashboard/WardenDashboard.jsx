import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Building2, BedDouble, DoorOpen, Clock3, MessageSquareWarning } from "lucide-react";
import { Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import StatusBadge from "./StatusBadge";
import TopNavbar from "./TopNavbar";
import "./wardenScope.css";
import { sidebarItems } from "./mockData";
import { fetchWardenOverview, fetchWardenProfile } from "../../redux/wardenSlice";
import { getWardenComplaintsApi, getWardenOutpassesApi } from "./constants/wardenApi";

function WardenDashboard() {
  const dispatch = useDispatch();
  const wardenProfile = useSelector((state) => state.warden.profile);
  const overview = useSelector((state) => state.warden.overview);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pendingOutpasses, setPendingOutpasses] = useState([]);
  const [pendingComplaints, setPendingComplaints] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState("");

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

  useEffect(() => {
    dispatch(fetchWardenProfile());
    dispatch(fetchWardenOverview());
  }, [dispatch]);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        setListsLoading(true);
        setListsError("");
        const [outpassPayload, complaintPayload] = await Promise.all([
          getWardenOutpassesApi({ status: "Pending" }),
          getWardenComplaintsApi({ status: "pending" }),
        ]);

        setPendingOutpasses(
          Array.isArray(outpassPayload?.outpasses) ? outpassPayload.outpasses.slice(0, 6) : []
        );
        setPendingComplaints(
          Array.isArray(complaintPayload?.complaints) ? complaintPayload.complaints.slice(0, 6) : []
        );
      } catch (err) {
        setListsError(err?.response?.data?.message || "Failed to load live activity.");
        setPendingOutpasses([]);
        setPendingComplaints([]);
      } finally {
        setListsLoading(false);
      }
    };

    fetchLists();
  }, []);

  const profile = useMemo(
    () => ({
      name: wardenProfile?.name || "Warden",
      role: wardenProfile?.role || "warden",
    }),
    [wardenProfile]
  );

  const statCards = useMemo(
    () => [
      {
        id: "total-rooms",
        title: "Total Rooms",
        value: Number(overview?.totalRooms || 0),
        delta: "Across assigned hostels",
        icon: Building2,
      },
      {
        id: "occupied-rooms",
        title: "Occupied Rooms",
        value: Number(overview?.occupiedRooms || 0),
        delta: "Currently occupied",
        icon: BedDouble,
      },
      {
        id: "active-outpass",
        title: "Students Currently Outside",
        value: Number(overview?.studentsOutside || 0),
        delta: "Exited (active)",
        icon: DoorOpen,
      },
      {
        id: "pending-complaints",
        title: "Pending Complaints",
        value: Number(overview?.pendingComplaints || 0),
        delta: "Awaiting action",
        icon: MessageSquareWarning,
      },
      {
        id: "pending-outpass",
        title: "Pending Outpass Requests",
        value: Number(overview?.pendingOutpass || 0),
        delta: "Awaiting approval",
        icon: Clock3,
      },
    ],
    [overview]
  );

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const normalizeComplaintStatus = (value) => {
    const statusRaw = String(value || "").toLowerCase();
    if (statusRaw === "in-progress") return "In Progress";
    if (statusRaw === "resolved") return "Resolved";
    if (statusRaw === "rejected") return "Rejected";
    return "Pending";
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
            <section aria-label="Dashboard Overview" className="space-y-6">
              <header>
                <h2 className="text-lg font-semibold text-gray-900">Dashboard Overview</h2>
                <p className="text-sm text-gray-600">Live hostel operations snapshot.</p>
              </header>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {statCards.map((card) => (
                  <StatCard key={card.id} {...card} />
                ))}
              </div>

              {listsError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {listsError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <header className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-5 w-5 text-blue-600" aria-hidden="true" />
                      <h3 className="text-base font-semibold text-gray-900">Pending Outpass Requests</h3>
                    </div>
                    <Link to="/warden-outpass" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                      View all
                    </Link>
                  </header>

                  {listsLoading ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-blue-50/40 p-10 text-center text-sm text-gray-600">
                      Loading outpasses...
                    </div>
                  ) : pendingOutpasses.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-600">
                      No pending outpass requests.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {pendingOutpasses.map((op) => (
                        <li key={op.id} className="flex items-start justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {op?.student?.name || op?.student?.enrollmentNumber || "Student"}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-600">
                              {op?.room?.roomNumber ? `Room ${op.room.roomNumber}` : "Room —"} ·{" "}
                              {formatDateTime(op?.fromDate)} ? {formatDateTime(op?.toDate)}
                            </p>
                            {(op?.destination || op?.reason) && (
                              <p className="mt-1 truncate text-xs text-gray-500">
                                {op?.destination || op?.reason}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <StatusBadge status={op?.status || "Pending"} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <header className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MessageSquareWarning className="h-5 w-5 text-orange-600" aria-hidden="true" />
                      <h3 className="text-base font-semibold text-gray-900">Pending Complaints</h3>
                    </div>
                    <Link to="/warden-complaints" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                      View all
                    </Link>
                  </header>

                  {listsLoading ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-blue-50/40 p-10 text-center text-sm text-gray-600">
                      Loading complaints...
                    </div>
                  ) : pendingComplaints.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-600">
                      No pending complaints.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {pendingComplaints.map((doc) => {
                        const status = normalizeComplaintStatus(doc?.status);
                        const studentName =
                          doc?.student?.user?.name || doc?.student?.enrollmentNumber || "Student";
                        const roomLabel = doc?.room?.roomNumber ? `Room ${doc.room.roomNumber}` : "Room —";
                        return (
                          <li key={doc?._id} className="flex items-start justify-between gap-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">{studentName}</p>
                              <p className="mt-0.5 text-xs text-gray-600">
                                {roomLabel} · {String(doc?.issueType || "Complaint")}
                              </p>
                              {doc?.description && (
                                <p className="mt-1 truncate text-xs text-gray-500">{doc.description}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                {status}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default WardenDashboard;
