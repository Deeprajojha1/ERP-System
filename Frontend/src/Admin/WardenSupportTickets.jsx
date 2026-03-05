import { useCallback, useEffect, useMemo, useState } from "react";
import { FiLifeBuoy, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import emptyStateImg from "../assets/empty-state.svg";
import { getHostelSummaryApi } from "./constants/hostelApi";
import "./Alert.css";
import "./WardenSupportTickets.css";

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const statusBadgeClass = (status = "") => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "resolved") return "active";
  if (normalized === "closed") return "inactive";
  return "active";
};

export default function WardenSupportTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [hostelFilter, setHostelFilter] = useState("");
  const [hostelOptions, setHostelOptions] = useState([]);
  const [updatingById, setUpdatingById] = useState({});

  useEffect(() => {
    const status = String(searchParams.get("status") || "all");
    const hostelId = String(searchParams.get("hostelId") || "");
    if (status) setStatusFilter(status);
    if (hostelId) setHostelFilter(hostelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await getHostelSummaryApi();
        setHostelOptions(Array.isArray(list) ? list : []);
      } catch (err) {
        void err;
        setHostelOptions([]);
      }
    })();
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (hostelFilter) params.hostelId = hostelFilter;
      const res = await axiosInstance.get("/api/admin/warden-support-tickets", { params });
      setTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load warden support tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [hostelFilter, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") next.set("status", statusFilter);
    if (hostelFilter) next.set("hostelId", hostelFilter);
    setSearchParams(next, { replace: true });
  }, [hostelFilter, setSearchParams, statusFilter]);

  const handleUpdateStatus = async (ticketId, nextStatus) => {
    try {
      setUpdatingById((prev) => ({ ...prev, [ticketId]: true }));
      await axiosInstance.patch(`/api/admin/warden-support-tickets/${ticketId}`, { status: nextStatus });
      toast.success("Ticket updated");
      await fetchTickets();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update ticket.");
    } finally {
      setUpdatingById((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const counts = useMemo(() => {
    const byStatus = new Map();
    tickets.forEach((t) => {
      const s = String(t.status || "open");
      byStatus.set(s, (byStatus.get(s) || 0) + 1);
    });
    return byStatus;
  }, [tickets]);

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div className="alerts-title-block">
          <h2>Warden Support Tickets</h2>
          <p className="alerts-subtitle">Complaints/issues raised by wardens to admin.</p>
        </div>
        <button type="button" className="btn-create-alert" onClick={fetchTickets} disabled={loading}>
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      <div className="warden-support-filters">
        <div className="alerts-form-group warden-support-filter">
          <label htmlFor="ticket-status-filter">Status</label>
          <select
            id="ticket-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {counts.get(opt.value) ? `(${counts.get(opt.value)})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="alerts-form-group warden-support-filter">
          <label htmlFor="ticket-hostel-filter">Hostel</label>
          <select
            id="ticket-hostel-filter"
            value={hostelFilter}
            onChange={(e) => setHostelFilter(e.target.value)}
          >
            <option value="">All Hostels</option>
            {hostelOptions.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="alerts-state error">
          <img src={emptyStateImg} alt="" className="alerts-state-img" />
          <h3>Couldn’t load tickets</h3>
          <p>{error}</p>
          <button type="button" className="alerts-retry-btn" onClick={fetchTickets}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="alerts-state pending">
          <div className="student-dashboard-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>Loading tickets…</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="alerts-empty-state">
          <FiLifeBuoy />
          <h3>No tickets</h3>
          <p>No warden support tickets found for the selected filter.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {tickets.map((t) => (
            <div key={t._id} className="alert-card priority-info">
              <div className="alert-card-header">
                <div className="alert-card-copy">
                  <h3>{t.subject}</h3>
                  <p className="alert-message">{t.message}</p>
                </div>
                <span className={`alert-status-badge ${statusBadgeClass(t.status)}`}>
                  {String(t.status || "open")}
                </span>
              </div>

              <div className="alert-meta">
                <div>
                  <strong>Warden:</strong> {t.createdBy?.name || "—"} {t.createdBy?.email ? `(${t.createdBy.email})` : ""}
                </div>
                <div>
                  <strong>Hostel:</strong> {t.hostel?.name || "—"}
                </div>
                <div>
                  <strong>Created:</strong> {formatDateTime(t.createdAt)}
                </div>
                <div>
                  <strong>Priority:</strong> {String(t.priority || "medium").toUpperCase()}
                </div>
              </div>

              <div className="alert-actions" style={{ justifyContent: "flex-end" }}>
                <select
                  value={t.status || "open"}
                  onChange={(e) => handleUpdateStatus(t._id, e.target.value)}
                  disabled={Boolean(updatingById[t._id])}
                  style={{ maxWidth: 200 }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
