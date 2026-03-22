import React, { useEffect, useRef, useState } from "react";
import {
  FiUpload,
  FiDownload,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
} from "react-icons/fi";
import "./BulkOperations.css";
import ClipLoader from "./components/ClipLoader";
import { useDispatch, useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import {
  fetchFeeBulkJobs,
  retryFeeBulkJob,
  selectFeeBulkJobs,
} from "../redux/feeSlice";
import toast from "react-hot-toast";

const BULK_STEPS = [
  {
    key: "download",
    title: "Download Template",
    description:
      "Get the latest CSV template with mandatory headers and helper notes.",
    actionLabel: "Download",
    actionIcon: FiDownload,
  },
  {
    key: "fill",
    title: "Fill Mapping Data",
    description:
      "Add or update student fee mapping values, discounts, and payment plans.",
  },
  {
    key: "upload",
    title: "Upload for Processing",
    description:
      "We validate records instantly and surface any blocking errors for review.",
    actionLabel: "Upload",
    actionIcon: FiUpload,
  },
];

const BulkOperations = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const operationLogs = useSelector(selectFeeBulkJobs);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchFeeBulkJobs());
  }, [dispatch]);

  const handleDownloadTemplate = () => {
    if (!apiBase) return;
    setIsDownloadingTemplate(true);
    axios
      .get(`${apiBase}/admin/fee/bulk/template`, {
        withCredentials: true,
        responseType: "blob",
      })
      .then((response) => {
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = "fee-bulk-template.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setUploadMessage("Template downloaded successfully.");
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Failed to download template");
      })
      .finally(() => {
        setIsDownloadingTemplate(false);
      });
  };

  const handleTriggerUpload = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    setIsUploading(true);
    setUploadMessage(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    axios
      .post(`${apiBase}/admin/fee/bulk/upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(() => {
        setUploadMessage(`Upload completed for ${file.name}`);
        dispatch(fetchFeeBulkJobs());
      })
      .catch((error) => {
        setUploadMessage(`Upload failed for ${file.name}`);
        toast.error(error.response?.data?.message || "Bulk upload failed");
      })
      .finally(() => {
        setIsUploading(false);
      });
  };

  return (
    <div className="bulk-ops-page">
      <header className="bo-hero">
        <div>
          <p className="bo-eyebrow">Student Management</p>
          <h1>Bulk Operations</h1>
          <p className="bo-supporting">
            Manage bulk uploads for student fee mapping, discounts, and payment schedule updates with guided validation.
          </p>
        </div>
      </header>

      <section className="bo-workflow">
        {BULK_STEPS.map((step) => {
          const StepIcon = step.actionIcon;
          const actionHandler =
            step.key === "download"
              ? handleDownloadTemplate
              : step.key === "upload"
              ? handleTriggerUpload
              : undefined;
          const disableAction =
            (step.key === "upload" && isUploading) ||
            (step.key === "download" && isDownloadingTemplate);
          return (
            <article key={step.title} className="bo-step-card">
              <div className="bo-step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              {step.actionLabel && StepIcon && (
                <button
                  type="button"
                  className="bo-step-btn admin-btn-with-loader"
                  onClick={actionHandler}
                  disabled={disableAction}
                >
                  {step.key === "upload" && isUploading ? (
                    <>
                      <ClipLoader size={15} color="#0f172a" trackColor="rgba(15, 23, 42, 0.2)" />
                      <span>Uploading...</span>
                    </>
                  ) : step.key === "download" && isDownloadingTemplate ? (
                    <>
                      <ClipLoader size={15} color="#0f172a" trackColor="rgba(15, 23, 42, 0.2)" />
                      <span>Downloading</span>
                    </>
                  ) : (
                    <>
                      <StepIcon />
                      <span>{step.actionLabel}</span>
                    </>
                  )}
                </button>
              )}
            </article>
          );
        })}
      </section>

      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <section className="bo-log-card">
        <div className="bo-log-head">
          <div>
            <h2>Operation History</h2>
            <p>Monitor recent uploads, validate errors, or reprocess batches.</p>
          </div>
          <div className="bo-upload-actions">
            <button
              type="button"
              className="bo-upload-primary admin-btn-with-loader"
              onClick={handleTriggerUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <ClipLoader size={16} />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FiUpload />
                  <span>Start Upload</span>
                </>
              )}
            </button>
            {uploadMessage && (
              <p className="bo-upload-status" aria-live="polite">
                {uploadMessage}
              </p>
            )}
          </div>
        </div>
        <div className="bo-log-table">
          {(operationLogs || []).map((log) => {
            const statusClass =
              log.status === "COMPLETED"
                ? "is-success"
                : log.status === "FAILED"
                ? "is-error"
                : "is-processing";
            const StatusIcon =
              log.status === "COMPLETED"
                ? FiCheckCircle
                : log.status === "FAILED"
                ? FiAlertCircle
                : FiRefreshCw;
            const metaText =
              log.status === "FAILED"
                ? `${log.errorCount || 0} errors`
                : log.status === "COMPLETED"
                ? "Ready for sync"
                : "Validating...";
            return (
              <article key={log._id || log.id} className="bo-log-row">
                <div>
                  <p className="bo-log-file">{log.fileName || log.file}</p>
                  <span className="bo-log-meta">{log._id || log.id}</span>
                </div>
                <div>
                  <p>{log.createdBy?.name || "Admin"}</p>
                  <span className="bo-log-meta">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : log.submittedOn}
                  </span>
                </div>
                <div>
                  <p className="bo-log-count">{log.totalRecords} records</p>
                </div>
                <div className="bo-log-status">
                  <span className={`bo-status-chip ${statusClass}`}>
                    <StatusIcon />
                    {log.status}
                  </span>
                  <span className="bo-log-meta">{metaText}</span>
                </div>
                <div>
                  {log.status === "FAILED" ? (
                    <button
                      type="button"
                      className="bo-log-link"
                      onClick={() => dispatch(retryFeeBulkJob(log._id))}
                    >
                      Retry
                    </button>
                  ) : (
                    <button type="button" className="bo-log-link">
                      View details
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {(operationLogs || []).length === 0 && (
            <div className="bo-log-empty">
              No bulk operations yet. Upload a CSV to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BulkOperations;
