import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrendingUp,
  FiArrowUpRight,
  FiAlertCircle,
  FiUsers,
  FiPercent,
  FiDownload,
} from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Fees.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import ClipLoader from "./components/ClipLoader";

const Fees = () => {
  const navigate = useNavigate();
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const yearOptions = ["2024-2025", "2023-2024", "2022-2023"];
  const [selectedYear, setSelectedYear] = useState(yearOptions[0]);

  const handleNavigateToReports = async () => {
    if (isExportingReport) return;
    setIsExportingReport(true);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    navigate("/admin/fees/reports");
  };

  const summaryCards = [
    {
      label: "Expected Revenue",
      value: "₹12.50Cr",
      description: "Current academic year",
      icon: FiTrendingUp,
      variant: "primary",
    },
    {
      label: "Collected Revenue",
      value: "₹9.85Cr",
      description: "78.8% collection rate",
      icon: FiArrowUpRight,
      variant: "success",
      progress: 78.8,
    },
    {
      label: "Outstanding Dues",
      value: "₹2.65Cr",
      description: "Pending collection",
      icon: FiAlertCircle,
      variant: "warning",
    },
  ];

  const highlightCards = [
    {
      label: "Student Payment Status",
      value: "2890/3500",
      description: "410 partial payments",
      icon: FiUsers,
      variant: "status",
      progress: 82.6,
      fullSpan: true,
    },
    {
      label: "Active Scholarships",
      value: "450",
      description: "₹1.50Cr disbursed",
      icon: FiPercent,
      variant: "lavender",
    },
  ];

  const departmentData = [
    {
      department: "Computer Science",
      expected: "₹3.50Cr",
      collected: "₹2.85Cr",
      outstanding: "₹0.65Cr",
      rate: 81.4,
      status: 0.82,
    },
    {
      department: "Electronics",
      expected: "₹2.80Cr",
      collected: "₹2.20Cr",
      outstanding: "₹0.60Cr",
      rate: 78.6,
      status: 0.78,
    },
    {
      department: "Mechanical",
      expected: "₹2.50Cr",
      collected: "₹1.95Cr",
      outstanding: "₹0.55Cr",
      rate: 78,
      status: 0.76,
    },
    {
      department: "Civil",
      expected: "₹2.00Cr",
      collected: "₹1.55Cr",
      outstanding: "₹0.45Cr",
      rate: 77.5,
      status: 0.74,
    },
    {
      department: "MBA",
      expected: "₹1.70Cr",
      collected: "₹1.30Cr",
      outstanding: "₹0.40Cr",
      rate: 76.5,
      status: 0.72,
    },
  ];

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="fees-state pending app-loader-state">
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
          <p>Loading fee modules...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="fees-state error">
          <img src={emptyStateImg} alt="Failed" className="fees-state-img" />
          <h3>Failed to load fee modules</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <section className="fee-dashboard-headline">
          <div className="fee-dashboard-copy">
            <h1 className="fee-dashboard-title">Fee Management Dashboard</h1>
            <p className="fee-dashboard-subtitle">
              Academic Year: {selectedYear}
            </p>
            <p className="fee-dashboard-context">
              Monitor expected revenue, collection progress, and outstanding dues in real time.
            </p>
          </div>
          <div className="fee-dashboard-actions">
            <select
              className="fee-year-select"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="fee-export-btn admin-btn-with-loader"
              onClick={handleNavigateToReports}
              disabled={isExportingReport}
            >
              {isExportingReport ? (
                <>
                  <ClipLoader size={15} />
                  <span>Opening...</span>
                </>
              ) : (
                <>
                  <FiDownload />
                  <span>Export Report</span>
                </>
              )}
            </button>
          </div>
        </section>

        <section className="fee-card-grid">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className={`fee-card fee-card--${card.variant || "base"}`}
              >
                <span className="fee-card-icon" aria-hidden="true">
                  <Icon />
                </span>
                <div>
                  <p className="fee-card-label">{card.label}</p>
                  <p className="fee-card-value">{card.value}</p>
                  <p className="fee-card-note">{card.description}</p>
                </div>
                {card.progress && (
                  <div className="fee-card-progress">
                    <div className="fee-card-progress-track">
                      <div
                        className="fee-card-progress-fill"
                        style={{ width: `${card.progress}%` }}
                      />
                    </div>
                    <span>{card.progress}%</span>
                  </div>
                )}
              </article>
            );
          })}
          {highlightCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className={`fee-card fee-card--${card.variant || "base"} ${
                  card.fullSpan ? "fee-card--wide" : ""
                }`}
              >
                <div className="fee-card-headline">
                  <span className="fee-card-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <div>
                    <p className="fee-card-label">{card.label}</p>
                    <p className="fee-card-value">{card.value}</p>
                    <p className="fee-card-note">{card.description}</p>
                  </div>
                </div>
                {card.progress && (
                  <div className="fee-card-progress fee-card-progress--status">
                    <div className="fee-card-progress-track">
                      <div
                        className="fee-card-progress-fill fee-card-progress-fill--status"
                        style={{ width: `${card.progress}%` }}
                      />
                    </div>
                    <span>{card.progress}% collection</span>
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <section className="fee-table-section">
          <div className="fee-table-head">
            <div>
              <h2 className="fee-table-title">Revenue by Department</h2>
              <p className="fee-table-subtitle">
                Track expected vs collected revenue and collection rate across faculties.
              </p>
            </div>
            <button
              type="button"
              className="fee-link-btn admin-btn-with-loader"
              onClick={handleNavigateToReports}
              disabled={isExportingReport}
            >
              {isExportingReport ? (
                <>
                  <ClipLoader size={14} color="#0f172a" trackColor="rgba(15, 23, 42, 0.2)" />
                  <span>Opening...</span>
                </>
              ) : (
                "View All"
              )}
            </button>
          </div>

          <div className="fees-table-wrap">
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Expected</th>
                  <th>Collected</th>
                  <th>Outstanding</th>
                  <th>Collection Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departmentData.map((row) => (
                  <tr key={row.department}>
                    <td className="fees-name">{row.department}</td>
                    <td>{row.expected}</td>
                    <td>{row.collected}</td>
                    <td>{row.outstanding}</td>
                    <td>
                      <div className="fee-rate-cell">
                        <span>{row.rate.toFixed(1)}%</span>
                        <div className="fee-progress-track">
                          <div
                            className="fee-progress-fill"
                            style={{ width: `${row.rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fee-status-meter">
                        <div
                          className="fee-status-meter-fill"
                          style={{ width: `${Math.min(row.status * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="fees-page">
      {renderState()}
    </div>
  );
};

export default Fees;
