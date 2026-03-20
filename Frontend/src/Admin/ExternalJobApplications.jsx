import { useEffect, useState, useMemo } from "react";
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEye,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import toast from "react-hot-toast";
import emptyStateImg from "../assets/empty-state.svg";
import "./ExternalJobApplications.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";

const ExternalJobApplications = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const apiBase = useSelector((state) => state.config.apiBase);

  const fetchApplications = async (showLoader = true) => {
    if (!apiBase) return;
    try {
      if (showLoader) setLoadState(ADMIN_LOAD_STATES.PENDING);
      
      const [appsResponse, statsResponse] = await Promise.all([
        axios.get(`${apiBase}/placement/external-applications`, {
          withCredentials: true,
        }),
        axios.get(`${apiBase}/placement/external-applications/stats`, {
          withCredentials: true,
        }),
      ]);

      setApplications(appsResponse.data?.applications || []);
      setStats(statsResponse.data?.stats || null);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
      
      if (!showLoader) {
        toast.success("Applications refreshed", { icon: "✅" });
      }
    } catch (error) {
      console.error("Fetch applications failed:", error);
      toast.error(error.response?.data?.message || "Failed to load applications");
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [apiBase]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchApplications(false);
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const term = search.toLowerCase();
      const studentName = app.student?.user?.name?.toLowerCase() || "";
      const studentEmail = app.student?.user?.email?.toLowerCase() || "";
      const jobTitle = app.externalJob?.title?.toLowerCase() || "";
      const company = app.externalJob?.company?.toLowerCase() || "";
      
      const matchSearch =
        studentName.includes(term) ||
        studentEmail.includes(term) ||
        jobTitle.includes(term) ||
        company.includes(term);
      
      const matchStatus =
        statusFilter === "All Status" || app.status === statusFilter;
      
      const matchSource =
        sourceFilter === "All Sources" || app.externalJob?.source === sourceFilter;

      return matchSearch && matchStatus && matchSource;
    });
  }, [applications, search, statusFilter, sourceFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStartIndex = (page - 1) * pageSize;
  const paginatedApps = filtered.slice(pageStartIndex, pageStartIndex + pageSize);
  const rangeStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sourceFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const sources = useMemo(() => {
    const uniqueSources = [...new Set(applications.map((a) => a.externalJob?.source))];
    return uniqueSources.filter(Boolean);
  }, [applications]);

  const statuses = [
    "interested",
    "redirected",
    "applied",
    "interview-scheduled",
    "rejected",
    "offer-received",
    "offer-accepted",
    "offer-declined",
  ];

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      interested: "status-info",
      redirected: "status-warning",
      applied: "status-primary",
      "interview-scheduled": "status-success",
      rejected: "status-danger",
      "offer-received": "status-success",
      "offer-accepted": "status-success",
      "offer-declined": "status-danger",
    };
    return statusMap[status] || "status-default";
  };

  const exportToCSV = () => {
    const headers = [
      "Student Name",
      "Email",
      "Department",
      "Job Title",
      "Company",
      "Source",
      "Status",
      "Applied Date",
      "Location",
      "Job Type",
    ];

    const rows = filtered.map((app) => [
      app.student?.user?.name || "N/A",
      app.student?.user?.email || "N/A",
      app.student?.department?.name || "N/A",
      app.externalJob?.title || "N/A",
      app.externalJob?.company || "N/A",
      app.externalJob?.source || "N/A",
      app.status || "N/A",
      app.clickedAt ? new Date(app.clickedAt).toLocaleDateString() : "N/A",
      app.externalJob?.location || "N/A",
      app.externalJob?.jobType || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `external-job-applications-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="external-apps-state pending app-loader-state">
          <Oval
            height={64}
            width={64}
            color="#2563eb"
            secondaryColor="#bfdbfe"
            strokeWidth={4}
            strokeWidthSecondary={4}
            ariaLabel="Loading"
            visible
          />
          <p>Loading applications...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="external-apps-state error app-error-state">
          <img src={emptyStateImg} alt="Failed" className="external-apps-state-img" />
          <h3>Failed to load applications</h3>
          <p>Please try again in a moment.</p>
          <button className="app-btn-primary" onClick={() => fetchApplications()}>
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        {stats && (
          <div className="external-apps-stats">
            <div className="external-apps-stat-card">
              <div className="external-apps-stat-value">{stats.totalApplications}</div>
              <div className="external-apps-stat-label">Total Applications</div>
            </div>
            <div className="external-apps-stat-card">
              <div className="external-apps-stat-value">{stats.uniqueStudents}</div>
              <div className="external-apps-stat-label">Students Applied</div>
            </div>
            <div className="external-apps-stat-card">
              <div className="external-apps-stat-value">{stats.recentApplications}</div>
              <div className="external-apps-stat-label">Last 7 Days</div>
            </div>
            <div className="external-apps-stat-card">
              <div className="external-apps-stat-value">
                {stats.bySource?.length || 0}
              </div>
              <div className="external-apps-stat-label">Job Sources</div>
            </div>
          </div>
        )}

        <div className="external-apps-header">
          <div>
            <h1 className="external-apps-title">External Job Applications</h1>
            <p className="external-apps-subtitle">
              {filtered.length} applications from students
            </p>
          </div>
          <div className="external-apps-header-actions">
            <button
              className="app-btn-secondary"
              type="button"
              onClick={exportToCSV}
              disabled={filtered.length === 0}
            >
              <FiDownload />
              Export CSV
            </button>
            <button
              className="app-btn-primary"
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? "app-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="external-apps-filters">
          <div className="external-apps-filter-search">
            <span className="external-apps-search-icon">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search by student, job title, or company"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="external-apps-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All Status">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
          <select
            className="external-apps-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="All Sources">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="external-apps-table-container">
          {filtered.length === 0 ? (
            <div className="external-apps-empty-state">
              <img src={emptyStateImg} alt="No data" />
              <h3>No applications found</h3>
              <p>Students haven't applied to any external jobs yet.</p>
            </div>
          ) : (
            <table className="external-apps-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Applied Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedApps.map((app) => (
                  <tr key={app._id}>
                    <td>
                      <div className="external-apps-student-info">
                        <div className="external-apps-student-name">
                          {app.student?.user?.name || "N/A"}
                        </div>
                        <div className="external-apps-student-email">
                          {app.student?.user?.email || "N/A"}
                        </div>
                        <div className="external-apps-student-dept">
                          {app.student?.department?.name || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="external-apps-job-title">
                        {app.externalJob?.title || "N/A"}
                      </div>
                      <div className="external-apps-job-type">
                        {app.externalJob?.jobType || "N/A"}
                      </div>
                    </td>
                    <td>{app.externalJob?.company || "N/A"}</td>
                    <td>
                      <span className="external-apps-source-badge">
                        {app.externalJob?.source || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className={`external-apps-status-badge ${getStatusBadgeClass(app.status)}`}>
                        {app.status?.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </td>
                    <td>
                      {app.clickedAt
                        ? new Date(app.clickedAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>
                      <button
                        className="external-apps-action-btn"
                        onClick={() => window.open(app.externalJob?.externalUrl, "_blank")}
                        title="View Job"
                      >
                        <FiEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="external-apps-pagination">
            <button
              type="button"
              className="external-apps-page-btn"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              <FiChevronLeft aria-hidden="true" />
              <span>Prev</span>
            </button>
            <div className="external-apps-page-info">
              {rangeStart} to {rangeEnd} of {filtered.length}
            </div>
            <button
              type="button"
              className="external-apps-page-btn"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              <span>Next</span>
              <FiChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
      </>
    );
  };

  return <div className="external-apps-page">{renderState()}</div>;
};

export default ExternalJobApplications;
