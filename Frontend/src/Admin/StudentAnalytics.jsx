import React, { useMemo, useState } from "react";
import { FiUsers, FiBook, FiAlertCircle } from "react-icons/fi";
import "./StudentAnalytics.css";

const STATUS = [
  { label: "On Track", value: 74, color: "#10b981" },
  { label: "Follow Up", value: 18, color: "#f59e0b" },
  { label: "Critical", value: 8, color: "#ef4444" },
];

const SEGMENTS = [
  { label: "Need-based aid", students: 120, avgDiscount: "₹18K" },
  { label: "Merit scholarships", students: 86, avgDiscount: "₹24K" },
  { label: "Transport waiver", students: 54, avgDiscount: "₹8K" },
];

const StudentAnalytics = () => {
  const [cohort, setCohort] = useState("2024-25");
  const [department, setDepartment] = useState("All Departments");

  const cohortOptions = ["2024-25", "2023-24", "2022-23"];
  const departmentOptions = useMemo(
    () => ["All Departments", "Computer Science", "Mechanical", "MBA"],
    []
  );

  const statusTotal = STATUS.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="student-analytics-page">
      <header className="sa-hero">
        <div>
          <p className="sa-eyebrow">Analytics & Reports</p>
          <h1>Student Analytics</h1>
          <p>
            Understand how discounts, waivers, and pending dues distribute across cohorts for proactive outreach.
          </p>
        </div>
        <button type="button" className="sa-alert-btn">
          <FiAlertCircle />
          <span>View Alerts</span>
        </button>
      </header>

      <section className="sa-controls">
        <select value={cohort} onChange={(event) => setCohort(event.target.value)}>
          {cohortOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select value={department} onChange={(event) => setDepartment(event.target.value)}>
          {departmentOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </section>

      <section className="sa-overview">
        <article className="sa-overview-card">
          <span className="sa-overview-icon">
            <FiUsers />
          </span>
          <div>
            <p>Total students mapped</p>
            <strong>3,520</strong>
            <small>{department}</small>
          </div>
        </article>
        <article className="sa-overview-card">
          <span className="sa-overview-icon">
            <FiBook />
          </span>
          <div>
            <p>Discount programs</p>
            <strong>12 active</strong>
            <small>{cohort}</small>
          </div>
        </article>
      </section>

      <section className="sa-panels">
        <article className="sa-panel">
          <div className="sa-panel-head">
            <h2>Status distribution</h2>
            <span>{statusTotal}% of mapped students</span>
          </div>
          <div className="sa-status-rings">
            {STATUS.map((item) => (
              <div key={item.label} className="sa-status-item">
                <div
                  className="sa-status-ring"
                  style={{ borderColor: item.color }}
                >
                  <strong>{item.value}%</strong>
                </div>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="sa-panel">
          <div className="sa-panel-head">
            <h2>Segment insights</h2>
            <span>Avg discount per student</span>
          </div>
          <div className="sa-segment-list">
            {SEGMENTS.map((segment) => (
              <div key={segment.label} className="sa-segment-row">
                <div>
                  <p>{segment.label}</p>
                  <small>{segment.students} students</small>
                </div>
                <strong>{segment.avgDiscount}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default StudentAnalytics;
