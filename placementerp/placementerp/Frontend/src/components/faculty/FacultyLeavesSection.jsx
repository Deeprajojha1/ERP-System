import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import {
  fetchFacultyLeaves,
  applyFacultyLeave,
  selectFacultyLeaves,
  selectLeavesLoadState,
  selectApplyLeaveState,
  resetApplyLeaveState,
} from "../../redux/facultyDashboardSlice";

const LEAVE_TYPES = [
  { id: "casual", label: "Casual Leave" },
  { id: "sick", label: "Sick Leave" },
  { id: "annual", label: "Annual Leave" },
  { id: "special", label: "Special Leave" },
  { id: "other", label: "Other" },
];

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "#f59e0b", bg: "#fef3c7", label: "Pending" },
  approved: { icon: CheckCircle, color: "#10b981", bg: "#d1fae5", label: "Approved" },
  rejected: { icon: XCircle, color: "#ef4444", bg: "#fee2e2", label: "Rejected" },
};

export default function FacultyLeavesSection({ facultyData }) {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const leaves = useSelector(selectFacultyLeaves);
  const loadState = useSelector(selectLeavesLoadState);
  const applyState = useSelector(selectApplyLeaveState);

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "casual",
    dateFrom: "",
    dateTo: "",
    reason: "",
  });

  const isLoading = loadState === ADMIN_LOAD_STATES.PENDING;
  const isApplying = applyState === ADMIN_LOAD_STATES.PENDING;

  useEffect(() => {
    if (apiBase && loadState === ADMIN_LOAD_STATES.INITIAL) {
      dispatch(fetchFacultyLeaves({ apiBase }));
    }
  }, [apiBase, loadState, dispatch]);

  const closeLeaveForm = () => {
    setShowApplyForm(false);
    setFormData({ type: "casual", dateFrom: "", dateTo: "", reason: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dateFrom || !formData.dateTo || !formData.reason.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    const facultyId = facultyData?.facultyDetails?._id || facultyData?.roleDetails?._id;
    if (!facultyId) {
      toast.error("Faculty ID not found");
      return;
    }

    const formatDate = (isoDate) => {
      const [y, m, d] = isoDate.split("-");
      return `${d}.${m}.${y}`;
    };

    try {
      await dispatch(
        applyFacultyLeave({
          apiBase,
          payload: {
            faculty: facultyId,
            type: formData.type,
            dateFrom: formatDate(formData.dateFrom),
            dateTo: formatDate(formData.dateTo),
            reason: formData.reason.trim(),
            status: "pending",
          },
        })
      ).unwrap();
      toast.success("Leave application submitted successfully");
      closeLeaveForm();
      dispatch(resetApplyLeaveState());
    } catch {
      toast.error("Failed to submit leave application");
      dispatch(resetApplyLeaveState());
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "N/A";
    if (dateStr.includes(".")) {
      const [d, m, y] = dateStr.split(".");
      return new Date(`${y}-${m}-${d}`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLeaveTypeLabel = (type) => {
    return LEAVE_TYPES.find((t) => t.id === type)?.label || type;
  };

  return (
    <section className="faculty-section faculty-leaves-section">
      {showApplyForm ? (
        <div className="faculty-content-form-page faculty-leave-form-page">
          <div className="faculty-card faculty-leave-form-card">
            <button
              type="button"
              className="faculty-course-back-btn faculty-leave-form-back-btn"
              onClick={closeLeaveForm}
            >
              <ArrowLeft size={16} />
              <span>Back to Leave Management</span>
            </button>

            <div className="faculty-leave-form-head">
              <h3>Apply for Leave</h3>
              <p>Fill in leave details to submit your request for approval.</p>
            </div>

            <form onSubmit={handleSubmit} className="faculty-modal-form faculty-leave-inline-form">
              <div className="faculty-form-group">
                <label>Leave Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="faculty-form-select"
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label>From Date</label>
                  <input
                    type="date"
                    value={formData.dateFrom}
                    onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                    className="faculty-form-input"
                    required
                  />
                </div>
                <div className="faculty-form-group">
                  <label>To Date</label>
                  <input
                    type="date"
                    value={formData.dateTo}
                    onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                    className="faculty-form-input"
                    min={formData.dateFrom}
                    required
                  />
                </div>
              </div>

              <div className="faculty-form-group">
                <label>Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="faculty-form-textarea"
                  placeholder="Please provide a reason for your leave..."
                  rows={5}
                  required
                />
              </div>

              <div className="faculty-modal-actions">
                <button
                  type="button"
                  className="faculty-secondary-btn"
                  onClick={closeLeaveForm}
                  disabled={isApplying}
                >
                  Cancel
                </button>
                <button type="submit" className="faculty-primary-btn" disabled={isApplying}>
                  {isApplying ? (
                    <>
                      <ClipLoader size={16} color="#fff" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="faculty-section-header faculty-leaves-header">
            <div className="faculty-leaves-header-copy">
              <h2 className="faculty-section-title">Leave Management</h2>
              <p className="faculty-section-subtitle">Apply and track your leave requests</p>
            </div>
            <button
              type="button"
              className="faculty-primary-btn faculty-leaves-apply-btn"
              onClick={() => setShowApplyForm(true)}
            >
              <Plus size={18} />
              <span>Apply Leave</span>
            </button>
          </div>

          <div className="faculty-stats-grid">
            <div className="faculty-stat-card">
              <div className="faculty-stat-header">
                <span className="faculty-stat-title">Total Leaves</span>
                <div className="faculty-stat-icon" style={{ background: "#dbeafe" }}>
                  <Calendar size={20} color="#2563eb" />
                </div>
              </div>
              <p className="faculty-stat-value">{leaves.length}</p>
            </div>
            <div className="faculty-stat-card">
              <div className="faculty-stat-header">
                <span className="faculty-stat-title">Pending</span>
                <div className="faculty-stat-icon" style={{ background: "#fef3c7" }}>
                  <Clock size={20} color="#f59e0b" />
                </div>
              </div>
              <p className="faculty-stat-value">
                {leaves.filter((l) => l.status === "pending").length}
              </p>
            </div>
            <div className="faculty-stat-card">
              <div className="faculty-stat-header">
                <span className="faculty-stat-title">Approved</span>
                <div className="faculty-stat-icon" style={{ background: "#d1fae5" }}>
                  <CheckCircle size={20} color="#10b981" />
                </div>
              </div>
              <p className="faculty-stat-value">
                {leaves.filter((l) => l.status === "approved").length}
              </p>
            </div>
            <div className="faculty-stat-card">
              <div className="faculty-stat-header">
                <span className="faculty-stat-title">Rejected</span>
                <div className="faculty-stat-icon" style={{ background: "#fee2e2" }}>
                  <XCircle size={20} color="#ef4444" />
                </div>
              </div>
              <p className="faculty-stat-value">
                {leaves.filter((l) => l.status === "rejected").length}
              </p>
            </div>
          </div>

          <div className="faculty-card">
            <h3 className="faculty-card-title">Leave History</h3>
            {isLoading ? (
              <div className="faculty-loading-inline">
                <ClipLoader size={24} color="#0284c7" />
                <span>Loading leaves...</span>
              </div>
            ) : leaves.length === 0 ? (
              <div className="faculty-empty-state">
                <AlertCircle size={48} color="#94a3b8" />
                <p>No leave applications found</p>
              </div>
            ) : (
              <div className="faculty-leaves-list">
                {leaves.map((leave) => {
                  const statusConfig = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div key={leave._id} className="faculty-leave-item">
                      <div className="faculty-leave-info">
                        <span className="faculty-leave-type">{getLeaveTypeLabel(leave.type)}</span>
                        <div className="faculty-leave-dates">
                          <Calendar size={14} />
                          <span>
                            {formatDisplayDate(leave.dateFrom)} - {formatDisplayDate(leave.dateTo)}
                          </span>
                        </div>
                        {leave.reason && <p className="faculty-leave-reason">{leave.reason}</p>}
                      </div>
                      <div
                        className="faculty-leave-status"
                        style={{ background: statusConfig.bg, color: statusConfig.color }}
                      >
                        <StatusIcon size={14} />
                        <span>{statusConfig.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
