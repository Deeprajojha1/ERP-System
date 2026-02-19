import React, { useRef, useState } from "react";
import {
  FiUpload,
  FiDownload,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
} from "react-icons/fi";
import "./BulkOperations.css";

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

const INITIAL_OPERATION_LOGS = [
  {
    id: "OPR-1098",
    file: "semester-7-mappings.csv",
    submittedBy: "Neha Sengar",
    submittedOn: "19 Feb 2026, 10:42",
    totalRecords: 240,
    status: "Completed",
  },
  {
    id: "OPR-1097",
    file: "late-fee-adjustments.csv",
    submittedBy: "Rahul Kumar",
    submittedOn: "18 Feb 2026, 19:05",
    totalRecords: 120,
    status: "Validation Errors",
    errors: 14,
  },
];

const BulkOperations = () => {
  const [operationLogs, setOperationLogs] = useState(INITIAL_OPERATION_LOGS);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    const headers = [
      "enrollment_id",
      "student_name",
      "program",
      "cohort",
      "fee_cycle",
      "base_fee",
      "discount",
      "final_fee",
    ];
    const csvContent = `${headers.join(",")}\n`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fee-mapping-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setUploadMessage("Template downloaded successfully.");
  };

  const handleTriggerUpload = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const uploadId = `OPR-${Date.now().toString().slice(-4)}`;
    const now = new Date();
    const totalRecords = Math.floor(Math.random() * 250) + 50;
    const pendingLog = {
      id: uploadId,
      file: file.name,
      submittedBy: "You",
      submittedOn: now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      totalRecords,
      status: "Processing",
    };

    setOperationLogs((previous) => [pendingLog, ...previous]);
    setIsUploading(true);
    setUploadMessage(`Uploading ${file.name}...`);

    window.setTimeout(() => {
      const hasErrors = file.name.toLowerCase().includes("error");
      const finalStatus = hasErrors ? "Validation Errors" : "Completed";
      const errors = hasErrors ? Math.floor(Math.random() * 8) + 1 : undefined;

      setOperationLogs((previous) =>
        previous.map((log) =>
          log.id === uploadId
            ? {
                ...log,
                status: finalStatus,
                errors,
              }
            : log
        )
      );
      setUploadMessage(
        hasErrors
          ? `Validation errors detected in ${file.name}`
          : `Upload completed for ${file.name}`
      );
      setIsUploading(false);
    }, 1800);
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
          const disableAction = step.key === "upload" && isUploading;
          return (
            <article key={step.title} className="bo-step-card">
              <div className="bo-step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              {step.actionLabel && StepIcon && (
                <button
                  type="button"
                  className="bo-step-btn"
                  onClick={actionHandler}
                  disabled={disableAction}
                >
                  <StepIcon />
                  <span>{step.actionLabel}</span>
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
              className="bo-upload-primary"
              onClick={handleTriggerUpload}
              disabled={isUploading}
            >
              <FiUpload />
              <span>{isUploading ? "Uploading..." : "Start Upload"}</span>
            </button>
            {uploadMessage && (
              <p className="bo-upload-status" aria-live="polite">
                {uploadMessage}
              </p>
            )}
          </div>
        </div>
        <div className="bo-log-table">
          {operationLogs.map((log) => {
            const statusClass =
              log.status === "Completed"
                ? "is-success"
                : log.status === "Validation Errors"
                ? "is-error"
                : "is-processing";
            const StatusIcon =
              log.status === "Completed"
                ? FiCheckCircle
                : log.status === "Validation Errors"
                ? FiAlertCircle
                : FiRefreshCw;
            const metaText =
              log.status === "Validation Errors"
                ? `${log.errors || 0} errors`
                : log.status === "Completed"
                ? "Ready for sync"
                : "Validating...";
            return (
              <article key={log.id} className="bo-log-row">
                <div>
                  <p className="bo-log-file">{log.file}</p>
                  <span className="bo-log-meta">{log.id}</span>
                </div>
                <div>
                  <p>{log.submittedBy}</p>
                  <span className="bo-log-meta">{log.submittedOn}</span>
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
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default BulkOperations;
