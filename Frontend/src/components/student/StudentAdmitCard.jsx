import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../../utils/axiosInstance";
import {
  FiFileText,
  FiCalendar,
  FiUser,
  FiHash,
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiAward,
  FiLayers,
} from "react-icons/fi";
import { HiOutlineAcademicCap } from "react-icons/hi2";

const StudentAdmitCard = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [admitCards, setAdmitCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detailCard, setDetailCard] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAdmitCards = async () => {
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
  };

  useEffect(() => {
    fetchAdmitCards();
  }, [apiBase]);

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

  const verifiedCount = admitCards.filter(
    (c) => c.invigilatorVerification?.status === "VERIFIED"
  ).length;
  const pendingCount = admitCards.length - verifiedCount;

  return (
    <section className="student-fees-page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
          <FiFileText size={20} /> Admit Cards
        </h3>
        <button
          type="button"
          onClick={fetchAdmitCards}
          disabled={loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)",
            border: "1px solid #c7d6f0",
            padding: "7px 16px", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer",
            fontSize: "0.84rem", color: "#3b5998", fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          <FiRefreshCw size={14} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && admitCards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <FiLayers size={40} style={{ color: "#94a3b8", marginBottom: "12px" }} />
          <p style={{ color: "#94a3b8", fontSize: "0.92rem" }}>Loading your admit cards...</p>
        </div>
      ) : admitCards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <FiFileText size={44} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
          <p style={{ color: "#64748b", fontSize: "0.95rem", fontWeight: 500 }}>
            No admit cards issued yet
          </p>
          <p style={{ color: "#94a3b8", fontSize: "0.84rem", marginTop: "4px" }}>
            Your admit cards will appear here once issued by the admin.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards row */}
          <div className="student-home-fee-row" style={{ marginBottom: "22px" }}>
            <article className="student-summary-card student-summary-card--fee-total">
              <p style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <FiLayers size={13} /> Total Cards
              </p>
              <strong>{admitCards.length}</strong>
            </article>
            <article className="student-summary-card student-summary-card--fee-paid">
              <p style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <FiCheckCircle size={13} /> Verified
              </p>
              <strong>{verifiedCount}</strong>
            </article>
            <article className="student-summary-card student-summary-card--fee-remaining">
              <p style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <FiClock size={13} /> Pending Verification
              </p>
              <strong>{pendingCount}</strong>
            </article>
          </div>

          {/* Admit cards list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {admitCards.map((card) => {
              const isExpanded = expandedId === card._id;
              const isVerified = card.invigilatorVerification?.status === "VERIFIED";
              return (
                <div
                  key={card._id}
                  style={{
                    background: "linear-gradient(165deg, #ffffff, #f8faff)",
                    border: `1px solid ${isExpanded ? "#a5b4fc" : "rgba(182, 198, 220, 0.72)"}`,
                    borderRadius: "16px",
                    overflow: "hidden",
                    transition: "all 0.25s ease",
                    boxShadow: isExpanded
                      ? "0 8px 28px rgba(15, 108, 247, 0.1)"
                      : "0 4px 14px rgba(18, 43, 81, 0.06)",
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{
                    height: "3px",
                    background: isVerified
                      ? "linear-gradient(120deg, #0fa968, #34d399)"
                      : "linear-gradient(120deg, #f59e0b, #fbbf24)",
                  }} />

                  {/* Card header */}
                  <div
                    onClick={() => handleExpand(card._id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "16px 20px", cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1 }}>
                      {/* Icon circle */}
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isVerified
                          ? "linear-gradient(135deg, #dcfce7, #bbf7d0)"
                          : "linear-gradient(135deg, #fef9c3, #fde68a)",
                        color: isVerified ? "#166534" : "#92400e",
                      }}>
                        <FiAward size={20} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f2d5c" }}>
                            {card.exam?.examName || "Exam"}
                          </span>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            padding: "3px 12px", borderRadius: "999px",
                            fontSize: "0.75rem", fontWeight: 600,
                            background: isVerified ? "#dcfce7" : "#fef9c3",
                            color: isVerified ? "#166534" : "#854d0e",
                          }}>
                            {isVerified ? <FiCheckCircle size={12} /> : <FiClock size={12} />}
                            {isVerified ? "Verified" : "Pending"}
                          </span>
                        </div>
                        <div style={{
                          display: "flex", gap: "14px", fontSize: "0.8rem",
                          color: "#64748b", flexWrap: "wrap",
                        }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <FiHash size={12} /> {card.admitCardNo}
                          </span>
                          {card.exam?.session && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <FiCalendar size={12} /> {card.exam.session}
                            </span>
                          )}
                          {card.exam?.examDate && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <FiCalendar size={12} /> {formatDate(card.exam.examDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "8px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isExpanded ? "#e0e7ff" : "#f1f5f9",
                      color: isExpanded ? "#4f46e5" : "#94a3b8",
                      transition: "all 0.2s",
                    }}>
                      {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{
                      padding: "0 20px 22px",
                      borderTop: "1px solid rgba(182, 198, 220, 0.4)",
                    }}>
                      {detailLoading ? (
                        <div style={{ textAlign: "center", padding: "24px 0" }}>
                          <p style={{ color: "#94a3b8", fontSize: "0.88rem" }}>Loading details...</p>
                        </div>
                      ) : detailCard ? (
                        <div style={{ paddingTop: "18px" }}>
                          {/* Photo + basic info header */}
                          <div style={{
                            display: "flex", gap: "20px", marginBottom: "20px",
                            alignItems: "flex-start", flexWrap: "wrap",
                          }}>
                            {detailCard.snapshot?.photoUrl && (
                              <img
                                src={detailCard.snapshot.photoUrl}
                                alt="Student"
                                style={{
                                  width: "90px", height: "110px", objectFit: "cover",
                                  borderRadius: "12px", border: "2px solid #e2e8f0",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                }}
                              />
                            )}
                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <h4 style={{
                                margin: "0 0 4px", fontSize: "1.1rem",
                                fontWeight: 700, color: "#0f2d5c",
                              }}>
                                {detailCard.snapshot?.candidateName || "N/A"}
                              </h4>
                              <p style={{ margin: "0 0 8px", fontSize: "0.84rem", color: "#64748b" }}>
                                {detailCard.snapshot?.courseName}
                                {detailCard.snapshot?.branchName ? ` — ${detailCard.snapshot.branchName}` : ""}
                              </p>
                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                {detailCard.snapshot?.rollNo && (
                                  <MiniTag icon={<FiHash size={11} />} label="Roll No" value={detailCard.snapshot.rollNo} />
                                )}
                                {detailCard.snapshot?.enrollmentNumber && (
                                  <MiniTag icon={<FiHash size={11} />} label="Enrollment" value={detailCard.snapshot.enrollmentNumber} />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Info grid */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                            gap: "10px", marginBottom: "18px",
                          }}>
                            {detailCard.snapshot?.batchLabel && (
                              <InfoItem icon={<FiCalendar size={13} />} label="Batch" value={detailCard.snapshot.batchLabel} />
                            )}
                            {detailCard.snapshot?.year && (
                              <InfoItem icon={<FiCalendar size={13} />} label="Year" value={detailCard.snapshot.year} />
                            )}
                            {detailCard.snapshot?.semester && (
                              <InfoItem icon={<FiCalendar size={13} />} label="Semester" value={detailCard.snapshot.semester} />
                            )}
                            {detailCard.snapshot?.examinationCentre && (
                              <InfoItem icon={<FiMapPin size={13} />} label="Exam Centre" value={detailCard.snapshot.examinationCentre} />
                            )}
                            {detailCard.exam?.block && (
                              <InfoItem icon={<FiMapPin size={13} />} label="Block" value={detailCard.exam.block} />
                            )}
                            {detailCard.snapshot?.fatherName && (
                              <InfoItem icon={<FiUser size={13} />} label="Father's Name" value={detailCard.snapshot.fatherName} />
                            )}
                            {detailCard.snapshot?.motherName && (
                              <InfoItem icon={<FiUser size={13} />} label="Mother's Name" value={detailCard.snapshot.motherName} />
                            )}
                          </div>

                          {/* Exam timing bar */}
                          {(detailCard.exam?.startTime || detailCard.exam?.endTime) && (
                            <div style={{
                              background: "linear-gradient(135deg, #eff6ff, #e0e7ff)",
                              borderRadius: "10px", padding: "12px 16px",
                              marginBottom: "18px", fontSize: "0.84rem", color: "#3b5998",
                              display: "flex", gap: "20px", flexWrap: "wrap",
                              alignItems: "center", fontWeight: 500,
                            }}>
                              <FiClock size={15} style={{ color: "#4f46e5" }} />
                              {detailCard.exam.startTime && (
                                <span>Start: <strong>{detailCard.exam.startTime}</strong></span>
                              )}
                              {detailCard.exam.endTime && (
                                <span>End: <strong>{detailCard.exam.endTime}</strong></span>
                              )}
                            </div>
                          )}

                          {/* Subjects table */}
                          {detailCard.snapshot?.subjects?.length > 0 && (
                            <div>
                              <h4 style={{
                                fontSize: "0.9rem", fontWeight: 600, color: "#0f2d5c",
                                marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px",
                              }}>
                                <FiBookOpen size={15} /> Subjects ({detailCard.snapshot.subjects.length})
                              </h4>
                              <div style={{
                                overflowX: "auto", borderRadius: "10px",
                                border: "1px solid rgba(182, 198, 220, 0.5)",
                              }}>
                                <table style={{
                                  width: "100%", borderCollapse: "collapse", fontSize: "0.84rem",
                                }}>
                                  <thead>
                                    <tr style={{ background: "linear-gradient(135deg, #f0f4ff, #e8f0fe)" }}>
                                      <th style={thStyle}>#</th>
                                      <th style={thStyle}>Subject Code</th>
                                      <th style={thStyle}>Subject Name</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detailCard.snapshot.subjects.map((sub, idx) => (
                                      <tr key={idx} style={{
                                        borderBottom: "1px solid #f1f5f9",
                                        background: idx % 2 === 0 ? "#fff" : "#fafbff",
                                      }}>
                                        <td style={tdStyle}>{idx + 1}</td>
                                        <td style={{ ...tdStyle, fontWeight: 600, color: "#3b5998" }}>{sub.subjectCode}</td>
                                        <td style={tdStyle}>{sub.subjectName}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", padding: "24px 0" }}>
                          <p style={{ color: "#94a3b8", fontSize: "0.88rem" }}>No details available.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div style={{
    background: "linear-gradient(165deg, #f8faff, #f1f5fb)",
    borderRadius: "10px", padding: "10px 14px",
    display: "flex", flexDirection: "column", gap: "3px",
    border: "1px solid rgba(182, 198, 220, 0.35)",
  }}>
    <span style={{
      fontSize: "0.72rem", color: "#7c8db5", display: "flex",
      alignItems: "center", gap: "4px", textTransform: "uppercase",
      letterSpacing: "0.03em", fontWeight: 600,
    }}>
      {icon} {label}
    </span>
    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f2d5c" }}>
      {value || "N/A"}
    </span>
  </div>
);

const MiniTag = ({ icon, label, value }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: "#f0f4ff", color: "#3b5998", padding: "4px 10px",
    borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600,
    border: "1px solid #dbeafe",
  }}>
    {icon} {label}: {value}
  </span>
);

const thStyle = {
  textAlign: "left", padding: "10px 14px", fontWeight: 600,
  color: "#3b5998", fontSize: "0.8rem", letterSpacing: "0.02em",
};

const tdStyle = {
  padding: "10px 14px", color: "#334155",
};

export default StudentAdmitCard;
