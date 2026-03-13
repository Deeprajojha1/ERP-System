import React, { useEffect, useState } from "react";
import {
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiDownloadCloud,
  FiCalendar,
  FiDatabase,
  FiFileText,
  FiRefreshCw,
  FiSliders,
  FiZap,
} from "react-icons/fi";
import { MdOutlineSecurity } from "react-icons/md";
import "./Fees.css";
import { useDispatch, useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import {
  createFeeReportExport,
  fetchFeeReportExports,
  selectFeeReportExports,
} from "../redux/feeSlice";
import toast from "react-hot-toast";

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

const destinationProfiles = [{ id: "download", label: "Direct Download", Icon: FiDownloadCloud }];

const FeesReports = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const reportExports = useSelector(selectFeeReportExports);
  const [range, setRange] = useState(rangeOptions[0]);
  const [dataset, setDataset] = useState(datasetOptions[0]);
  const [format, setFormat] = useState(formatOptions[0]);
  const [destination, setDestination] = useState(destinationProfiles[0].id);
  const [includeBreakdown, setIncludeBreakdown] = useState(true);
  const [sharePortal, setSharePortal] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);

  useEffect(() => {
    dispatch(fetchFeeReportExports());
  }, [dispatch]);

  const totalExports = (reportExports || []).length;
  const completedExports = (reportExports || []).filter(
    (record) => String(record.status || "").toLowerCase() === "completed"
  ).length;
  const processingExports = (reportExports || []).filter(
    (record) => String(record.status || "").toLowerCase() === "processing"
  ).length;

  const handleDownload = async (exportId, exportFormat, options = {}) => {
    const { silent = false } = options;
    if (!apiBase || !exportId) return false;
    try {
      const response = await axios.get(
        `${apiBase}/admin/fee/reports/export/${exportId}/download`,
        { withCredentials: true, responseType: "blob" }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const ext = String(exportFormat || format || "csv").toLowerCase();
      link.download = `fee-export-${exportId}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      if (!silent) {
        toast.error(error.response?.data?.message || "Failed to download export");
      }
      return false;
    }
  };

  const handleGenerate = async () => {
    try {
      const createdExport = await dispatch(
        createFeeReportExport({
          range,
          dataset,
          format,
          destination,
          title: `${dataset} Export`,
          includeBreakdown,
          sharePortal,
          autoSchedule,
        })
      ).unwrap();
      toast.success("Report export generated");

      if (String(destination) !== "download") return;

      let exportId = createdExport?._id || createdExport?.id || createdExport?.exportId || "";
      let exportFormat = createdExport?.format || format;
      const exportStatus = String(createdExport?.status || "").toLowerCase();

      if (!exportId) {
        const exportsList = await dispatch(fetchFeeReportExports()).unwrap();
        const latestExport = [...(exportsList || [])]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .find((item) => String(item.destination || "download") === "download");
        exportId = latestExport?._id || "";
        exportFormat = latestExport?.format || exportFormat;
      }

      if (!exportId) {
        toast("Export created. Download it from Export History.");
        return;
      }

      if (exportStatus === "processing" || exportStatus === "created") {
        toast("Export is processing. Please download it from Export History once completed.");
        return;
      }

      const downloaded = await handleDownload(exportId, exportFormat, { silent: true });
      if (!downloaded) {
        toast("Export generated. Please click Download in Export History.");
      }
    } catch (error) {
      toast.error(error || "Failed to generate export");
    }
  };

  return (
    <div className="fees-page fee-export-page">
      <section className="fee-export-hero">
        <div className="fee-export-hero-copy">
          <p className="fee-badge">
            <FiZap /> API Integrated
          </p>
          <h1>
            <FiFileText /> Export Fee Data
          </h1>
          <p>
            Generate fee exports using integrated endpoints and track their real-time processing state.
          </p>
          <div className="fee-hero-points">
            <span>
              <MdOutlineSecurity /> Encrypted links
            </span>
            <span>
              <FiClock /> Download directly from export history
            </span>
          </div>
        </div>
        <div className="fee-hero-insights">
          <div className="fee-mini-stat">
            <span>
              <FiBarChart2 /> Total Exports
            </span>
            <strong>{totalExports}</strong>
            <small>From report export API</small>
          </div>
          <div className="fee-mini-stat">
            <span>
              <FiCheckCircle /> Completed
            </span>
            <strong>{completedExports}</strong>
            <small>Successfully generated</small>
          </div>
          <div className="fee-mini-stat">
            <span>
              <FiRefreshCw /> Processing
            </span>
            <strong>{processingExports}</strong>
            <small>In progress</small>
          </div>
          <button type="button" className="fee-export-primary" onClick={handleGenerate}>
            <FiDownloadCloud /> Generate Export
          </button>
        </div>
      </section>

      <section className="fee-export-config">
        <div className="fee-config-grid">
          <div className="fee-form-field">
            <label>
              <FiCalendar /> Reporting range
            </label>
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
            <label htmlFor="dataset-select">
              <FiDatabase /> Dataset
            </label>
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
            <label htmlFor="format-select">
              <FiDownload /> File format
            </label>
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
          <p className="fee-destination-title">
            <FiDownloadCloud /> Delivery method
          </p>
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
                  <p>Download export package from history once completed.</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="fee-export-options">
          <p className="fee-destination-title">
            <FiSliders /> Export options
          </p>
          <div className="fee-checkbox-grid">
            <label className="fee-checkbox">
              <input
                type="checkbox"
                checked={includeBreakdown}
                onChange={(event) => setIncludeBreakdown(event.target.checked)}
              />
              <span>Include breakdown rows</span>
            </label>
            <label className="fee-checkbox">
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={(event) => setAutoSchedule(event.target.checked)}
              />
              <span>Auto-schedule future exports</span>
            </label>
            <label className="fee-checkbox">
              <input
                type="checkbox"
                checked={sharePortal}
                onChange={(event) => setSharePortal(event.target.checked)}
              />
              <span>Publish to admin fee portal</span>
            </label>
          </div>
        </div>
      </section>

      <section className="fee-history">
        <div className="fee-history-head">
          <div>
            <h2>
              <FiClock /> Export history
            </h2>
            <p>API generated exports with direct download actions.</p>
          </div>
          <button type="button" className="fee-link-btn" onClick={() => dispatch(fetchFeeReportExports())}>
            <FiRefreshCw /> Refresh
          </button>
        </div>
        <div className="fee-history-list">
          {(reportExports || []).map((record) => (
            <article className="fee-history-item" key={record._id}>
              <div>
                <p className="fee-history-title">{record.title}</p>
                <span className="fee-history-subtitle">{record.range}</span>
              </div>
              <div className="fee-history-meta">
                <span className={`fee-history-status status-${String(record.status || "completed").toLowerCase()}`}>
                  {record.status}
                </span>
                <span>{record.format}</span>
                <span>{new Date(record.createdAt).toLocaleString()}</span>
              </div>
              <div className="fee-history-actions">
                <button
                  type="button"
                  className="fee-link-btn"
                  onClick={() => handleDownload(record._id, record.format)}
                >
                  <FiDownload /> Download
                </button>
              </div>
            </article>
          ))}
          {(reportExports || []).length === 0 && (
            <div className="fee-history-empty">No exports yet.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FeesReports;
