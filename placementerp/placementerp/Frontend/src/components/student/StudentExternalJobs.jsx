import { useEffect, useState, useMemo } from "react";
import axios from "../../utils/axiosInstance";
import { useSelector } from "react-redux";
import { FiRefreshCw, FiSearch, FiExternalLink, FiFilter, FiBriefcase } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import toast from "react-hot-toast";
import emptyStateImg from "../../assets/empty-state.svg";
import "./StudentExternalJobs.css";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";

const StudentExternalJobs = () => {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("All Sources");
  const [jobType, setJobType] = useState("All Types");
  const [jobs, setJobs] = useState([]);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);
  const [refreshing, setRefreshing] = useState(false);
  const apiBase = useSelector((state) => state.config.apiBase);

  const [filters, setFilters] = useState({
    keywords: "software developer",
    location: "India",
  });

  // Helper function to strip HTML tags from text
  const stripHtmlTags = (html) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const fetchJobs = async (showLoader = true) => {
    if (!apiBase) return;
    try {
      if (showLoader) setLoadState(ADMIN_LOAD_STATES.PENDING);
      const response = await axios.get(`${apiBase}/external-jobs`, {
        params: filters,
        withCredentials: true,
      });
      setJobs(response.data?.jobs || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
      if (!showLoader) {
        toast.success("Jobs refreshed successfully", { icon: "✅" });
      }
    } catch (error) {
      console.error("Fetch jobs failed:", error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        toast.error("Please login to view external jobs");
      } else {
        toast.error(error.response?.data?.message || "Failed to load jobs");
      }
      
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [apiBase]);

  const handleApply = async (job) => {
    try {
      const companyName = typeof job.company === 'string' ? job.company : job.company?.name || 'Not specified';
      const jobUrl = job.externalUrl || job.url;
      
      // Debug: Log the job object to see what we have
      console.log("Job object:", job);
      console.log("Job URL:", jobUrl);
      
      // Validate URL exists
      if (!jobUrl) {
        toast.error("Job URL not available");
        console.error("Job URL missing. Full job object:", job);
        return;
      }
      
      // Track the application
      await axios.post(
        `${apiBase}/placement/external-applications/track`,
        {
          externalId: job.externalId,
          source: job.source,
          title: job.title,
          company: companyName,
          companyLogo: job.companyLogo || (typeof job.company === 'object' ? job.company?.logo : null),
          location: job.location,
          jobType: job.jobType,
          salary: job.salary,
          externalUrl: jobUrl,
          description: job.description,
        },
        { withCredentials: true }
      );

      toast.success("Application tracked! Opening job page...", { icon: "✅" });
      
      // Open the external job URL
      window.open(jobUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to track application:", error);
      toast.error("Failed to track application");
      // Still open the URL even if tracking fails
      const jobUrl = job.externalUrl || job.url;
      if (jobUrl) {
        window.open(jobUrl, "_blank", "noopener,noreferrer");
      } else {
        console.error("Cannot open job - URL is missing");
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(false);
    setRefreshing(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const term = search.toLowerCase();
      const companyName = typeof job.company === 'string' ? job.company : job.company?.name || '';
      const matchSearch =
        job.title?.toLowerCase().includes(term) ||
        companyName.toLowerCase().includes(term) ||
        job.location?.toLowerCase().includes(term);
      
      const matchSource =
        source === "All Sources" || job.source === source;
      
      const matchType =
        jobType === "All Types" || 
        job.jobType?.toLowerCase() === jobType.toLowerCase();

      return matchSearch && matchSource && matchType;
    });
  }, [jobs, search, source, jobType]);

  const sources = useMemo(() => {
    const uniqueSources = [...new Set(jobs.map((j) => j.source))];
    return uniqueSources.filter(Boolean);
  }, [jobs]);

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="student-external-jobs-state pending">
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
          <p>Loading job opportunities...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="student-external-jobs-state error">
          <img src={emptyStateImg} alt="Failed" className="student-external-jobs-state-img" />
          <h3>Failed to load jobs</h3>
          <p>Please try again in a moment.</p>
          <button className="student-btn-primary" onClick={() => fetchJobs()}>
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="student-external-jobs-header">
          <div className="student-external-jobs-header-content">
            <div className="student-external-jobs-icon">
              <FiBriefcase />
            </div>
            <div>
              <h1 className="student-external-jobs-title">Job Opportunities</h1>
              <p className="student-external-jobs-subtitle">
                {filtered.length} jobs from Indeed, JSearch and other sources
              </p>
            </div>
          </div>
          <button
            className="student-external-jobs-refresh-btn"
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? "student-external-jobs-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="student-external-jobs-search-panel">
          <form className="student-external-jobs-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Keywords (e.g., python developer)"
              value={filters.keywords}
              onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
              className="student-external-jobs-input"
            />
            <input
              type="text"
              placeholder="Location (e.g., India, Remote)"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="student-external-jobs-input"
            />
            <button type="submit" className="student-btn-primary">
              <FiSearch />
              Search
            </button>
          </form>
        </div>

        <div className="student-external-jobs-filters">
          <div className="student-external-jobs-filter-search">
            <span className="student-external-jobs-search-icon">
              <FiFilter />
            </span>
            <input
              type="text"
              placeholder="Filter by title, company, location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="student-external-jobs-select"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="All Sources">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="student-external-jobs-select"
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
          >
            <option value="All Types">All Types</option>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>

        <div className="student-external-jobs-grid">
          {filtered.length === 0 ? (
            <div className="student-external-jobs-empty-state">
              <img src={emptyStateImg} alt="No data" />
              <h3>No jobs found</h3>
              <p>Try adjusting your search criteria.</p>
            </div>
          ) : (
            filtered.map((job, index) => (
              <div key={`${job.externalId}-${index}`} className="student-external-job-card">
                <div className="student-external-job-header">
                  <div className={`student-external-job-source-badge ${job.source === "Campus" ? "campus-badge" : ""}`}>
                    {job.source}
                  </div>
                  {job.isRemote && (
                    <div className="student-external-job-remote-badge">Remote</div>
                  )}
                </div>
                
                <h3 className="student-external-job-title">{job.title}</h3>
                
                <div className="student-external-job-company">
                  {job.companyLogo && (
                    <img
                      src={job.companyLogo}
                      alt={typeof job.company === 'string' ? job.company : job.company?.name || 'Company'}
                      className="student-external-job-logo"
                    />
                  )}
                  <span>{typeof job.company === 'string' ? job.company : job.company?.name || 'Not specified'}</span>
                </div>

                <div className="student-external-job-details">
                  <div className="student-external-job-detail-item">
                    <span className="student-external-job-detail-label">Location:</span>
                    <span>{job.location || "Not specified"}</span>
                  </div>
                  <div className="student-external-job-detail-item">
                    <span className="student-external-job-detail-label">Type:</span>
                    <span className="student-external-job-type-badge">
                      {job.jobType || "Full-time"}
                    </span>
                  </div>
                  {job.salary && typeof job.salary === 'object' && (job.salary.min || job.salary.max) && (
                    <div className="student-external-job-detail-item">
                      <span className="student-external-job-detail-label">Salary:</span>
                      <span>
                        {job.salary.min && `${job.salary.currency || "$"}${job.salary.min.toLocaleString()}`}
                        {job.salary.min && job.salary.max && " - "}
                        {job.salary.max && `${job.salary.currency || "$"}${job.salary.max.toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>

                <p className="student-external-job-description">
                  {stripHtmlTags(job.description)?.substring(0, 150)}
                  {stripHtmlTags(job.description)?.length > 150 && "..."}
                </p>

                <div className="student-external-job-footer">
                  <span className="student-external-job-posted">
                    {job.postedDate
                      ? new Date(job.postedDate).toLocaleDateString()
                      : "Recently posted"}
                  </span>
                  <button
                    onClick={() => handleApply(job)}
                    className="student-external-job-apply-btn"
                  >
                    <FiExternalLink />
                    Apply Now
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  };

  return <div className="student-external-jobs-page">{renderState()}</div>;
};

export default StudentExternalJobs;
