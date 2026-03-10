import React, { useMemo, useState } from "react";
import { FiTrendingUp, FiDownload } from "react-icons/fi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import ClipLoader from "./components/ClipLoader";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import "./FinancialAnalytics.css";

const METRICS = [
  {
    label: "Projected Revenue",
    value: "INR 12.8 Cr",
    delta: "+6.2% vs LY",
  },
  {
    label: "Collected",
    value: "INR 9.9 Cr",
    delta: "78% collection rate",
  },
  {
    label: "Outstanding",
    value: "INR 2.3 Cr",
    delta: "Across 420 students",
  },
  {
    label: "Scholarships Awarded",
    value: "INR 1.1 Cr",
    delta: "+12% vs LY",
  },
  {
    label: "Refunds Processed",
    value: "INR 0.4 Cr",
    delta: "+5% vs LY",
  },
];

const PROGRAM_BREAKUP = [
  { name: "B.Tech", collected: 72, outstanding: 28 },
  { name: "MBA", collected: 64, outstanding: 36 },
  { name: "MCA", collected: 70, outstanding: 30 },
  { name: "Law", collected: 58, outstanding: 42 },
  { name: "BBA", collected: 80, outstanding: 20 },
  { name: "BCA", collected: 75, outstanding: 25 },
  { name: "Pharmacy", collected: 68, outstanding: 32 },
];

const INSIGHT_ROWS = [
  {
    month: "January 2026",
    expectedCollection: "INR 3.10 Cr",
    actualCollection: "INR 2.94 Cr",
    scholarshipImpact: "INR 0.22 Cr",
    refunds: "INR 0.08 Cr",
    variance: "-5.2%",
    collectionHealth: "Stable",
  },
  {
    month: "February 2026",
    expectedCollection: "INR 3.25 Cr",
    actualCollection: "INR 3.08 Cr",
    scholarshipImpact: "INR 0.24 Cr",
    refunds: "INR 0.09 Cr",
    variance: "-5.1%",
    collectionHealth: "Stable",
  },
  {
    month: "March 2026",
    expectedCollection: "INR 3.50 Cr",
    actualCollection: "INR 3.41 Cr",
    scholarshipImpact: "INR 0.27 Cr",
    refunds: "INR 0.10 Cr",
    variance: "-2.6%",
    collectionHealth: "Improving",
  },
];

const CASHFLOW_ROWS = [
  { period: "Apr 2026", inflow: "INR 4.20 Cr", outflow: "INR 0.95 Cr", net: "INR 3.25 Cr" },
  { period: "May 2026", inflow: "INR 3.90 Cr", outflow: "INR 0.88 Cr", net: "INR 3.02 Cr" },
  { period: "Jun 2026", inflow: "INR 4.05 Cr", outflow: "INR 0.91 Cr", net: "INR 3.14 Cr" },
];

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const FinancialAnalytics = () => {
  const [range, setRange] = useState("Monthly");
  const [focusProgram, setFocusProgram] = useState("All Programs");
  const [isExportingInsights, setIsExportingInsights] = useState(false);
  const apiBase = useSelector((state) => state.config.apiBase);

  const programOptions = useMemo(
    () => ["All Programs", ...PROGRAM_BREAKUP.map((entry) => entry.name)],
    []
  );

  const selectedProgramBreakup = useMemo(() => {
    if (focusProgram === "All Programs") return PROGRAM_BREAKUP;
    return PROGRAM_BREAKUP.filter((entry) => entry.name === focusProgram);
  }, [focusProgram]);

  const buildInsightsPdfHtml = (generatedAt) => {
    const metricCards = METRICS.map(
      (metric) => `
      <div class="metric-card">
        <div class="metric-label">${escapeHtml(metric.label)}</div>
        <div class="metric-value">${escapeHtml(metric.value)}</div>
        <div class="metric-delta">${escapeHtml(metric.delta)}</div>
      </div>
    `
    ).join("");

    const programRows = selectedProgramBreakup
      .map(
        (entry, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(entry.name)}</td>
        <td>${escapeHtml(`${entry.collected}%`)}</td>
        <td>${escapeHtml(`${entry.outstanding}%`)}</td>
      </tr>
    `
      )
      .join("");

    const insightRows = INSIGHT_ROWS.map(
      (row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.month)}</td>
        <td>${escapeHtml(row.expectedCollection)}</td>
        <td>${escapeHtml(row.actualCollection)}</td>
        <td>${escapeHtml(row.scholarshipImpact)}</td>
        <td>${escapeHtml(row.refunds)}</td>
        <td>${escapeHtml(row.variance)}</td>
        <td>${escapeHtml(row.collectionHealth)}</td>
      </tr>
    `
    ).join("");

    const cashflowRows = CASHFLOW_ROWS.map(
      (row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.period)}</td>
        <td>${escapeHtml(row.inflow)}</td>
        <td>${escapeHtml(row.outflow)}</td>
        <td>${escapeHtml(row.net)}</td>
      </tr>
    `
    ).join("");

    return `
      <html>
        <head>
          <style>
            @page { size: A4 portrait; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; }
            .header { border-bottom: 2px solid #0f766e; margin-bottom: 10px; padding-bottom: 8px; }
            .title { margin: 0; font-size: 22px; color: #0f766e; }
            .subtitle { margin: 4px 0 0; color: #475569; font-size: 13px; }
            .meta { margin: 10px 0 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
            .meta .item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; }
            .meta .item b { display: block; margin-bottom: 3px; color: #1e293b; }
            .metric-grid { margin: 10px 0 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
            .metric-card { border: 1px solid #ccfbf1; background: #f0fdfa; border-radius: 8px; padding: 10px; }
            .metric-label { color: #0f766e; font-size: 11px; margin-bottom: 4px; }
            .metric-value { font-size: 17px; font-weight: 700; margin-bottom: 3px; }
            .metric-delta { color: #334155; font-size: 11px; }
            h2 { margin: 14px 0 8px; font-size: 14px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; font-size: 11px; color: #0f172a; }
            .note { margin-top: 8px; color: #64748b; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">HARIDWAR UNIVERSITY - FINANCIAL ANALYTICS INSIGHTS</h1>
            <p class="subtitle">Administrative export with structured dummy KPI and projection data</p>
          </div>

          <div class="meta">
            <div class="item"><b>Generated At</b>${escapeHtml(generatedAt.toLocaleString())}</div>
            <div class="item"><b>Range</b>${escapeHtml(range)}</div>
            <div class="item"><b>Focus Program</b>${escapeHtml(focusProgram)}</div>
          </div>

          <div class="metric-grid">${metricCards}</div>

          <h2>Program Performance Summary</h2>
          <table>
            <thead>
              <tr>
                <th>S. No.</th>
                <th>Program</th>
                <th>Collected</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>${programRows}</tbody>
          </table>

          <h2>Monthly Revenue Insight (Dummy)</h2>
          <table>
            <thead>
              <tr>
                <th>S. No.</th>
                <th>Month</th>
                <th>Expected Collection</th>
                <th>Actual Collection</th>
                <th>Scholarship Impact</th>
                <th>Refunds</th>
                <th>Variance</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>${insightRows}</tbody>
          </table>

          <h2>Cashflow Outlook (Next 90 Days)</h2>
          <table>
            <thead>
              <tr>
                <th>S. No.</th>
                <th>Period</th>
                <th>Inflow</th>
                <th>Outflow</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>${cashflowRows}</tbody>
          </table>

          <p class="note">This file is generated from static dummy records for demonstration of export behavior.</p>
        </body>
      </html>
    `;
  };

  const handleExportInsights = async () => {
    if (isExportingInsights) return;
    setIsExportingInsights(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      const generatedAt = new Date();
      const html = buildInsightsPdfHtml(generatedAt);
      const dateSuffix = generatedAt.toISOString().split("T")[0];
      const programKey = focusProgram.toLowerCase().replace(/\s+/g, "-");

      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: `financial-insights-${programKey}-${dateSuffix}.pdf`,
        fallbackToPrint: true,
      });
      toast.success("Insights export generated");
    } catch (error) {
      toast.error(error?.message || "Failed to export insights");
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
          {["Daily", "Monthly", "Quarterly", "Yearly"].map((option) => (
            <button
              key={option}
              type="button"
              className={`fa-pill ${option === range ? "is-active" : ""}`}
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
                  {month === "Mar"
                    ? "INR 3.8 Cr"
                    : month === "Apr"
                    ? "INR 4.2 Cr"
                    : "INR 3.2 Cr"}
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
