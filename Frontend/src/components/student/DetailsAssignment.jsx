import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { FaArrowLeftLong } from "react-icons/fa6";
import { FiDownload, FiExternalLink, FiUpload } from "react-icons/fi";
import { MdVerified } from "react-icons/md";
import { BsFileEarmarkPdfFill } from "react-icons/bs";
import toast from "react-hot-toast";
import axios from "../../utils/axiosInstance";
import ClipLoader from "../../Admin/components/ClipLoader";

import "./DetailsAssignment.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "N/A";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const buildStatus = (assignment) => {
  const status = String(assignment?.status || "pending").toLowerCase();
  if (status === "graded") return "Graded";
  if (status === "submitted") return "Submitted";
  return "Pending";
};

const resolveMainAttachment = (assignment) => {
  if (assignment?.fileUrl) {
    return {
      url: assignment.fileUrl,
      name:
        assignment.originalFileName ||
        assignment.fileName ||
        assignment.title ||
        "Attachment",
      size: assignment.fileSize || 0,
    };
  }

  if (Array.isArray(assignment?.attachments) && assignment.attachments.length > 0) {
    const first = assignment.attachments[0] || {};
    return {
      url: first.url || "",
      name: first.name || assignment.title || "Attachment",
      size: first.size || 0,
    };
  }

  return null;
};

const triggerBrowserDownload = (fileUrl, fileName = "attachment") => {
  if (!fileUrl) return;
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const downloadFileDirect = async (fileUrl, fileName = "attachment") => {
  if (!fileUrl) return false;
  try {
    const response = await fetch(fileUrl, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    triggerBrowserDownload(objectUrl, fileName);
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch (error) {
    console.error("Direct assignment download failed:", error?.message || error);
    return false;
  }
};

const openFileInNewTab = (fileUrl) => {
  if (!fileUrl) return;
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const DetailsAssignment = ({ assignment, onClose, onAssignmentSubmitted }) => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const fileInputRef = useRef(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionRemarks, setSubmissionRemarks] = useState("");

  const statusLabel = buildStatus(assignment);
  const attachment = resolveMainAttachment(assignment);
  const submission = assignment?.submission || null;
  const hasFile = Boolean(attachment?.url);
  const hasSubmittedFile = Boolean(submission?.fileUrl);
  const assignmentId = String(assignment?._id || assignment?.id || "").trim();
  const normalizedStatus = String(assignment?.status || "pending").toLowerCase();
  const isGraded = normalizedStatus === "graded";
  const isSubmitted = normalizedStatus === "submitted" || isGraded;
  const dueDateValue = assignment?.dueDate || assignment?.dueAt || null;
  const dueDateTs = dueDateValue ? new Date(dueDateValue).getTime() : NaN;
  const isDeadlinePassed =
    Number.isFinite(dueDateTs) && dueDateTs < Date.now();
  const canSubmitNow = !isGraded && !isDeadlinePassed;

  const title = assignment?.title || "Assignment";
  const subtitle = assignment?.courseName || assignment?.category || "Course assignment";
  const postedOn = formatDate(assignment?.postedAt || assignment?.createdAt);
  const dueOn = formatDate(assignment?.dueDate || assignment?.dueAt);
  const instructions =
    assignment?.instructions || assignment?.description || "No instructions available.";
  const grade = assignment?.grade || "N/A";
  const rawScore =
    assignment?.totalScore ?? assignment?.marks ?? submission?.marks ?? null;
  const hasScore =
    rawScore !== null &&
    rawScore !== undefined &&
    String(rawScore).trim() !== "";
  const totalScore = hasScore
    ? String(rawScore)
    : isGraded
    ? "Marks Not Shared"
    : "Not Graded Yet";

  const handleViewAttachment = () => {
    if (!attachment?.url) return;
    setViewLoading(true);
    openFileInNewTab(attachment.url);
    setViewLoading(false);
  };

  const handleDownloadAttachment = async () => {
    if (!attachment?.url) return;
    setDownloadLoading(true);
    const fileName = attachment?.name || "assignment-file";
    const downloaded = await downloadFileDirect(attachment.url, fileName);
    if (!downloaded) {
      triggerBrowserDownload(attachment.url, fileName);
    }
    setDownloadLoading(false);
  };

  const handleDownloadSubmittedFile = async () => {
    if (!submission?.fileUrl) return;
    setDownloadLoading(true);
    const fileName =
      submission?.originalFileName ||
      submission?.fileName ||
      "submitted-assignment";
    const downloaded = await downloadFileDirect(submission.fileUrl, fileName);
    if (!downloaded) {
      triggerBrowserDownload(submission.fileUrl, fileName);
    }
    setDownloadLoading(false);
  };

  const handleSubmitAssignment = async () => {
    if (!apiBase) {
      toast.error("API base URL is not configured");
      return;
    }
    if (!assignmentId) {
      toast.error("Assignment id is missing");
      return;
    }
    if (!submissionFile) {
      toast.error("Please choose your assignment file");
      return;
    }

    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append("assignmentId", assignmentId);
      formData.append("remarks", String(submissionRemarks || "").trim());
      formData.append("file", submissionFile);

      const response = await axios.post(`${apiBase}/student/assignment-submissions`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(response?.data?.message || "Assignment submitted successfully");
      setSubmissionFile(null);
      setSubmissionRemarks("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (typeof onAssignmentSubmitted === "function") {
        try {
          await onAssignmentSubmitted(assignmentId, response?.data?.item || null);
        } catch {
          // Keep submission successful even if parent refresh fails.
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit assignment");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="assignment-page" data-status={normalizedStatus}>
      <div className="container">
        <div className="top-nav">
          <div className="nav-left">
            <button className="icon-btn" type="button" onClick={onClose}>
              <FaArrowLeftLong />
            </button>
            <h1>Assignment</h1>
          </div>
        </div>

        <div className="overview-card">
          <span className="status-pill" data-status={normalizedStatus}>
            {statusLabel}
          </span>

          <h2>{title}</h2>
          <p className="subtitle">{subtitle}</p>

          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-icon success">
                <MdVerified />
              </div>
              <p>
                Posted on: <b>{postedOn}</b>
              </p>
            </div>

            <div className="timeline-item">
              <div className="timeline-icon">
                <BsFileEarmarkPdfFill />
              </div>
              <p>
                Due on: <b>{dueOn}</b>
              </p>
            </div>
          </div>

          <div className="score-card">
            <div className="score-metric">
              <small>Total Score</small>
              <strong className={hasScore ? "" : "muted"}>{totalScore}</strong>
            </div>

            <div className="divider" />

            <div className="score-metric score-metric-grade">
              <small>Grade</small>
              <strong>{grade}</strong>
            </div>
          </div>
          {isGraded && !hasScore ? (
            <p className="score-note">
              Faculty graded this assignment without numeric marks.
            </p>
          ) : null}
        </div>

        <section className="section">
          <h3>Attachment</h3>

          {hasFile ? (
            <div className="file-card">
              <div className="file-meta">
                <div className="file-icon">
                  <BsFileEarmarkPdfFill />
                </div>

                <div>
                  <h4>{attachment.name}</h4>
                  <p>{formatFileSize(attachment.size)}</p>
                </div>
              </div>

              <div className="actions">
                <button
                  type="button"
                  onClick={handleViewAttachment}
                  disabled={viewLoading || downloadLoading}
                >
                  {viewLoading ? (
                    <ClipLoader
                      size={13}
                      color="#0f172a"
                      trackColor="rgba(15, 23, 42, 0.2)"
                    />
                  ) : (
                    <>
                      <FiExternalLink /> View
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    void handleDownloadAttachment();
                  }}
                  disabled={viewLoading || downloadLoading}
                >
                  {downloadLoading ? (
                    <ClipLoader size={13} color="#ffffff" />
                  ) : (
                    <>
                      <FiDownload />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="instructions">
              No file is attached for this assignment.
            </div>
          )}
        </section>

        <section className="section">
          <h3>Instructions</h3>
          <div className="instructions">{instructions}</div>
        </section>

        <section className="section">
          <h3>Submit Assignment</h3>

          <div className="submission-card">
            <div className="submission-meta">
              <p className="submission-status-line">
                <strong>Status:</strong> {statusLabel}
              </p>
              {submission?.submittedAt ? (
                <p className="submission-time-line">
                  Submitted on: <b>{formatDate(submission.submittedAt)}</b>
                </p>
              ) : null}
              {submission?.remarks ? (
                <p className="submission-remarks-line">
                  Remarks: {submission.remarks}
                </p>
              ) : null}
              {submission?.feedback ? (
                <p className="submission-feedback-line">
                  Faculty feedback: {submission.feedback}
                </p>
              ) : null}
            </div>

            {hasSubmittedFile ? (
              <div className="submission-file-actions">
                <button
                  type="button"
                  onClick={() => openFileInNewTab(submission.fileUrl)}
                  disabled={submitLoading}
                >
                  <FiExternalLink /> View Submitted File
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    void handleDownloadSubmittedFile();
                  }}
                  disabled={submitLoading || downloadLoading}
                >
                  {downloadLoading ? (
                    <ClipLoader size={13} color="#ffffff" />
                  ) : (
                    <>
                      <FiDownload /> Download Submitted File
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {canSubmitNow ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="assignment-submission-file"
                  className="submission-file-input"
                  accept=".pdf,.doc,.docx,.txt,.zip,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  disabled={submitLoading}
                />
                <label
                  htmlFor="assignment-submission-file"
                  className={`submission-file-label ${submitLoading ? "disabled" : ""}`}
                >
                  <FiUpload />
                  {submissionFile ? submissionFile.name : "Choose file to submit"}
                </label>

                <textarea
                  className="submission-remarks-input"
                  rows={3}
                  placeholder="Write submission note (optional)"
                  value={submissionRemarks}
                  onChange={(e) => setSubmissionRemarks(e.target.value)}
                  disabled={submitLoading}
                />

                <button
                  type="button"
                  className="submission-submit-btn"
                  onClick={() => {
                    void handleSubmitAssignment();
                  }}
                  disabled={submitLoading || !submissionFile}
                >
                  {submitLoading ? (
                    <>
                      <ClipLoader size={13} color="#ffffff" />
                      Submitting...
                    </>
                  ) : isSubmitted ? (
                    "Re-submit Assignment"
                  ) : (
                    "Submit Assignment"
                  )}
                </button>
              </>
            ) : null}

            {isGraded ? (
              <p className="submission-graded-note">
                This assignment is already graded, so re-submission is disabled.
              </p>
            ) : null}
            {isDeadlinePassed && !isGraded ? (
              <p className="submission-graded-note">
                Assignment deadline is over, submission is closed.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DetailsAssignment;
