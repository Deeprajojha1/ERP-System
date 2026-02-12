import React, { useMemo, useState } from "react";
import { FiClock, FiCheckCircle, FiSearch, FiXCircle } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Leaves.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";

const Leaves = () => {
  const [search, setSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState("All");
  const [facultyStatus, setFacultyStatus] = useState("All");
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);

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

          <select
            className="leaves-select"
            value={facultyStatus}
            onChange={(e) => setFacultyStatus(e.target.value)}
          >
            {["All", "Active", "Inactive", "On Leave"].map(
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
                <tr key={`${r.name}-${i}`}>
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
    </div>
  );
};

export default Leaves;
