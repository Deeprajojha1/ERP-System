import React, { useMemo, useState } from "react";
import { FiCheckCircle, FiSearch, FiXCircle } from "react-icons/fi";
import "./Attendance.css";

const Attendance = () => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [status, setStatus] = useState("All");

  const departments = [
    "All Departments",
    "CIVIL",
    "CSE",
    "ECE",
    "AGRICULTURE",
    "HUMANITIES",
    "MECH",
  ];

  const rows = [
    {
      name: "Priya Patel",
      type: "Faculty",
      department: "CIVIL",
      status: "Present",
      monthly: "80%",
    },
    {
      name: "Anjali Patel",
      type: "Faculty",
      department: "CSE",
      status: "Present",
      monthly: "84%",
    },
    {
      name: "Neha Gupta",
      type: "Faculty",
      department: "CIVIL",
      status: "Present",
      monthly: "78%",
    },
    {
      name: "Neha Verma",
      type: "Faculty",
      department: "ECE",
      status: "Present",
      monthly: "87%",
    },
    {
      name: "Amit Kumar",
      type: "Faculty",
      department: "CSE",
      status: "Present",
      monthly: "82%",
    },
    {
      name: "Vikram Patel",
      type: "Faculty",
      department: "AGRICULTURE",
      status: "Present",
      monthly: "94%",
    },
    {
      name: "Deepak Sharma",
      type: "Faculty",
      department: "CSE",
      status: "Absent",
      monthly: "90%",
    },
  ];

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term);
      const matchDept =
        department === "All Departments" ||
        r.department === department;
      const matchStatus =
        status === "All" || r.status === status;
      return matchSearch && matchDept && matchStatus;
    });
  }, [search, department, status]);

  return (
    <div className="attendance-page">
      <h1 className="attendance-title">Attendance Tracking</h1>

      <div className="attendance-toolbar">
        <div className="attendance-search">
          <span className="attendance-search-icon" aria-hidden="true">
            <FiSearch />
          </span>
          <input
            type="text"
            placeholder="Search by name or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="attendance-select">
          <label>Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="attendance-status">
          <span>Status</span>
          {["All", "Present", "Absent"].map((s) => (
            <button
              key={s}
              type="button"
              className={`attendance-chip ${
                status === s ? "active" : ""
              }`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="attendance-table-wrap">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>TYPE</th>
              <th>DEPARTMENT</th>
              <th>STATUS</th>
              <th>MONTHLY %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={`${r.name}-${i}`}>
                <td className="attendance-name">{r.name}</td>
                <td>{r.type}</td>
                <td>{r.department}</td>
                <td>
                  <span
                    className={`attendance-status-badge ${
                      r.status === "Present" ? "present" : "absent"
                    }`}
                  >
                    {r.status === "Present" ? <FiCheckCircle /> : <FiXCircle />}
                    {r.status}
                  </span>
                </td>
                <td>{r.monthly}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="attendance-empty">
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Attendance;
