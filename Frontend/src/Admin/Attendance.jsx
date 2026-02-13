import React, { useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiEdit2,
  FiSave,
  FiSearch,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Attendance.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
const DEFAULT_DATE = new Date().toISOString().slice(0, 10);

const facultyRows = [
  { id: "f1", name: "Priya Patel", type: "Faculty", department: "CIVIL", status: "Present" },
  { id: "f2", name: "Anjali Patel", type: "Faculty", department: "CSE", status: "Present" },
  { id: "f3", name: "Neha Gupta", type: "Faculty", department: "CIVIL", status: "Present" },
  { id: "f4", name: "Neha Verma", type: "Faculty", department: "ECE", status: "Present" },
  { id: "f5", name: "Amit Kumar", type: "Faculty", department: "CSE", status: "Absent" },
  { id: "f6", name: "Vikram Patel", type: "Faculty", department: "AGRICULTURE", status: "Present" },
  { id: "f7", name: "Deepak Sharma", type: "Faculty", department: "CSE", status: "Absent" },
];

const studentRows = [
  { id: "s1", name: "Rahul Mehta", type: "Student", department: "CSE", status: "Present" },
  { id: "s2", name: "Sneha Shah", type: "Student", department: "CSE", status: "Absent" },
  { id: "s3", name: "Karan Desai", type: "Student", department: "CIVIL", status: "Present" },
  { id: "s4", name: "Riya Joshi", type: "Student", department: "ECE", status: "Absent" },
  { id: "s5", name: "Tina Patel", type: "Student", department: "AGRICULTURE", status: "Present" },
  { id: "s6", name: "Mihir Vora", type: "Student", department: "MECH", status: "Absent" },
];

const Attendance = () => {
  const [facultyData, setFacultyData] = useState(() =>
    facultyRows.map((r) => ({
      ...r,
      baseStatus: r.status,
      attendance: { [DEFAULT_DATE]: r.status },
    }))
  );
  const [studentData, setStudentData] = useState(() =>
    studentRows.map((r) => ({
      ...r,
      baseStatus: r.status,
      attendance: { [DEFAULT_DATE]: r.status },
    }))
  );
  const [search, setSearch] = useState("");
  const [attendanceFor, setAttendanceFor] = useState("Faculty");
  const [facultyDepartment, setFacultyDepartment] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedDate, setSelectedDate] = useState(DEFAULT_DATE);
  const [editingRowId, setEditingRowId] = useState("");
  const [editStatus, setEditStatus] = useState("Present");
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);

  const getStatusForDate = (row) => row.attendance?.[selectedDate] || row.baseStatus;

  const facultyDepartments = useMemo(() => {
    return [...new Set(facultyData.map((r) => r.department))];
  }, [facultyData]);

  const departments = useMemo(() => {
    return [...new Set(studentData.map((r) => r.department))];
  }, [studentData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const selectedRows = attendanceFor === "Faculty" ? facultyData : studentData;

    return selectedRows.filter((r) => {
      const matchSearch =
        term.length === 0 ||
        r.name.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term);

      const matchFacultyDepartment =
        attendanceFor === "Student" || !facultyDepartment || r.department === facultyDepartment;

      const matchDepartment =
        attendanceFor === "Faculty" || !department || r.department === department;

      const currentStatus = getStatusForDate(r);
      const matchStatus = status === "All" || currentStatus === status;

      return matchSearch && matchFacultyDepartment && matchDepartment && matchStatus;
    });
  }, [
    search,
    attendanceFor,
    facultyDepartment,
    department,
    status,
    facultyData,
    studentData,
    selectedDate,
  ]);

  const handleAudienceChange = (value) => {
    setAttendanceFor(value);
    setFacultyDepartment("");
    setDepartment("");
    setEditingRowId("");
  };

  const handleEditStart = (row) => {
    setEditingRowId(row.id);
    setEditStatus(getStatusForDate(row));
  };

  const handleEditSave = (rowId) => {
    const updateRows = (rows) =>
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              attendance: {
                ...(row.attendance || {}),
                [selectedDate]: editStatus,
              },
            }
          : row
      );

    if (attendanceFor === "Faculty") {
      setFacultyData((prev) => updateRows(prev));
    } else {
      setStudentData((prev) => updateRows(prev));
    }

    setEditingRowId("");
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="attendance-state pending">
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
          <p>Loading attendance...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="attendance-state error">
          <img src={emptyStateImg} alt="Failed" className="attendance-state-img" />
          <h3>Failed to load attendance</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <h1 className="attendance-title">Attendance Tracking</h1>

        <div className="attendance-toolbar">
          <div className="attendance-search">
            <span className="attendance-search-icon" aria-hidden="true">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="attendance-type">
            <span className="attendance-label">Attendance:</span>
            {["Faculty", "Student"].map((value) => (
              <button
                key={value}
                type="button"
                className={`attendance-chip ${attendanceFor === value ? "active" : ""}`}
                onClick={() => handleAudienceChange(value)}
              >
                {value}
              </button>
            ))}
          </div>

          {attendanceFor === "Faculty" && (
            <div className="attendance-select">
              <select
                value={facultyDepartment}
                onChange={(e) => setFacultyDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {facultyDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {attendanceFor === "Student" && (
            <div className="attendance-select">
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="attendance-select attendance-date">
            <span className="attendance-date-icon" aria-hidden="true">
              <FiCalendar />
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setEditingRowId("");
              }}
            />
          </div>

          <div className="attendance-status">
            <span className="attendance-label">Status:</span>
            {["All", "Present", "Absent"].map((value) => (
              <button
                key={value}
                type="button"
                className={`attendance-chip ${status === value ? "active" : ""}`}
                onClick={() => setStatus(value)}
              >
                {value}
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
                <th>DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="attendance-name">{r.name}</td>
                  <td>{r.type}</td>
                  <td>{r.department}</td>
                  <td>{selectedDate}</td>
                  <td>
                    <span
                      className={`attendance-status-badge ${
                        getStatusForDate(r) === "Present" ? "present" : "absent"
                      }`}
                    >
                      {getStatusForDate(r) === "Present" ? <FiCheckCircle /> : <FiXCircle />}
                      {getStatusForDate(r)}
                    </span>
                  </td>
                  <td>
                    {editingRowId === r.id ? (
                      <div className="attendance-actions">
                        <select
                          className="attendance-inline-select"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                        <button
                          type="button"
                          className="attendance-row-btn save"
                          onClick={() => handleEditSave(r.id)}
                        >
                          <FiSave />
                          Save
                        </button>
                        <button
                          type="button"
                          className="attendance-row-btn cancel"
                          onClick={() => setEditingRowId("")}
                        >
                          <FiX />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="attendance-row-btn edit"
                        onClick={() => handleEditStart(r)}
                      >
                        <FiEdit2 />
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="attendance-empty">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return <div className="attendance-page">{renderState()}</div>;
};

export default Attendance;
