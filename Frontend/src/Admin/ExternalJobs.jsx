import React, { useEffect, useState, useMemo } from "react";
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import { FiRefreshCw, FiSearch, FiExternalLink, FiFilter, FiEdit, FiTrash2 } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import toast from "react-hot-toast";
import emptyStateImg from "../assets/empty-state.svg";
import "./ExternalJobs.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import AddJobModal from "./components/AddJobModal";

const ExternalJobs = () => {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("All Sources");
  const [jobType, setJobType] = useState("All Types");
  const [jobs, setJobs] = useState([]);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const apiBase = useSelector((state) => state.config.apiBase);

  const [filters, setFilters] = useState({
    keywords: "internship OR jobs",
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
        params: { ...filters, location: "India" },
        withCredentials: true,
      });
      setJobs(response.data?.jobs || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
      if (!showLoader) {
        toast.success("Jobs refreshed successfully", { icon: "✅" });
      }
    } catch (error) {
      console.error("Fetch jobs failed:", error.response?.data || error.message);
      
      // Handle 401 Unauthorized
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(false);
    setRefreshing(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleJobAdded = () => {
    fetchJobs();
    setShowAddModal(false);
    setEditingJob(null);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setShowAddModal(true);
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Are you sure you want to delete "${job.title}"?`)) {
      return;
    }

    try {
      await axios.delete(`${apiBase}/placement/manual-jobs/${job._id}`, {
        withCredentials: true,
      });
      toast.success("Job deleted successfully");
      fetchJobs();
    } catch (error) {
      console.error("Delete job failed:", error);
      toast.error(error.response?.data?.message || "Failed to delete job");
    }
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
        <div className="external-jobs-state pending app-loader-state">
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
          <p>Loading external jobs...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="external-jobs-state error">
          <img src={emptyStateImg} alt="Failed" className="external-jobs-state-img" />
          <h3>Failed to load jobs</h3>
          <p>Please try again in a moment.</p>
          <button className="btn-primary" onClick={() => fetchJobs()}>
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="external-jobs-header">
          <div>
            <h1 className="external-jobs-title">External Job Listings</h1>
            <p className="external-jobs-subtitle">
              {filtered.length} India-based internships and jobs
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="external-jobs-add-btn"
              type="button"
              onClick={() => {
                setEditingJob(null);
                setShowAddModal(true);
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <span style={{ fontSize: '18px' }}>+</span>
              Add Job
            </button>
            <button
              className="external-jobs-refresh-btn"
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? "external-jobs-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="external-jobs-search-panel">
          <form className="external-jobs-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Keywords (e.g., python developer)"
              value={filters.keywords}
              onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
              className="external-jobs-input"
            />
            <input
              type="text"
              placeholder="Location (India only)"
              value="India"
              disabled
              className="external-jobs-input"
            />
            <button type="submit" className="btn-primary">
              <FiSearch />
              Search
            </button>
          </form>
        </div>

        <div className="external-jobs-panel">
          <div className="external-jobs-filters">
            <div className="external-jobs-search">
              <span className="external-jobs-search-icon" aria-hidden="true">
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
              className="external-jobs-select"
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
              className="external-jobs-select"
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

          <div className="external-jobs-grid">
            {filtered.length === 0 ? (
              <div className="external-jobs-empty-state">
                <img src={emptyStateImg} alt="No data" />
                <h3>No jobs found</h3>
                <p>Try adjusting your search criteria.</p>
              </div>
            ) : (
              filtered.map((job, index) => (
                <div key={`${job.externalId}-${index}`} className="external-job-card">
                  <div className="external-job-header">
                    <div className="external-job-source-badge">{job.source}</div>
                    {job.isRemote && (
                      <div className="external-job-remote-badge">Remote</div>
                    )}
                  </div>
                  
                  <h3 className="external-job-title">{job.title}</h3>
                  
                  <div className="external-job-company">
                    {job.companyLogo && (
                      <img
                        src={job.companyLogo}
                        alt={typeof job.company === 'string' ? job.company : job.company?.name || 'Company'}
                        className="external-job-logo"
                      />
                    )}
                    <span>{typeof job.company === 'string' ? job.company : job.company?.name || 'Not specified'}</span>
                  </div>

                  <div className="external-job-details">
                    <div className="external-job-detail-item">
                      <span className="external-job-detail-label">Location:</span>
                      <span>{job.location || "Not specified"}</span>
                    </div>
                    <div className="external-job-detail-item">
                      <span className="external-job-detail-label">Type:</span>
                      <span className="external-job-type-badge">
                        {job.jobType || "Full-time"}
                      </span>
                    </div>
                    {job.salary && typeof job.salary === 'object' && (job.salary.min || job.salary.max) && (
                      <div className="external-job-detail-item">
                        <span className="external-job-detail-label">Salary:</span>
                        <span>
                          {job.salary.min && `${job.salary.currency || "$"}${job.salary.min.toLocaleString()}`}
                          {job.salary.min && job.salary.max && " - "}
                          {job.salary.max && `${job.salary.currency || "$"}${job.salary.max.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="external-job-description">
                    {stripHtmlTags(job.description)?.substring(0, 150)}
                    {stripHtmlTags(job.description)?.length > 150 && "..."}
                  </p>

                  <div className="external-job-footer">
                    <span className="external-job-posted">
                      {job.postedDate
                        ? new Date(job.postedDate).toLocaleDateString()
                        : "Recently posted"}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {job.source === "Campus" && job._id && (
                        <>
                          <button
                            onClick={() => handleEdit(job)}
                            className="external-job-edit-btn"
                            title="Edit job"
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '13px'
                            }}
                          >
                            <FiEdit size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(job)}
                            className="external-job-delete-btn"
                            title="Delete job"
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '13px'
                            }}
                          >
                            <FiTrash2 size={14} />
                            Delete
                          </button>
                        </>
                      )}
                      <a
                        href={job.externalUrl || job.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="external-job-apply-btn"
                        onClick={(e) => {
                          const jobUrl = job.externalUrl || job.url;
                          if (!jobUrl) {
                            e.preventDefault();
                            console.error("Job URL missing:", job);
                            alert("Job URL not available");
                          }
                        }}
                      >
                        <FiExternalLink />
                        View Job
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="external-jobs-page">
      {renderState()}
      <AddJobModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingJob(null);
        }}
        onJobAdded={handleJobAdded}
        editingJob={editingJob}
      />
    </div>
  );
};

export default ExternalJobs;
