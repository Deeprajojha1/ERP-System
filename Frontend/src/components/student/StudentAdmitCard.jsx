import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../../utils/axiosInstance";
import { openPdfFromHtml } from "../../utils/pdfDownload";
import "./StudentAdmitCard.css";
import {
  FiFileText,
  FiCalendar,
  FiUser,
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiAward,
  FiLayers,
  FiDownload,
} from "react-icons/fi";
import ClipLoader from "../../Admin/components/ClipLoader";
import { ThreeDots } from "react-loader-spinner";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDateISO = (value) => {
  if (!value) return "-";
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return "-";
  return dateObj.toISOString().slice(0, 10);
};

const pad2 = (n) => String(n).padStart(2, "0");

const formatTime12 = (time24 = "") => {
  const value = String(time24 || "").trim();
  if (!/^\d{2}:\d{2}$/.test(value)) return value || "-";
  const [h, m] = value.split(":").map(Number);
  const hour12 = h % 12 || 12;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${hour12}:${pad2(m)} ${suffix}`;
};

const StudentAdmitCard = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [admitCards, setAdmitCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detailCard, setDetailCard] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchAdmitCards = useCallback(async () => {
    if (!apiBase) return;
    try {
      setLoading(true);
      const response = await axios.get(`${apiBase}/student/admit-card`, {
        withCredentials: true,
      });
      setAdmitCards(response.data?.admitCards || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch admit cards");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchAdmitCards();
  }, [fetchAdmitCards]);

  const handleExpand = async (cardId) => {
    if (expandedId === cardId) {
      setExpandedId(null);
      setDetailCard(null);
      return;
    }
    setExpandedId(cardId);
    try {
      setDetailLoading(true);
      const response = await axios.get(`${apiBase}/student/admit-card/${cardId}`, {
        withCredentials: true,
      });
      setDetailCard(response.data?.admitCard || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch admit card details");
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDownloadAdmitCard = async (cardId) => {
    setDownloadingId(cardId);
    try {
      const response = await axios.get(`${apiBase}/student/admit-card/${cardId}`, {
        withCredentials: true,
      });
      const admitCard = response.data?.admitCard || null;
      if (!admitCard) {
        toast.error("Admit card not found");
        return;
      }

      const snapshot = admitCard?.snapshot || {};
      const exam = admitCard?.exam || {};
      const sessionLabel = String(snapshot?.examSession || exam?.session || "").trim();
      const semesterLabel = String(snapshot?.semester ?? "").trim();
      const semesterHeading = semesterLabel ? `${semesterLabel} SEMESTER` : "SEMESTER";
      const photoUrl = String(
        admitCard?.registration?.photoUrl || snapshot?.photoUrl || ""
      ).trim();
      const subjectRows = Array.isArray(snapshot?.subjects)
        ? snapshot.subjects
            .map(
              (subject) => `
                <tr>
                  <td>${escapeHtml(subject?.subjectName || "-")}</td>
                  <td>${escapeHtml(subject?.subjectCode || "-")}</td>
                </tr>
              `
            )
            .join("")
        : "";

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Admit Card</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 8px; }
              .admit-wrap { border: 2px solid #94a3b8; max-width: 1180px; margin: 0 auto; }
              .hu-title {
                font-size: 38px;
                line-height: 1;
                letter-spacing: 1px;
                text-align: center;
                color: #16a8d9;
                font-weight: 700;
                padding: 8px 8px 4px;
                border-bottom: 2px solid #94a3b8;
              }
              .hu-subtitle {
                text-align: center;
                padding: 4px 8px 6px;
                border-bottom: 2px solid #94a3b8;
              }
              .hu-subtitle .line1 { font-size: 24px; font-weight: 700; color: #f39c34; }
              .hu-subtitle .line2 { font-size: 16px; font-weight: 700; color: #9ca327; margin-top: 1px; }
              table { width: 100%; border-collapse: collapse; }
              .grid td, .grid th {
                border: 2px solid #94a3b8;
                padding: 4px 6px;
                vertical-align: top;
                font-size: 12px;
                color: #1e293b;
              }
              .lbl { color: #6b7280; font-weight: 700; margin-right: 4px; }
              .val { color: #0e7490; font-weight: 700; }
              .photo-box {
                width: 100%;
                min-height: 180px;
                border: 2px solid #6b7280;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background: #ffffff;
              }
              .photo-box img { width: 100%; height: 180px; object-fit: cover; }
              .photo-placeholder { font-size: 11px; color: #64748b; text-align: center; }
              .subject-head { font-weight: 700; color: #0e7490; text-align: center; }
              .subject-table td, .subject-table th { border: 2px solid #94a3b8; padding: 4px 6px; font-size: 11px; }
              .subject-table th { color: #0e7490; font-weight: 700; background: #f8fafc; }
              .signature-area {
                min-height: 70px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #64748b;
                font-size: 11px;
                border-bottom: 2px solid #94a3b8;
              }
              .controller { text-align: center; font-size: 12px; color: #0e7490; font-weight: 700; padding: 6px; }
              .small { font-size: 11px; color: #64748b; line-height: 1.3; }
            </style>
          </head>
          <body>
            <div class="admit-wrap">
              <div class="hu-title">HARIDWAR UNIVERSITY, ROORKEE</div>
              <div class="hu-subtitle">
                <div class="line1">ADMIT CARD</div>
                <div class="line2">${escapeHtml(`${semesterHeading} EXAMINATION (SESSION - ${sessionLabel || "-"})`)}</div>
              </div>

              <table class="grid">
                <tr>
                  <td style="width:43%;">
                    <span class="lbl">Name of the Candidate :</span>
                    <span class="val">${escapeHtml(snapshot?.candidateName || "-")}</span>
                  </td>
                  <td style="width:37%;">
                    <span class="lbl">Father's Name :</span>
                    <span class="val">${escapeHtml(snapshot?.fatherName || "-")}</span>
                  </td>
                  <td rowspan="5" style="width:21%;">
                    <div class="photo-box">
                      ${
                        photoUrl
                          ? `<img src="${escapeHtml(photoUrl)}" alt="Student" />`
                          : `<div class="photo-placeholder">Photo not available</div>`
                      }
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="lbl">Course :</span>
                    <span class="val">${escapeHtml(`${snapshot?.courseName || "-"} (Semester ${snapshot?.semester ?? "-"})`)}</span>
                  </td>
                  <td>
                    <span class="lbl">Roll No:</span>
                    <span class="val">${escapeHtml(snapshot?.rollNo || "-")}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="lbl">Branch :</span>
                    <span class="val">${escapeHtml(snapshot?.branchName || "-")}</span>
                  </td>
                  <td>
                    <span class="lbl">Year:</span>
                    <span class="val">${escapeHtml(String(snapshot?.year ?? "-"))}</span>
                    <span class="lbl" style="margin-left:14px;">Semester:</span>
                    <span class="val">${escapeHtml(String(snapshot?.semester ?? "-"))}</span>
                    <span class="lbl" style="margin-left:14px;">Group:</span>
                    <span class="val">${escapeHtml(snapshot?.groupName || "-")}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="lbl">Batch :</span>
                    <span class="val">${escapeHtml(snapshot?.batchLabel || "-")}</span>
                  </td>
                  <td rowspan="2">
                    <span class="lbl">Examination Centre :</span><br />
                    <span class="val">${escapeHtml(snapshot?.examinationCentre || "-")}</span>
                    <div style="height:8px;"></div>
                    <span class="lbl">Admit Card No :</span>
                    <span class="val">${escapeHtml(admitCard?.admitCardNo || "-")}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <table class="subject-table" style="width:100%; border-collapse: collapse;">
                      <thead>
                        <tr>
                          <th colspan="2" class="subject-head">Subjects</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${subjectRows || '<tr><td colspan="2">No subjects found</td></tr>'}
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:0;">
                    <div class="signature-area"></div>
                    <div class="controller">Controller of Examination</div>
                  </td>
                  <td>
                    <div class="small"><strong>Issue Status:</strong> ${escapeHtml(String(admitCard?.issueStatus || "-").toUpperCase())}</div>
                    <div class="small"><strong>Exam Date:</strong> ${escapeHtml(formatDateISO(exam?.examDate))}</div>
                    <div class="small"><strong>Timing:</strong> ${escapeHtml(
                      exam?.startTime && exam?.endTime
                        ? `${formatTime12(exam.startTime)} - ${formatTime12(exam.endTime)}`
                        : formatTime12(exam?.startTime || "")
                    )}</div>
                  </td>
                </tr>
              </table>
            </div>
          </body>
        </html>
      `;

      await openPdfFromHtml(apiBase, {
        html,
        fileName: `${admitCard?.admitCardNo || "admit-card"}.pdf`,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to download admit card");
    } finally {
      setDownloadingId(null);
    }
  };

  const verifiedCount = admitCards.filter(
    (c) => c.invigilatorVerification?.status === "VERIFIED"
  ).length;
  const pendingCount = admitCards.length - verifiedCount;

  return (
    <section className="student-admit-page">
      <header className="student-admit-hero">
        <div>
          <p className="student-admit-eyebrow">Examination Access</p>
          <h3 className="student-admit-title">
            <FiFileText size={20} /> Student Admit Cards
          </h3>
          <p className="student-admit-subtitle">
            View exam eligibility status, check issued details, and download your admit cards.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAdmitCards}
          disabled={loading}
          className="student-admit-refresh"
        >
          <FiRefreshCw size={14} className={loading ? "spin" : ""} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {loading && admitCards.length === 0 ? (
        <div className="student-admit-state">
          <ThreeDots height="40" width="50" color="#3b82f6" ariaLabel="loading" />
          <p>Loading your admit cards...</p>
        </div>
      ) : admitCards.length === 0 ? (
        <div className="student-admit-state">
          <FiFileText size={44} className="student-admit-state-icon" />
          <p>No admit cards issued yet</p>
          <small>Your admit cards will appear here once issued by the admin.</small>
        </div>
      ) : (
        <>
          <section className="student-admit-summary">
            <article className="student-admit-summary-card total">
              <p><FiLayers size={13} /> Total Cards</p>
              <strong>{admitCards.length}</strong>
            </article>
            <article className="student-admit-summary-card verified">
              <p><FiCheckCircle size={13} /> Verified</p>
              <strong>{verifiedCount}</strong>
            </article>
            <article className="student-admit-summary-card pending">
              <p><FiClock size={13} /> Pending Verification</p>
              <strong>{pendingCount}</strong>
            </article>
          </section>

          <div className="student-admit-list">
            {admitCards.map((card) => {
              const isExpanded = expandedId === card._id;
              const isVerified = card.invigilatorVerification?.status === "VERIFIED";
              return (
                <div key={card._id} className={`student-admit-card ${isExpanded ? "expanded" : ""}`}>
                  <div className={`student-admit-card-top ${isVerified ? "verified" : "pending"}`} />

                  <div onClick={() => handleExpand(card._id)} className="student-admit-card-head">
                    <div className="student-admit-head-left">
                      <div className={`student-admit-icon ${isVerified ? "verified" : "pending"}`}>
                        <FiAward size={20} />
                      </div>

                      <div className="student-admit-head-content">
                        <div className="student-admit-head-top">
                          <span className="student-admit-exam-name">{card.exam?.examName || "Exam"}</span>
                          <span className={`student-admit-chip ${isVerified ? "verified" : "pending"}`}>
                            {isVerified ? <FiCheckCircle size={12} /> : <FiClock size={12} />}
                            {isVerified ? "Verified" : "Pending"}
                          </span>
                        </div>
                        <div className="student-admit-meta">
                          <span><FiFileText size={12} /> Admit Card No: {card.admitCardNo}</span>
                          {card.exam?.session ? <span><FiCalendar size={12} /> {card.exam.session}</span> : null}
                          {card.exam?.examDate ? <span><FiCalendar size={12} /> {formatDate(card.exam.examDate)}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="student-admit-head-actions">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAdmitCard(card._id);
                        }}
                        title="Download Admit Card"
                        disabled={downloadingId === card._id}
                        className="student-admit-download"
                      >
                        {downloadingId === card._id
                          ? <ClipLoader size={14} color="#64748b" trackColor="rgba(100,116,139,0.25)" />
                          : <FiDownload size={15} />}
                      </button>
                      <div className={`student-admit-expand-icon ${isExpanded ? "expanded" : ""}`}>
                        {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="student-admit-detail-wrap">
                      {detailLoading ? (
                        <div className="student-admit-detail-loading">
                          <ClipLoader size={28} color="#3b82f6" trackColor="rgba(59,130,246,0.15)" />
                          <p>Loading details...</p>
                        </div>
                      ) : detailCard ? (
                        <div className="student-admit-detail">
                          <div className="student-admit-profile-row">
                            {detailCard.snapshot?.photoUrl ? (
                              <img src={detailCard.snapshot.photoUrl} alt="Student" className="student-admit-photo" />
                            ) : null}
                            <div className="student-admit-profile-info">
                              <h4>{detailCard.snapshot?.candidateName || "N/A"}</h4>
                              <p>
                                {detailCard.snapshot?.courseName}
                                {detailCard.snapshot?.branchName ? ` - ${detailCard.snapshot.branchName}` : ""}
                              </p>
                              <div className="student-admit-mini-tags">
                                {detailCard.snapshot?.rollNo ? (
                                  <MiniTag icon={<FiUser size={11} />} label="Roll No" value={detailCard.snapshot.rollNo} />
                                ) : null}
                                {detailCard.snapshot?.enrollmentNumber ? (
                                  <MiniTag
                                    icon={<FiUser size={11} />}
                                    label="Enrollment"
                                    value={detailCard.snapshot.enrollmentNumber}
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="student-admit-info-grid">
                            {detailCard.snapshot?.batchLabel ? (
                              <InfoItem icon={<FiCalendar size={13} />} label="Batch" value={detailCard.snapshot.batchLabel} />
                            ) : null}
                            {detailCard.snapshot?.year ? (
                              <InfoItem icon={<FiCalendar size={13} />} label="Year" value={detailCard.snapshot.year} />
                            ) : null}
                            {detailCard.snapshot?.semester ? (
                              <InfoItem icon={<FiCalendar size={13} />} label="Semester" value={detailCard.snapshot.semester} />
                            ) : null}
                            {detailCard.snapshot?.examinationCentre ? (
                              <InfoItem
                                icon={<FiMapPin size={13} />}
                                label="Exam Centre"
                                value={detailCard.snapshot.examinationCentre}
                              />
                            ) : null}
                            {detailCard.exam?.block ? (
                              <InfoItem icon={<FiMapPin size={13} />} label="Block" value={detailCard.exam.block} />
                            ) : null}
                            {detailCard.snapshot?.fatherName ? (
                              <InfoItem icon={<FiUser size={13} />} label="Father's Name" value={detailCard.snapshot.fatherName} />
                            ) : null}
                            {detailCard.snapshot?.motherName ? (
                              <InfoItem icon={<FiUser size={13} />} label="Mother's Name" value={detailCard.snapshot.motherName} />
                            ) : null}
                          </div>

                          {detailCard.exam?.startTime || detailCard.exam?.endTime ? (
                            <div className="student-admit-timebar">
                              <FiClock size={15} />
                              {detailCard.exam.startTime ? (
                                <span>Start: <strong>{detailCard.exam.startTime}</strong></span>
                              ) : null}
                              {detailCard.exam.endTime ? (
                                <span>End: <strong>{detailCard.exam.endTime}</strong></span>
                              ) : null}
                            </div>
                          ) : null}

                          {detailCard.snapshot?.subjects?.length > 0 ? (
                            <div>
                              <h4 className="student-admit-subject-title">
                                <FiBookOpen size={15} /> Subjects ({detailCard.snapshot.subjects.length})
                              </h4>
                              <div className="student-admit-subject-table-wrap">
                                <table className="student-admit-subject-table">
                                  <thead>
                                    <tr>
                                      <th>S.No</th>
                                      <th>Subject Code</th>
                                      <th>Subject Name</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detailCard.snapshot.subjects.map((sub, idx) => (
                                      <tr key={idx}>
                                        <td>{idx + 1}</td>
                                        <td className="student-admit-code">{sub.subjectCode}</td>
                                        <td>{sub.subjectName}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="student-admit-detail-empty">
                          <p>No details available.</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div className="student-admit-info-item">
    <span className="student-admit-info-label">{icon} {label}</span>
    <span className="student-admit-info-value">{value || "N/A"}</span>
  </div>
);

const MiniTag = ({ icon, label, value }) => (
  <span className="student-admit-mini-tag">{icon} {label}: {value}</span>
);

export default StudentAdmitCard;
