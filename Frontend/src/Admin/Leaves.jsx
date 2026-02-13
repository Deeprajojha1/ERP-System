import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import { FiClock, FiCheckCircle, FiSearch, FiXCircle } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import toast from "react-hot-toast";
import emptyStateImg from "../assets/empty-state.svg";
import "./Leaves.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";

const toTitleCase = (value = "") =>
  value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeLeaveStatus = (value = "") => {
  const normalized = String(value).toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "reject") return "Rejected";
  return "Pending";
};

const toApiLeaveStatus = (value = "") => {
  const normalized = String(value).toLowerCase();
  if (normalized === "approved") return "approved ";
  if (normalized === "rejected") return "reject";
  return "pending";
};

const normalizeFacultyStatus = (value = "") => {
  const normalized = String(value).toLowerCase();
  if (normalized === "inactive") return "Inactive";
  if (normalized === "leave") return "On Leave";
  return "Active";
};

const formatLeaveType = (value = "") => {
  const normalized = String(value).toLowerCase();
  if (["casual", "sick", "annual", "special"].includes(normalized)) {
    return `${toTitleCase(normalized)} Leave`;
  }
  return toTitleCase(normalized || "other");
};

const toDisplayDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString();
  }
  return value;
};

const Leaves = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [search, setSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState("All");
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.INITIAL);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoadState(ADMIN_LOAD_STATES.PENDING);
        const res = await axios.get(`${apiBase}/admin/facultyleave`, {
          withCredentials: true,
        });

        const rows = (res.data?.leaves || []).map((leave) => {
          const faculty = leave?.faculty || {};
          const user = faculty?.user || {};
          const department = faculty?.department || {};

          return {
            id: leave?._id,
            name: user?.name || faculty?.employeeId || "N/A",
            email: user?.email || "N/A",
            employeeId: faculty?.employeeId || "N/A",
            department: department?.name || "N/A",
            type: formatLeaveType(leave?.type),
            from: leave?.dateFrom || "N/A",
            to: leave?.dateTo || "N/A",
            status: normalizeLeaveStatus(leave?.status),
            rawStatus: leave?.status || "pending",
            facultyStatus: normalizeFacultyStatus(user?.status),
            appliedOn: leave?.createdAt || null,
            reason: leave?.reason || "N/A",
          };
        });

        setRequests(rows);
        setLoadState(ADMIN_LOAD_STATES.SUCCESS);
      } catch (error) {
        console.error(
          "Fetch leaves failed:",
          error.response?.data || error.message
        );
        setRequests([]);
        setLoadState(ADMIN_LOAD_STATES.FAILURE);
      }
    };

    if (apiBase) {
      fetchLeaves();
    }
  }, [apiBase]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return requests.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term);
      const matchReq =
        requestStatus === "All" || r.status === requestStatus;
      return matchSearch && matchReq;
    });
  }, [requests, search, requestStatus]);

  const openRequestModal = (request) => {
    setSelectedRequest(request);
    setSelectedStatus(request?.status || "Pending");
  };

  const closeRequestModal = () => {
    setSelectedRequest(null);
    setSelectedStatus("Pending");
    setSavingStatus(false);
  };

  const handleStatusSave = async () => {
    if (!selectedRequest?.id) return;

    try {
      setSavingStatus(true);
      await axios.patch(
        `${apiBase}/admin/facultyleave/${selectedRequest.id}/status`,
        { status: toApiLeaveStatus(selectedStatus) },
        { withCredentials: true }
      );

      setRequests((prev) =>
        prev.map((item) =>
          item.id === selectedRequest.id
            ? {
                ...item,
                status: selectedStatus,
                rawStatus: toApiLeaveStatus(selectedStatus),
              }
            : item
        )
      );
      setSelectedRequest((prev) =>
        prev
          ? {
              ...prev,
              status: selectedStatus,
              rawStatus: toApiLeaveStatus(selectedStatus),
            }
          : prev
      );
      toast.success("Leave status updated successfully", {
        icon: "\u2705",
      });
      closeRequestModal();
    } catch (error) {
      console.error(
        "Update leave status failed:",
        error.response?.data || error.message
      );
      toast.error(error.response?.data?.message || "Failed to update status", {
        icon: "\u274C",
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="leaves-state pending">
          <Oval
            height={64}
            width={64}
            color="#2563eb"
            secondaryColor="#bfdbfe"
            strokeWidth={4}
            strokeWidthSecondary={4}
            ariaLabel="Loading"
            visible
          />
          <p>Loading leave requests...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="leaves-state error">
          <img src={emptyStateImg} alt="Failed" className="leaves-state-img" />
          <h3>Failed to load leave requests</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="leaves-header">
          <div>
            <h1 className="leaves-title">Leave Management</h1>
            <p className="leaves-subtitle">
              {filtered.length} leave requests in the organization
            </p>
          </div>
        </div>

        <div className="leaves-toolbar">
          <div className="leaves-search">
            <span className="leaves-search-icon" aria-hidden="true">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search by faculty name or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="leaves-select"
            value={requestStatus}
            onChange={(e) => setRequestStatus(e.target.value)}
          >
            {["All", "Pending", "Approved", "Rejected"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              )
            )}
          </select>

        </div>

        <div className="leaves-table-wrap">
          <table className="leaves-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>DEPARTMENT</th>
                <th>LEAVE TYPE</th>
                <th>FROM DATE</th>
                <th>TO DATE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id || `${r.name}-${i}`}
                  className="leaves-row-clickable"
                  onClick={() => openRequestModal(r)}
                >
                  <td className="leaves-name">{r.name}</td>
                  <td>{r.department}</td>
                  <td>{r.type}</td>
                  <td>{r.from}</td>
                  <td>{r.to}</td>
                  <td>
                    <span
                      className={`leaves-status ${
                        r.status === "Approved"
                          ? "approved"
                          : r.status === "Rejected"
                          ? "rejected"
                          : "pending"
                      }`}
                    >
                      {r.status === "Approved" ? (
                        <FiCheckCircle />
                      ) : r.status === "Rejected" ? (
                        <FiXCircle />
                      ) : (
                        <FiClock />
                      )}
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="leaves-empty">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="leaves-page">
      {renderState()}
      <div className={`leaves-modal ${selectedRequest ? "show" : ""}`}>
        <div
          className="leaves-modal-backdrop"
          onClick={closeRequestModal}
          role="button"
          tabIndex={0}
          aria-label="Close"
        />
        <div className="leaves-modal-card">
          <div className="leaves-head">
            <h1>Leave Request Details</h1>
            <p>Review details and update request status</p>
          </div>
          {selectedRequest && (
            <div className="leaves-form">
              <div className="leaves-row">
                <label>
                  Faculty Name
                  <input value={selectedRequest.name} readOnly />
                </label>
                <label>
                  Employee ID
                  <input value={selectedRequest.employeeId} readOnly />
                </label>
              </div>
              <div className="leaves-row">
                <label>
                  Email
                  <input value={selectedRequest.email} readOnly />
                </label>
                <label>
                  Department
                  <input value={selectedRequest.department} readOnly />
                </label>
              </div>
              <div className="leaves-row">
                <label>
                  Leave Type
                  <input value={selectedRequest.type} readOnly />
                </label>
                <label>
                  Applied On
                  <input value={toDisplayDate(selectedRequest.appliedOn)} readOnly />
                </label>
              </div>
              <div className="leaves-row">
                <label>
                  From Date
                  <input value={selectedRequest.from} readOnly />
                </label>
                <label>
                  To Date
                  <input value={selectedRequest.to} readOnly />
                </label>
              </div>
              <label>
                Reason
                <textarea value={selectedRequest.reason} rows={4} readOnly />
              </label>
              <label>
                Leave Status
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>
              <div className="leaves-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeRequestModal}
                  disabled={savingStatus}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStatusSave}
                  disabled={savingStatus}
                >
                  {savingStatus ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaves;
