import React, { useMemo, useState } from "react";
import "./Leaves.css";

const Leaves = () => {
  const [search, setSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState("All");
  const [facultyStatus, setFacultyStatus] = useState("All");
  const [isOpen, setIsOpen] = useState(false);

  const requests = [
    {
      name: "Priya Patel",
      department: "CIVIL",
      type: "Sick Leave",
      from: "2024-02-10",
      to: "2024-02-12",
      status: "Rejected",
      facultyStatus: "Inactive",
    },
    {
      name: "Anjali Patel",
      department: "CSE",
      type: "Annual Leave",
      from: "2024-02-11",
      to: "2024-02-13",
      status: "Rejected",
      facultyStatus: "Active",
    },
    {
      name: "Neha Gupta",
      department: "CIVIL",
      type: "Casual Leave",
      from: "2024-02-12",
      to: "2024-02-14",
      status: "Approved",
      facultyStatus: "Active",
    },
    {
      name: "Neha Verma",
      department: "ECE",
      type: "Sick Leave",
      from: "2024-02-13",
      to: "2024-02-15",
      status: "Pending",
      facultyStatus: "On Leave",
    },
    {
      name: "Amit Kumar",
      department: "CSE",
      type: "Annual Leave",
      from: "2024-02-14",
      to: "2024-02-16",
      status: "Rejected",
      facultyStatus: "Active",
    },
    {
      name: "Vikram Patel",
      department: "AGRICULTURE",
      type: "Annual Leave",
      from: "2024-02-15",
      to: "2024-02-17",
      status: "Pending",
      facultyStatus: "Active",
    },
    {
      name: "Deepak Sharma",
      department: "CSE",
      type: "Sick Leave",
      from: "2024-02-16",
      to: "2024-02-18",
      status: "Rejected",
      facultyStatus: "Inactive",
    },
  ];

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return requests.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term);
      const matchReq =
        requestStatus === "All" || r.status === requestStatus;
      const matchFac =
        facultyStatus === "All" ||
        r.facultyStatus === facultyStatus;
      return matchSearch && matchReq && matchFac;
    });
  }, [search, requestStatus, facultyStatus]);

  return (
    <div className="leaves-page">
      <div className="leaves-header">
        <h1 className="leaves-title">Leave Management</h1>
        <button
          className="leaves-add-btn"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          + New Request
        </button>
      </div>

      <div className="leaves-toolbar">
        <div className="leaves-search">
          <span className="leaves-search-icon">??</span>
          <input
            type="text"
            placeholder="Search by faculty name or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="leaves-chips">
          <span className="leaves-chip-label">Request</span>
          {["All", "Pending", "Approved", "Rejected"].map(
            (s) => (
              <button
                key={s}
                type="button"
                className={`leaves-chip ${
                  requestStatus === s ? "active" : ""
                }`}
                onClick={() => setRequestStatus(s)}
              >
                {s}
              </button>
            )
          )}
        </div>

        <div className="leaves-chips">
          <span className="leaves-chip-label">Faculty Status</span>
          {["All", "Active", "Inactive", "On Leave"].map(
            (s) => (
              <button
                key={s}
                type="button"
                className={`leaves-chip ${
                  facultyStatus === s ? "active" : ""
                }`}
                onClick={() => setFacultyStatus(s)}
              >
                {s.toUpperCase()}
              </button>
            )
          )}
        </div>
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
              <tr key={`${r.name}-${i}`}>
                <td className="leaves-name">{r.name}</td>
                <td>{r.department}</td>
                <td>{r.type}</td>
                <td>{r.from}</td>
                <td>{r.to}</td>
                <td>{r.status}</td>
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

      <div className={`leaves-modal ${isOpen ? "show" : ""}`}>
        <div
          className="leaves-modal-backdrop"
          onClick={() => setIsOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close"
        />
        <div className="leaves-modal-card">
          <div className="leaves-head">
            <h1>New Leave Request</h1>
            <p>Create a new leave request</p>
          </div>

          <form className="leaves-form">
            <label>
              Faculty Member
              <select>
                <option>Select a faculty</option>
                <option>Anjali Joshi</option>
                <option>Ramesh Joshi</option>
                <option>Neha Sharma</option>
              </select>
            </label>

            <label>
              Leave Type
              <select>
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Annual Leave</option>
                <option>Special Leave</option>
              </select>
            </label>

            <div className="leaves-row">
              <label>
                From Date
                <input type="date" placeholder="dd-mm-yyyy" />
              </label>
              <label>
                To Date
                <input type="date" placeholder="dd-mm-yyyy" />
              </label>
            </div>

            <label>
              Reason
              <textarea placeholder="Enter reason for leave..." rows={4} />
            </label>

            <div className="leaves-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary">
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Leaves;
