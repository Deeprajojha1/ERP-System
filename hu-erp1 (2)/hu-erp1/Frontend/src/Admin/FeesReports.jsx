import React, { useState } from "react";
import {
  FiDownloadCloud,
  FiCalendar,
  FiDatabase,
  FiMail,
  FiShare2,
  FiClock,
} from "react-icons/fi";
import { MdOutlineSecurity } from "react-icons/md";
import { HiOutlineCloudUpload } from "react-icons/hi";
import "./Fees.css";

const rangeOptions = [
  "This Month",
  "Quarter to Date",
  "Academic Year",
  "Custom Range",
];

const datasetOptions = [
  "Department Revenue",
  "Student Ledger",
  "Scholarship Disbursal",
  "Transport & Hostel",
];

const formatOptions = ["CSV", "XLSX", "JSON"];

const destinationProfiles = [
  {
    id: "download",
    label: "Direct Download",
    detail: "Single archive (.zip)",
    description: "Best for manual reviews",
    Icon: FiDownloadCloud,
  },
  {
    id: "email",
    label: "Email Delivery",
    detail: "finance@university.edu",
    description: "Sends secure link with 7-day expiry",
    Icon: FiMail,
  },
  {
    id: "drive",
    label: "Shared Drive",
    detail: "S3 finance-data bucket",
    description: "Pushes data to cloud storage",
    Icon: HiOutlineCloudUpload,
  },
];

const historyRecords = [
  {
    id: 1,
    title: "Quarterly Fee Summary",
    range: "Apr - Jun 2025",
    size: "4.2 MB CSV",
    triggered: "2 min ago",
    status: "Completed",
  },
  {
    id: 2,
    title: "Department Ledger",
    range: "FY 2024-25",
    size: "6.8 MB XLSX",
    triggered: "1 hr ago",
    status: "Processing",
  },
  {
    id: 3,
    title: "Scholarship Disbursal",
    range: "2023-24",
    size: "3.1 MB CSV",
    triggered: "Yesterday",
    status: "Completed",
  },
  {
    id: 4,
    title: "Backpaper Outstanding",
    range: "Last month",
    size: "1.8 MB CSV",
    triggered: "3 days ago",
    status: "Failed",
  },
];

const recipients = [
  "finance@university.edu",
  "dean.office@university.edu",
  "audit-team@hu.edu",
];

const FeesReports = () => {
  const [range, setRange] = useState(rangeOptions[0]);
  const [dataset, setDataset] = useState(datasetOptions[0]);
  const [format, setFormat] = useState(formatOptions[0]);
  const [destination, setDestination] = useState(destinationProfiles[0].id);
  const [includeBreakdown, setIncludeBreakdown] = useState(true);
  const [sharePortal, setSharePortal] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);

  return (
    <div className="fees-page fee-export-page">
      <section className="fee-export-hero">
        <div className="fee-export-hero-copy">
          <p className="fee-badge">Automated exports</p>
          <h1>Export Fee Data</h1>
          <p>
            Generate granular fee collections with department, course, and
            scholarship level details. Configure once, reuse the recipe for every
            reporting cycle.
          </p>
          <div className="fee-hero-points">
            <span>
              <MdOutlineSecurity /> Encrypted links
            </span>
            <span>
              <FiClock /> Ready in under 60s
            </span>
          </div>
        </div>
        <div className="fee-hero-insights">
          <div className="fee-mini-stat">
            <span>Next scheduled export</span>
            <strong>Friday, 06:00 AM</strong>
            <small>(Finance team)</small>
          </div>
          <div className="fee-mini-stat">
            <span>Average package size</span>
            <strong>4.2 MB</strong>
            <small>+12% vs last month</small>
          </div>
          <button type="button" className="fee-export-primary">
            <FiDownloadCloud /> Generate Export
          </button>
        </div>
      </section>

      <section className="fee-export-config">
        <div className="fee-config-grid">
          <div className="fee-form-field">
            <label>Reporting range</label>
            <div className="fee-pill-group">
              {rangeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`fee-pill ${range === option ? "is-active" : ""}`}
                  onClick={() => setRange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="fee-form-hint">Choose the window to aggregate transactions.</p>
          </div>

          <div className="fee-form-field">
            <label htmlFor="dataset-select">Dataset</label>
            <div className="fee-select-wrap">
              <FiDatabase />
              <select
                id="dataset-select"
                className="fee-form-select"
                value={dataset}
                onChange={(event) => setDataset(event.target.value)}
              >
                {datasetOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <p className="fee-form-hint">Each export includes reconciliation IDs.</p>
          </div>

          <div className="fee-form-field">
            <label htmlFor="format-select">File format</label>
            <div className="fee-select-wrap">
              <FiDownloadCloud />
              <select
                id="format-select"
                className="fee-form-select"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                {formatOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <p className="fee-form-hint">Supports up to 250k records per export.</p>
          </div>
        </div>

        <div className="fee-destination-panel">
          <p className="fee-destination-title">Delivery method</p>
          <div className="fee-destination-grid">
            {destinationProfiles.map((profile) => (
              <label
                key={profile.id}
                className={`fee-destination-card ${
                  destination === profile.id ? "is-active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="destination"
                  value={profile.id}
                  checked={destination === profile.id}
                  onChange={(event) => setDestination(event.target.value)}
                />
                <span className="fee-destination-icon">
                  <profile.Icon />
                </span>
                <div>
                  <strong>{profile.label}</strong>
                  <p>{profile.description}</p>
                  <small>{profile.detail}</small>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="fee-export-share">
        <div className="fee-share-main">
          <h2>Sharing preferences</h2>
          <p>Send secure links to stakeholders and the compliance archive.</p>
          <div className="fee-checkbox-grid">
            <label className="fee-checkbox">
              <input
                type="checkbox"
                checked={includeBreakdown}
                onChange={(event) => setIncludeBreakdown(event.target.checked)}
              />
              <span>Include department level breakdown</span>
            </label>
            <label className="fee-checkbox">
              <input
                type="checkbox"
                checked={sharePortal}
                onChange={(event) => setSharePortal(event.target.checked)}
              />
              <span>Publish to admin fee portal</span>
            </label>
            <label className="fee-checkbox">
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={(event) => setAutoSchedule(event.target.checked)}
              />
              <span>Create recurring weekly export</span>
            </label>
          </div>
        </div>
        <div className="fee-share-panel">
          <p className="fee-destination-title">Recipients</p>
          <div className="fee-recipient-chips">
            {recipients.map((recipient) => (
              <span className="fee-chip" key={recipient}>
                {recipient}
              </span>
            ))}
            <button type="button" className="fee-chip fee-chip--ghost">
              + Add recipient
            </button>
          </div>
          <div className="fee-share-meta">
            <span>
              <FiShare2 /> Links expire after 7 days
            </span>
            <span>
              <MdOutlineSecurity /> Access is audited
            </span>
          </div>
        </div>
      </section>

      <section className="fee-history">
        <div className="fee-history-head">
          <div>
            <h2>Export history</h2>
            <p>Recently generated datasets with delivery status.</p>
          </div>
          <button type="button" className="fee-link-btn">
            View automation rules
          </button>
        </div>
        <div className="fee-history-list">
          {historyRecords.map((record) => (
            <article className="fee-history-item" key={record.id}>
              <div>
                <p className="fee-history-title">{record.title}</p>
                <span className="fee-history-subtitle">{record.range}</span>
              </div>
              <div className="fee-history-meta">
                <span>{record.size}</span>
                <span>{record.triggered}</span>
                <span className={`fee-history-status status-${record.status.toLowerCase()}`}>
                  {record.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FeesReports;
