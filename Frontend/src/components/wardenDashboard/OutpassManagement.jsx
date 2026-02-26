import { useMemo, useState } from "react";
import {
  CheckCircle,
  FileText,
  Clock,
  AlertTriangle,
  Eye,
  Filter,
  Calendar as CalendarIcon,
} from "lucide-react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import StatCard from "./StatCard";
import OutpassDrawer from "./OutpassDrawer";
import StatusBadge from "./StatusBadge";
import { 
  outpassesData, 
  getOutpassStats
} from "./outpassMockData";
import { profile, sidebarItems } from "./mockData";

function OutpassManagement() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedOutpass, setSelectedOutpass] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [outpasses, setOutpasses] = useState(outpassesData);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

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

  const stats = useMemo(() => getOutpassStats(outpasses), [outpasses]);

  const summaryCards = [
    {
      id: "approved-count",
      title: "Approved Outpasses",
      value: stats.approved,
      delta: "Currently active",
      icon: CheckCircle,
    },
    {
      id: "total-outpasses",
      title: "Total Outpasses Taken",
      value: stats.total,
      delta: `${stats.returned} completed`,
      icon: FileText,
    },
    {
      id: "pending-requests",
      title: "Pending Requests",
      value: stats.pending,
      delta: "Awaiting approval",
      icon: Clock,
    },
    {
      id: "overdue-returns",
      title: "Overdue Returns",
      value: stats.overdue,
      delta: stats.overdue > 0 ? "⚠️ Action required" : "All clear",
      icon: AlertTriangle,
    },
  ];

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle status change
  const handleStatusChange = (outpassId, newStatus, remarks) => {
    // TODO: API Integration - PATCH /api/warden/outpasses/:id
    // Make API call: updateOutpass(outpassId, { status: newStatus, remarks, updatedAt: new Date() })
    
    setOutpasses((prevOutpasses) =>
      prevOutpasses.map((outpass) => {
        if (outpass.id === outpassId) {
          const newLog = {
            action: newStatus,
            timestamp: new Date().toISOString(),
            by: 'Warden - System',
            remarks: remarks || `Status updated to ${newStatus}`,
          };
          return {
            ...outpass,
            status: newStatus,
            logs: [...outpass.logs, newLog],
            updatedAt: new Date().toISOString(),
          };
        }
        return outpass;
      })
    );
    
    // Update selected outpass to show changes immediately
    setSelectedOutpass((prevOutpass) => {
      if (prevOutpass && prevOutpass.id === outpassId) {
        const newLog = {
          action: newStatus,
          timestamp: new Date().toISOString(),
          by: 'Warden - System',
          remarks: remarks || `Status updated to ${newStatus}`,
        };
        return {
          ...prevOutpass,
          status: newStatus,
          logs: [...prevOutpass.logs, newLog],
          updatedAt: new Date().toISOString(),
        };
      }
      return prevOutpass;
    });
  };

  // Filter outpasses
  const filteredOutpasses = useMemo(() => {
    let filtered = [...outpasses];

    if (statusFilter !== "all") {
      filtered = filtered.filter((op) => op.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter((op) => {
        const opDate = new Date(op.fromDate).toISOString().split("T")[0];
        return opDate >= dateFilter;
      });
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    return filtered;
  }, [statusFilter, dateFilter]);

  const handleViewDetails = (outpass) => {
    setSelectedOutpass(outpass);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedOutpass(null), 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#eef4ff] to-[#f4f7fb] text-gray-900">
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
            {/* Header */}
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Outpass Management</h1>
              <p className="text-sm text-gray-600">Monitor and manage student outpass requests</p>
            </header>

            {/* Summary Cards */}
            <section aria-label="Outpass Summary" className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <StatCard key={card.id} {...card} />
                ))}
              </div>
            </section>

            {/* Outpass History */}
            <section aria-label="Outpass History">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    <h3 className="text-lg font-semibold text-gray-900">Outpass History</h3>
                  </div>
                  <span className="text-sm text-gray-600">{filteredOutpasses.length} records</span>
                </div>

                {/* Filters */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="status-filter" className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-600">
                      <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                      Filter by Status
                    </label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Exited">Exited</option>
                      <option value="Returned">Returned</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="date-filter" className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-600">
                      <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      From Date
                    </label>
                    <input
                      type="date"
                      id="date-filter"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          From Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          To Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Destination
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredOutpasses.map((outpass) => (
                        <tr key={outpass.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDateTime(outpass.fromDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDateTime(outpass.toDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{outpass.destination}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={outpass.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(outpass)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredOutpasses.length === 0 && (
                    <div className="py-12 text-center">
                      <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" aria-hidden="true" />
                      <p className="text-lg font-semibold text-gray-600">No outpass records found</p>
                      <p className="text-sm text-gray-500">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Drawers and Modals */}
      <OutpassDrawer
        outpass={selectedOutpass}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

export default OutpassManagement;
