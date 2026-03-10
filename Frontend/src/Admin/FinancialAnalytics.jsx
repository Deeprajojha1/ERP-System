import React, { useMemo, useState } from "react";
import { FiTrendingUp, FiDownload } from "react-icons/fi";
import ClipLoader from "./components/ClipLoader";
import "./FinancialAnalytics.css";

const METRICS = [
  {
    label: "Projected Revenue",
    value: "₹12.8Cr",
    delta: "+6.2% vs LY",
  },
  {
    label: "Collected",
    value: "₹9.9Cr",
    delta: "78% collection rate",
  },
  {
    label: "Outstanding",
    value: "₹2.3Cr",
    delta: "Across 420 students",
  },
];

const PROGRAM_BREAKUP = [
  { name: "B.Tech", collected: 72, outstanding: 28 },
  { name: "MBA", collected: 64, outstanding: 36 },
  { name: "MCA", collected: 70, outstanding: 30 },
  { name: "Law", collected: 58, outstanding: 42 },
];

const FinancialAnalytics = () => {
  const [range, setRange] = useState("Monthly");
  const [focusProgram, setFocusProgram] = useState("All Programs");
  const [isExportingInsights, setIsExportingInsights] = useState(false);

  const programOptions = useMemo(
    () => ["All Programs", ...PROGRAM_BREAKUP.map((entry) => entry.name)],
    []
  );

  const handleExportInsights = async () => {
    if (isExportingInsights) return;
    setIsExportingInsights(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
    } finally {
      setIsExportingInsights(false);
    }
  };

  return (
    <div className="financial-analytics-page">
      <header className="fa-hero">
        <div>
          <p className="fa-eyebrow">Analytics & Reports</p>
          <h1>Financial Analytics</h1>
          <p>
            Monitor revenue, track program-level performance, and benchmark collection health across campuses.
          </p>
        </div>
        <button
          type="button"
          className="fa-export-btn admin-btn-with-loader"
          onClick={handleExportInsights}
          disabled={isExportingInsights}
        >
          {isExportingInsights ? (
            <>
              <ClipLoader size={15} color="#0f172a" trackColor="rgba(15, 23, 42, 0.2)" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <FiDownload />
              <span>Export Insights</span>
            </>
          )}
        </button>
      </header>

      <section className="fa-controls">
        <div className="fa-pill-group">
          {['Daily','Monthly','Quarterly','Yearly'].map((option) => (
            <button
              key={option}
              type="button"
              className={`fa-pill ${option === range ? 'is-active' : ''}`}
              onClick={() => setRange(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <select
          className="fa-select"
          value={focusProgram}
          onChange={(event) => setFocusProgram(event.target.value)}
        >
          {programOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </section>

      <section className="fa-metrics">
        {METRICS.map((metric) => (
          <article key={metric.label} className="fa-metric-card">
            <span className="fa-metric-icon">
              <FiTrendingUp />
            </span>
            <div>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <small>{metric.delta}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="fa-panels">
        <article className="fa-panel">
          <div className="fa-panel-head">
            <h2>Program Performance</h2>
            <span>{range} view</span>
          </div>
          <div className="fa-progress-list">
            {PROGRAM_BREAKUP.map((entry) => (
              <div key={entry.name} className="fa-progress-row">
                <div>
                  <p>{entry.name}</p>
                  <small>{entry.collected}% collected</small>
                </div>
                <div className="fa-progress-track">
                  <span
                    className="fa-progress-fill"
                    style={{ width: `${entry.collected}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="fa-panel fa-panel--highlight">
          <div className="fa-panel-head">
            <h2>Cashflow Outlook</h2>
            <span>Next 90 days</span>
          </div>
          <div className="fa-cashflow">
            {["Feb", "Mar", "Apr"].map((month) => (
              <div key={month} className="fa-cashflow-column">
                <span>{month}</span>
                <strong>
                  {month === "Mar" ? "₹3.8Cr" : month === "Apr" ? "₹4.2Cr" : "₹3.2Cr"}
                </strong>
                <small>+{month === "Apr" ? "8" : "5"}% vs prev</small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default FinancialAnalytics;
