import React, { useMemo, useState } from "react";
import { FiFilter, FiDownloadCloud, FiShare2 } from "react-icons/fi";
import { MdOutlineAssessment } from "react-icons/md";
import "./ReportsHub.css";

const RANGE_OPTIONS = ["This Month", "Quarter to Date", "Academic Year"];
const DATASETS = ["Collections", "Scholarships", "Transport", "Hostel"];

const HISTORY = [
  {
    id: "RPT-9821",
    title: "Monthly Fee Ledger",
    range: "Jan 2026",
    size: "3.4 MB",
    status: "Completed",
  },
  {
    id: "RPT-9815",
    title: "Scholarship Impact",
    range: "Q3 2025",
    size: "2.1 MB",
    status: "Processing",
  },
  {
    id: "RPT-9809",
    title: "Hostel Recovery",
    range: "FY 24-25",
    size: "1.9 MB",
    status: "Failed",
  },
];

const ReportsHub = () => {
  const [range, setRange] = useState(RANGE_OPTIONS[0]);
  const [dataset, setDataset] = useState(DATASETS[0]);
  const [keyword, setKeyword] = useState("");

  const filteredHistory = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return HISTORY;
    return HISTORY.filter((record) =>
      record.title.toLowerCase().includes(needle)
    );
  }, [keyword]);

  return (
    <div className="reports-hub-page">
      <header className="reports-hero">
        <div>
          <p className="reports-eyebrow">Analytics & Reports</p>
          <h1>Reports Hub</h1>
          <p className="reports-supporting">
            Generate curated exports, rerun saved recipes, and share datasets with finance and audit teams.
          </p>
        </div>
        <button type="button" className="reports-primary-btn">
          <FiDownloadCloud />
          <span>Generate Export</span>
        </button>
      </header>

      <section className="reports-filters">
        <div className="reports-filter-group">
          <label>Reporting Range</label>
          <div className="reports-pill-group">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`reports-pill ${option === range ? "is-active" : ""}`}
                onClick={() => setRange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <label className="reports-select">
          <span>Dataset</span>
          <select value={dataset} onChange={(event) => setDataset(event.target.value)}>
            {DATASETS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="reports-search">
          <span>Search History</span>
          <input
            type="search"
            placeholder="Search by recipe name"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
      </section>

      <section className="reports-summary-grid">
        <article className="reports-summary-card">
          <span className="reports-summary-icon">
            <MdOutlineAssessment />
          </span>
          <div>
            <p>Total exports this month</p>
            <strong>26 packages</strong>
            <small>Avg ready time 42s</small>
          </div>
        </article>
        <article className="reports-summary-card">
          <span className="reports-summary-icon">
            <FiShare2 />
          </span>
          <div>
            <p>Shared recipes</p>
            <strong>12 active</strong>
            <small>4 scheduled weekly</small>
          </div>
        </article>
      </section>

      <section className="reports-history">
        <div className="reports-history-head">
          <div>
            <h2>Recent exports</h2>
            <p>Track delivery status across your latest datasets.</p>
          </div>
          <button type="button" className="reports-outlined-btn">
            <FiFilter />
            <span>Automation Rules</span>
          </button>
        </div>
        <div className="reports-history-list">
          {filteredHistory.map((record) => (
            <article key={record.id} className="reports-history-row">
              <div>
                <p className="reports-history-title">{record.title}</p>
                <small>{record.range}</small>
              </div>
              <p>{record.size}</p>
              <span className={`reports-status status-${record.status.toLowerCase()}`}>
                {record.status}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ReportsHub;
