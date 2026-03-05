import { FileText, AlertTriangle, Loader, CheckCircle2 } from 'lucide-react';
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import StatCard from './StatCard';
import ComplaintTable from './ComplaintTable';
import ComplaintDrawer from './ComplaintDrawer';
import { getComplaintStats } from './complaintMockData';
import { sidebarItems } from './mockData';
import { fetchWardenProfile } from "../../redux/wardenSlice";
import { getWardenComplaintsApi, updateWardenComplaintApi } from "./constants/wardenApi";
import "./wardenScope.css";

const ComplaintManagement = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state) => state.warden.profile);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const normalizeComplaint = (doc) => {
    const statusRaw = String(doc?.status || "").toLowerCase();
    const status =
      statusRaw === "in-progress" ? "In Progress" :
      statusRaw === "resolved" ? "Resolved" :
      statusRaw === "rejected" ? "Rejected" :
      "Pending";

    return {
      id: doc?._id,
      studentId: doc?.student?._id || "",
      studentName: doc?.student?.user?.name || "",
      room: doc?.room?.roomNumber ? `Room ${doc.room.roomNumber}` : "",
      issueType: doc?.issueType || "Other",
      description: doc?.description || "",
      status,
      imageUrl: doc?.imageUrl || null,
      createdAt: doc?.createdAt || null,
      updatedAt: doc?.updatedAt || null,
      remarks: doc?.remarks || "",
      timeline: Array.isArray(doc?.timeline)
        ? doc.timeline.map((t) => ({
            status:
              String(t?.status || "").toLowerCase() === "in-progress"
                ? "In Progress"
                : String(t?.status || "").toLowerCase() === "resolved"
                ? "Resolved"
                : String(t?.status || "").toLowerCase() === "rejected"
                ? "Rejected"
                : "Pending",
            timestamp: t?.changedAt || t?.timestamp || null,
            note: t?.note || "",
          }))
        : [],
      _raw: doc,
    };
  };

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const payload = await getWardenComplaintsApi();
      const list = Array.isArray(payload?.complaints) ? payload.complaints : [];
      setComplaints(list.map(normalizeComplaint));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load complaints.");
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Calculate stats
  const stats = useMemo(() => getComplaintStats(complaints), [complaints]);

  // Summary cards data
  const summaryCards = [
    {
      id: 1,
      title: 'Total Complaints',
      value: stats.total,
      icon: FileText,
      color: 'blue',
      trend: null,
    },
    {
      id: 2,
      title: 'Pending',
      value: stats.pending,
      icon: AlertTriangle,
      color: 'yellow',
      trend: null,
    },
    {
      id: 3,
      title: 'In Progress',
      value: stats.inProgress,
      icon: Loader,
      color: 'blue',
      trend: null,
    },
    {
      id: 4,
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'green',
      trend: null,
    },
  ];

  // Handle view details
  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setIsDrawerOpen(true);
  };

  // Handle status change
  const handleStatusChange = (complaintId, newStatus, remarks) => {
    const apiStatus =
      newStatus === "In Progress" ? "in-progress" :
      newStatus === "Resolved" ? "resolved" :
      newStatus === "Rejected" ? "rejected" :
      "pending";

    (async () => {
      try {
        const response = await updateWardenComplaintApi(complaintId, { status: apiStatus, remarks });
        const updatedRaw = response?.complaint;
        if (!updatedRaw?._id) return;
        const updated = normalizeComplaint(updatedRaw);
        setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setSelectedComplaint((prevSelected) => (prevSelected?.id === updated.id ? updated : prevSelected));
      } catch (err) {
        alert(err?.response?.data?.message || "Failed to update complaint status.");
      }
    })();
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedComplaint(null);
    }, 300);
  };

  return (
    <div className="warden-scope flex min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#eef4ff] to-[#f4f7fb] text-gray-900">
      {/* Desktop Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        items={sidebarItems}
      />

      {/* Mobile Sidebar Overlay */}
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

      {/* Main Content */}
      <div className="min-h-screen flex-1">
        <TopNavbar
          currentDate={currentDate}
          profile={profile}
          onMobileMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

          <main className="p-6">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Complaint Management</h1>
            <p className="text-sm text-gray-600">Report and track hostel issues</p>
          </header>

          {/* Summary Cards */}
          <section aria-label="Complaint Summary" className="mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <StatCard key={card.id} {...card} />
              ))}
            </div>
          </section>

            {/* Complaint History */}
            <section aria-label="Complaint History">
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
              {loading ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-blue-50/40 p-8 text-center text-sm text-gray-600">
                  Loading complaints...
                </div>
              ) : (
                <ComplaintTable complaints={complaints} onViewDetails={handleViewDetails} />
              )}
            </section>
        </main>
      </div>

      {/* Complaint Details Drawer */}
      <ComplaintDrawer
        complaint={selectedComplaint}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default ComplaintManagement;
