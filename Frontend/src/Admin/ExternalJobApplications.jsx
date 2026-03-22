import { useEffect, useState, useMemo } from "react";
import axios from "../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
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
import ClipLoader from "./components/ClipLoader";
import "./ExternalJobApplications.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import { setDepartments } from "../redux/departmentSlice";

const ExternalJobApplications = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [campusJobFilter, setCampusJobFilter] = useState("All Campus Jobs");
  const [externalJobFilter, setExternalJobFilter] = useState("All External Jobs");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [yearFilter, setYearFilter] = useState("All Years");
  const [applications, setApplications] = useState([]);
  const [campusJobsMap, setCampusJobsMap] = useState(new Map());
  const [stats, setStats] = useState(null);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const apiBase = useSelector((state) => state.config.apiBase);
  const departments = useSelector((state) => state.department?.departments || []);
  const dispatch = useDispatch();
  const debugEnabled =
    typeof window !== "undefined" &&
    String(window.location.search || "").includes("appDebug=1");

  const fetchApplications = async (showLoader = true) => {
    if (!apiBase) return;
    try {
      if (showLoader) setLoadState(ADMIN_LOAD_STATES.PENDING);
      
      const [appsResponse, statsResponse, campusJobsResponse] = await Promise.all([
        axios.get(`${apiBase}/placement/external-applications`, {
          withCredentials: true,
        }),
        axios.get(`${apiBase}/placement/external-applications/stats`, {
          withCredentials: true,
        }),
        axios.get(`${apiBase}/placement/manual-jobs`, {
          withCredentials: true,
        }),
      ]);

      setApplications(appsResponse.data?.applications || []);
      setStats(statsResponse.data?.stats || null);
      const campusJobs = campusJobsResponse.data?.jobs || [];
      setCampusJobsMap(
        new Map(campusJobs.map((job) => [String(job._id), job]))
      );
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

  useEffect(() => {
    if (!apiBase) return;
    if (departments.length > 0) return;
    const loadDepartments = async () => {
      try {
        const response = await axios.get(`${apiBase}/admin/department`, {
          params: { noCache: true },
          withCredentials: true,
        });
        dispatch(setDepartments(response.data?.departments || []));
      } catch (error) {
        console.error("Failed to load departments:", error);
      }
    };
    loadDepartments();
  }, [apiBase, departments.length, dispatch]);

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

      const isCampusJob = app.externalJob?.source === "Campus";
      const matchJob = isCampusJob
        ? campusJobFilter === "All Campus Jobs" ||
          String(app.externalJob?.externalId || "") === String(campusJobFilter)
        : externalJobFilter === "All External Jobs" ||
          String(app.externalJob?.externalId || "") === String(externalJobFilter);

      const campusJobMeta = isCampusJob
        ? campusJobsMap.get(String(app.externalJob?.externalId || ""))
        : null;
      const resolvedDepartment =
        app.externalJob?.department ||
        campusJobMeta?.department ||
        "";
      const matchDepartment =
        departmentFilter === "All Departments" ||
        String(resolvedDepartment) === String(departmentFilter);

      const studentSemester = Number(app.student?.semester || 0);
      const studentYear = studentSemester > 0 ? Math.ceil(studentSemester / 2) : 0;
      const matchYear =
        yearFilter === "All Years" || String(studentYear) === String(yearFilter);

      return matchSearch && matchStatus && matchSource && matchJob && matchDepartment && matchYear;
    });
  }, [applications, search, statusFilter, sourceFilter, campusJobFilter, externalJobFilter, departmentFilter, yearFilter, campusJobsMap]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStartIndex = (page - 1) * pageSize;
  const paginatedApps = filtered.slice(pageStartIndex, pageStartIndex + pageSize);
  const rangeStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sourceFilter, campusJobFilter, externalJobFilter, departmentFilter, yearFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const sources = useMemo(() => {
    const uniqueSources = [...new Set(applications.map((a) => a.externalJob?.source))];
    return uniqueSources.filter(Boolean);
  }, [applications]);

  const departmentOptions = useMemo(() => {
    return departments.map((dept) => ({
      id: dept._id,
      name: dept.name,
      years: Array.isArray(dept.years) ? dept.years : [],
      yearCount: Number(dept.yearCount || 0),
    }));
  }, [departments]);

  const yearOptions = useMemo(() => {
    if (departmentFilter === "All Departments") return [];
    const selected = departmentOptions.find((dept) => dept.id === departmentFilter);
    if (!selected) return [];
    if (selected.years.length > 0) return selected.years.map((value) => String(value));
    if (selected.yearCount > 0) {
      return Array.from({ length: selected.yearCount }, (_, idx) => String(idx + 1));
    }
    return [];
  }, [departmentFilter, departmentOptions]);

  const formatYearLabel = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return `Year ${value}`;
    if (num === 1) return "1st Year";
    if (num === 2) return "2nd Year";
    if (num === 3) return "3rd Year";
    return `${num}th Year`;
  };

  const jobOptions = useMemo(() => {
    const map = new Map();
    applications.forEach((app) => {
      const job = app.externalJob || {};
      if (!job.externalId) return;
      const labelParts = [job.title || "Untitled"];
      if (job.company) labelParts.push(job.company);
      map.set(String(job.externalId), labelParts.join(" · "));
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [applications]);
  const campusJobOptions = useMemo(() => {
    return jobOptions.filter((job) =>
      applications.some(
        (app) =>
          app.externalJob?.source === "Campus" &&
          String(app.externalJob?.externalId || "") === String(job.id)
      )
    );
  }, [jobOptions, applications]);
  const externalJobOptions = useMemo(() => {
    return jobOptions.filter((job) =>
      applications.some(
        (app) =>
          app.externalJob?.source !== "Campus" &&
          String(app.externalJob?.externalId || "") === String(job.id)
      )
    );
  }, [jobOptions, applications]);

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
              {refreshing ? (
                <>
                  <ClipLoader
                    size={14}
                    color="#ffffff"
                    trackColor="rgba(255, 255, 255, 0.25)"
                  />
                  Refreshing
                </>
              ) : (
                <>
                  <FiRefreshCw />
                  Refresh
                </>
              )}
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
            value={campusJobFilter}
            onChange={(e) => setCampusJobFilter(e.target.value)}
          >
            <option value="All Campus Jobs">All Campus Jobs</option>
            {campusJobOptions.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
          <select
            className="external-apps-select"
            value={externalJobFilter}
            onChange={(e) => setExternalJobFilter(e.target.value)}
          >
            <option value="All External Jobs">All External Jobs</option>
            {externalJobOptions.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
          <select
            className="external-apps-select"
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setYearFilter("All Years");
            }}
          >
            <option value="All Departments">All Departments</option>
            {departmentOptions.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <select
            className="external-apps-select"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            disabled={departmentFilter === "All Departments" || yearOptions.length === 0}
          >
            <option value="All Years">
              {departmentFilter === "All Departments" ? "Select department first" : "All Years"}
            </option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {formatYearLabel(year)}
              </option>
            ))}
          </select>
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
                {paginatedApps.map((app) => {
                  const isCampusJob = app.externalJob?.source === "Campus";
                  const campusJobMeta = isCampusJob
                    ? campusJobsMap.get(String(app.externalJob?.externalId || ""))
                    : null;
                  const resolvedDepartment =
                    app.externalJob?.department ||
                    campusJobMeta?.department ||
                    "";
                  const studentSemester = Number(app.student?.semester || 0);
                  const studentYear = studentSemester > 0 ? Math.ceil(studentSemester / 2) : 0;
                  const row = (
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
                        <div className="external-apps-student-dept">
                          Year{" "}
                          {app.student?.semester
                            ? Math.ceil(Number(app.student.semester) / 2)
                            : "N/A"}
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
                  );
                  if (!debugEnabled) return row;
                  const debugRow = (
                    <tr className="external-apps-debug-row" key={`${app._id}-debug`}>
                      <td colSpan={7}>
                        <strong>Debug:</strong>{" "}
                        Dept={String(resolvedDepartment || "N/A")} | StudentYear=
                        {studentYear || "N/A"} | ExternalId=
                        {String(app.externalJob?.externalId || "N/A")}
                      </td>
                    </tr>
                  );
                  return [row, debugRow];
                })}
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
