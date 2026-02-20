import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiFilter, FiRefreshCw, FiSearch, FiCheckCircle, FiClock } from "react-icons/fi";
import "./StudentRecords.css";

const STUDENT_RECORDS = [
  {
    id: "2021CS001",
    name: "Kunal Raman",
    program: "B.Tech - Computer Science",
    cohort: "2021-25",
    feeCycle: "Semester",
    mappingPolicy: "Merit + Need",
    lastSynced: "2024-09-18 10:22",
    status: "Synced",
  },
  {
    id: "2022CS015",
    name: "Aanya Pillai",
    program: "B.Tech - Computer Science",
    cohort: "2022-26",
    feeCycle: "Annual",
    mappingPolicy: "Sibling Waiver",
    lastSynced: "2024-09-18 09:14",
    status: "Pending",
  },
  {
    id: "2023EC021",
    name: "Rudra Kapoor",
    program: "B.Tech - Electronics",
    cohort: "2023-27",
    feeCycle: "Semester",
    mappingPolicy: "Merit Scholarship",
    lastSynced: "2024-09-17 18:45",
    status: "Synced",
  },
  {
    id: "2022ME011",
    name: "Meera Sharma",
    program: "B.Tech - Mechanical",
    cohort: "2022-26",
    feeCycle: "Annual",
    mappingPolicy: "Sports Quota",
    lastSynced: "2024-09-17 16:02",
    status: "Pending",
  },
];

const STATUS_COLORS = {
  Synced: "synced",
  Pending: "pending",
};

const StudentRecords = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [refreshMessage, setRefreshMessage] = useState("");
  const refreshTimerRef = useRef(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [smartFilterDraft, setSmartFilterDraft] = useState({ cohort: "all", feeCycle: "all" });
  const [smartFilter, setSmartFilter] = useState(null);

  const cohortOptions = useMemo(
    () => Array.from(new Set(STUDENT_RECORDS.map((record) => record.cohort))),
    []
  );
  const feeCycleOptions = useMemo(
    () => Array.from(new Set(STUDENT_RECORDS.map((record) => record.feeCycle))),
    []
  );

  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return STUDENT_RECORDS.filter((record) => {
      const matchesSearch = needle
        ? record.name.toLowerCase().includes(needle) ||
          record.id.toLowerCase().includes(needle) ||
          record.program.toLowerCase().includes(needle)
        : true;
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      const matchesCohort =
        !smartFilter ||
        smartFilter.cohort === "all" ||
        record.cohort === smartFilter.cohort;
      const matchesCycle =
        !smartFilter ||
        smartFilter.feeCycle === "all" ||
        record.feeCycle === smartFilter.feeCycle;
      return matchesSearch && matchesStatus && matchesCohort && matchesCycle;
    });
  }, [search, statusFilter, smartFilter]);

  const hasSmartFilter = Boolean(
    smartFilter &&
    (smartFilter.cohort !== "all" || smartFilter.feeCycle !== "all")
  );

  const smartFilterSummary = useMemo(() => {
    if (!hasSmartFilter || !smartFilter) return "";
    const parts = [];
    if (smartFilter.cohort !== "all") {
      parts.push(`Cohort ${smartFilter.cohort}`);
    }
    if (smartFilter.feeCycle !== "all") {
      parts.push(`${smartFilter.feeCycle} cycle`);
    }
    return parts.join(" • ");
  }, [hasSmartFilter, smartFilter]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshMessage("Sync in progress...");
    refreshTimerRef.current = window.setTimeout(() => {
      const stamp = new Date();
      setIsRefreshing(false);
      setLastRefreshAt(stamp);
      setRefreshMessage(
        `Last synced at ${stamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      );
    }, 1500);
  };

  const handleOpenFilter = () => {
    setSmartFilterDraft({
      cohort: smartFilter?.cohort || "all",
      feeCycle: smartFilter?.feeCycle || "all",
    });
    setIsFilterModalOpen(true);
  };

  const handleApplySmartFilter = (event) => {
    event.preventDefault();
    setSmartFilter({ ...smartFilterDraft });
    setIsFilterModalOpen(false);
  };

  const handleDraftChange = (field, value) => {
    setSmartFilterDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearSmartFilter = () => {
    setSmartFilter(null);
    setSmartFilterDraft({ cohort: "all", feeCycle: "all" });
  };

  return (
    <div className="student-records-page">
      <header className="sr-hero">
        <div>
          <p className="sr-eyebrow">Student Management</p>
          <h1>Mapped Records Overview</h1>
          <p className="sr-supporting">
            Review fee mapping metadata for every student record, spot pending syncs, and trigger updates.
          </p>
        </div>
        <div className="sr-hero-actions">
          <button
            type="button"
            className="sr-ghost-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <FiRefreshCw className={isRefreshing ? "is-rotating" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Refresh Sync"}</span>
          </button>
          <button
            type="button"
            className="sr-primary-btn"
            onClick={handleOpenFilter}
          >
            <FiFilter />
            <span>Create Smart Filter</span>
          </button>
        </div>
        {(refreshMessage || lastRefreshAt) && (
          <p className="sr-refresh-meta">{refreshMessage || "Ready for next sync"}</p>
        )}
      </header>

      <section className="sr-controls">
        <div className="sr-search">
          <FiSearch />
          <input
            type="search"
            placeholder="Search by name, enrollment, or program"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="sr-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All Status</option>
          <option value="Synced">Synced</option>
          <option value="Pending">Pending</option>
        </select>
      </section>

      {hasSmartFilter && (
        <div className="sr-active-filter">
          <span>{smartFilterSummary}</span>
          <button type="button" onClick={handleClearSmartFilter}>
            Clear
          </button>
        </div>
      )}

      <section className="sr-table-card">
        <div className="sr-table-head">
          <p>Student</p>
          <p>Program / Cohort</p>
          <p>Fee Cycle</p>
          <p>Mapping Policy</p>
          <p>Last Synced</p>
          <p>Status</p>
        </div>
        <div className="sr-table-body">
          {filteredRecords.map((record) => (
            <article key={record.id} className="sr-table-row">
              <div>
                <p className="sr-student-name">{record.name}</p>
                <span className="sr-student-id">{record.id}</span>
              </div>
              <div>
                <p>{record.program}</p>
                <span className="sr-pill">{record.cohort}</span>
              </div>
              <p className="sr-text-strong">{record.feeCycle}</p>
              <p>{record.mappingPolicy}</p>
              <p>{record.lastSynced}</p>
              <div className="sr-status-cell">
                <span className={`sr-status sr-status-${STATUS_COLORS[record.status]}`}>
                  {record.status === "Synced" ? <FiCheckCircle /> : <FiClock />}
                  {record.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isFilterModalOpen && (
        <div className="sr-modal-overlay" role="dialog" aria-modal="true">
          <form className="sr-modal" onSubmit={handleApplySmartFilter}>
            <div className="sr-modal-header">
              <h3>Create Smart Filter</h3>
              <button
                type="button"
                className="sr-modal-close"
                aria-label="Close smart filter"
                onClick={() => setIsFilterModalOpen(false)}
              >
                ×
              </button>
            </div>
            <label className="sr-modal-field">
              <span>Cohort</span>
              <select
                value={smartFilterDraft.cohort}
                onChange={(event) => handleDraftChange("cohort", event.target.value)}
              >
                <option value="all">All cohorts</option>
                {cohortOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="sr-modal-field">
              <span>Fee Cycle</span>
              <select
                value={smartFilterDraft.feeCycle}
                onChange={(event) => handleDraftChange("feeCycle", event.target.value)}
              >
                <option value="all">All cycles</option>
                {feeCycleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="sr-modal-actions">
              <button
                type="button"
                className="sr-ghost-btn"
                onClick={() => setIsFilterModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="sr-primary-btn">
                Apply Filter
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentRecords;
