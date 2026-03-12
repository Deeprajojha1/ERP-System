import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiSearch, FiCheck, FiX, FiClock, FiInbox } from "react-icons/fi";
import toast from "react-hot-toast";
import ModernDatePicker from "../components/common/ModernDatePicker";
import {
  fetchDemandRequests,
  approveDemandRequest,
  rejectDemandRequest,
  selectDemandRequests,
  selectFeeLoading,
  selectFeeActionLoading,
} from "../redux/feeSlice";
import "./FeeDemandRequests.css";

const FeeDemandRequests = () => {
  const dispatch = useDispatch();
  const requests = useSelector(selectDemandRequests);
  const loading = useSelector(selectFeeLoading);
  const actionLoading = useSelector(selectFeeActionLoading);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approveModal, setApproveModal] = useState(null);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    dispatch(fetchDemandRequests());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return requests.filter((r) => {
      const matchSearch = needle
        ? String(r.studentId || "").toLowerCase().includes(needle) ||
          String(r.academicYear || "").toLowerCase().includes(needle)
        : true;
      const matchStatus =
        statusFilter === "all" || String(r.status) === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    return { total: requests.length, pending, approved, rejected };
  }, [requests]);

  const handleApprove = async () => {
    if (!approveModal) return;
    try {
      await dispatch(
        approveDemandRequest({
          id: approveModal._id,
          dueDate: dueDate || undefined,
        })
      ).unwrap();
      toast.success("Request approved & demand generated");
      setApproveModal(null);
      setDueDate("");
    } catch (error) {
      toast.error(error || "Failed to approve request");
    }
  };

  const handleReject = async (id) => {
    try {
      await dispatch(rejectDemandRequest({ id })).unwrap();
      toast.success("Request rejected");
    } catch (error) {
      toast.error(error || "Failed to reject request");
    }
  };

  const statusFilters = [
    { key: "all", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="fees-page fdr-page">
      <header className="fdr-header">
        <div>
          <h1>Demand Requests</h1>
          <p>Review and approve student-submitted fee demand requests</p>
        </div>
        <button
          type="button"
          className="fee-export-btn"
          onClick={() => dispatch(fetchDemandRequests())}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="fdr-stats">
        <article className="fdr-stat">
          <div className="fdr-stat-icon"><FiInbox /></div>
          <div><p>Total</p><strong>{stats.total}</strong></div>
        </article>
        <article className="fdr-stat">
          <div className="fdr-stat-icon fdr-stat-pending"><FiClock /></div>
          <div><p>Pending</p><strong>{stats.pending}</strong></div>
        </article>
        <article className="fdr-stat">
          <div className="fdr-stat-icon fdr-stat-approved"><FiCheck /></div>
          <div><p>Approved</p><strong>{stats.approved}</strong></div>
        </article>
        <article className="fdr-stat">
          <div className="fdr-stat-icon fdr-stat-rejected"><FiX /></div>
          <div><p>Rejected</p><strong>{stats.rejected}</strong></div>
        </article>
      </section>

      <div className="fdr-controls">
        <div className="fdr-search">
          <span className="fdr-search-icon"><FiSearch /></span>
          <input
            type="search"
            placeholder="Search by student ID or academic year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="fdr-filters">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`fdr-filter ${statusFilter === f.key ? "is-active" : ""}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="fee-table-section">
        <div className="fee-table-head">
          <h2 className="fee-table-title">Requests ({filtered.length})</h2>
        </div>
        <div className="fees-table-wrap">
          <table className="fees-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Academic Year</th>
                <th>Semester</th>
                <th>Hostel</th>
                <th>Transport</th>
                <th>Note</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "24px" }}>
                    Loading requests...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    No demand requests found
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req._id}>
                    <td className="fees-name">{req.studentId}</td>
                    <td>{req.academicYear}</td>
                    <td>{req.semesterNo}</td>
                    <td>{req.hostelAmount > 0 ? `₹${req.hostelAmount.toLocaleString("en-IN")}` : "—"}</td>
                    <td>{req.transportAmount > 0 ? `₹${req.transportAmount.toLocaleString("en-IN")}` : "—"}</td>
                    <td>{req.note || "—"}</td>
                    <td>
                      <span className={`fdr-status fdr-status-${String(req.status || "").toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}</td>
                    <td>
                      {req.status === "PENDING" && (
                        <div className="fdr-actions">
                          <button
                            type="button"
                            className="fdr-approve-btn"
                            disabled={actionLoading}
                            onClick={() => {
                              setApproveModal(req);
                              setDueDate("");
                            }}
                          >
                            <FiCheck /> Approve
                          </button>
                          <button
                            type="button"
                            className="fdr-reject-btn"
                            disabled={actionLoading}
                            onClick={() => handleReject(req._id)}
                          >
                            <FiX /> Reject
                          </button>
                        </div>
                      )}
                      {req.status === "APPROVED" && req.linkedDemandId && (
                        <span className="fdr-linked">
                          Demand: {req.linkedDemandId.academicYear || req.linkedDemandId._id?.slice(-6)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {approveModal && (
        <div className="fdr-modal-overlay" onClick={() => setApproveModal(null)}>
          <div className="fdr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fdr-modal-header">
              <h2>Approve Demand Request</h2>
              <button type="button" className="fdr-modal-close" onClick={() => setApproveModal(null)}>
                ×
              </button>
            </div>
            <div className="fdr-modal-body">
              <p>
                Student: <strong>{approveModal.studentId}</strong> &bull;{" "}
                {approveModal.academicYear} Sem {approveModal.semesterNo}
              </p>
              <label className="fdr-modal-field">
                <span>Due Date (optional, defaults to today)</span>
                <ModernDatePicker
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>
            </div>
            <div className="fdr-modal-actions">
              <button
                type="button"
                className="fdr-modal-cancel"
                onClick={() => setApproveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="fdr-modal-confirm"
                disabled={actionLoading}
                onClick={handleApprove}
              >
                {actionLoading ? "Approving..." : "Approve & Generate Demand"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeDemandRequests;
