import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FiPrinter } from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import emptyStateImg from "../assets/empty-state.svg";
import "./Subjectattendance.css";

const formatDateInput = (date = new Date()) => date.toISOString().slice(0, 10);

const STATUS_LABEL = {
  present: "P",
  absent: "A",
  "not-marked": "-",
};

const SubjectAttendance = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedDate, setSelectedDate] = useState(formatDateInput());
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const filteredGroups = useMemo(
    () =>
      groups.filter(
        (group) =>
          String(group.department?._id || group.department) ===
          String(selectedDepartment)
      ),
    [groups, selectedDepartment]
  );

  const selectedDeptName = useMemo(
    () =>
      departments.find((department) => String(department._id) === String(selectedDepartment))
        ?.name || "",
    [departments, selectedDepartment]
  );

  const selectedGroupName = useMemo(
    () => filteredGroups.find((group) => group._id === selectedGroup)?.name || "",
    [filteredGroups, selectedGroup]
  );

  const subjectColumns = useMemo(() => {
    if (!report?.students?.length) return [];
    const byId = new Map();
    report.students.forEach((student) => {
      (student.attendanceEntries || []).forEach((entry) => {
        const courseId = entry.course?._id;
        if (!courseId || byId.has(courseId)) return;
        byId.set(courseId, {
          _id: courseId,
          code: entry.course?.code || "SUBJ",
          courseName: entry.course?.courseName || "Subject",
        });
      });
    });
    return Array.from(byId.values());
  }, [report]);

  const fetchMasterData = async () => {
    if (!apiBase) return;
    try {
      const [departmentRes, groupRes] = await Promise.all([
        axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
          params: { noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/group`, {
          withCredentials: true,
          params: { noCache: "true" },
        }),
      ]);
      setDepartments(departmentRes.data?.departments || []);
      setGroups(groupRes.data?.groups || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load department/group data");
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [apiBase]);

  useEffect(() => {
    if (!selectedDepartment) {
      setSelectedGroup("");
      setReport(null);
      return;
    }
    if (selectedGroup && !filteredGroups.some((group) => group._id === selectedGroup)) {
      setSelectedGroup("");
      setReport(null);
    }
  }, [selectedDepartment, selectedGroup, filteredGroups]);

  const fetchAttendanceReport = async () => {
    if (!selectedDepartment || !selectedGroup || !selectedDate) {
      toast.error("Department, group, and date are required");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `${apiBase}/admin/attendance/group/${selectedGroup}/date/${selectedDate}`,
        { withCredentials: true }
      );
      setReport(response.data || null);
    } catch (error) {
      setReport(null);
      toast.error(error.response?.data?.message || "Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  };

  const getEntryStatus = (student, subjectId) => {
    const entry = (student.attendanceEntries || []).find(
      (item) => String(item.course?._id) === String(subjectId)
    );
    const status = String(entry?.status || "not-marked");
    return STATUS_LABEL[status] || "-";
  };

  const handlePrint = () => {
    if (!report) return;
    window.print();
  };

  return (
    <div className="subject-attendance-page">
      <div className="subject-attendance-header no-print">
        <div>
          <h1 className="subject-attendance-title">Subject-wise Attendance Report</h1>
          <p className="subject-attendance-subtitle">
            Backend route: <code>/api/admin/attendance/group/:groupId/date/:date</code>
          </p>
        </div>
      </div>

      <div className="subject-attendance-panel">
        <div className="subject-attendance-filters no-print">
          <div className="filter-row">
            <div className="subject-attendance-filter-group">
              <label htmlFor="department-select">Department</label>
              <select
                id="department-select"
                value={selectedDepartment}
                onChange={(event) => {
                  setSelectedDepartment(event.target.value);
                  setSelectedGroup("");
                  setReport(null);
                }}
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="group-select">Group</label>
              <select
                id="group-select"
                value={selectedGroup}
                onChange={(event) => {
                  setSelectedGroup(event.target.value);
                  setReport(null);
                }}
                disabled={!selectedDepartment}
              >
                <option value="">Select Group</option>
                {filteredGroups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="report-date">Date</label>
              <input
                id="report-date"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setReport(null);
                }}
              />
            </div>

            <button
              className="subject-attendance-show-btn"
              onClick={fetchAttendanceReport}
              disabled={loading || !selectedGroup}
            >
              {loading ? "Loading..." : "Show Attendance"}
            </button>

            <button
              className="subject-attendance-print-btn"
              onClick={handlePrint}
              disabled={!report}
            >
              <FiPrinter />
              Print
            </button>
          </div>
        </div>

        {!report ? (
          <div className="subject-attendance-empty no-print">
            <img src={emptyStateImg} alt="Select filters" />
            <h3>Select filters to view report</h3>
            <p>Choose department, group, and date.</p>
          </div>
        ) : (
          <>
            <div className="print-header">
              <h2>HARIDWAR UNIVERSITY</h2>
              <h3>Department: {selectedDeptName || "N/A"}</h3>
              <h4>Group: {selectedGroupName || "N/A"}</h4>
              <p>Date: {selectedDate}</p>
              <p>Total Sessions: {report.totalSessions || 0}</p>
            </div>

            <div className="subject-attendance-table-wrapper">
              <table className="subject-attendance-table">
                <thead>
                  <tr>
                    <th className="sr-no-col">SR NO.</th>
                    <th className="student-col">Student</th>
                    {subjectColumns.map((subject) => (
                      <th key={subject._id} className="subject-col">
                        <div className="subject-code">{subject.code}</div>
                        <div className="subject-name">{subject.courseName}</div>
                      </th>
                    ))}
                    <th className="total-col">Present</th>
                    <th className="total-col">Absent</th>
                    <th className="total-col">Not Marked</th>
                    <th className="percentage-col">%</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.students || []).map((student, index) => (
                    <tr key={student.studentId || index}>
                      <td className="sr-no-cell">{index + 1}</td>
                      <td className="student-details">
                        <div className="student-name">{student.name || "Unknown"}</div>
                        <div className="student-info">
                          Enrollment: {student.enrollmentNumber || "N/A"}
                        </div>
                      </td>
                      {subjectColumns.map((subject) => (
                        <td key={`${student.studentId}-${subject._id}`} className="attendance-cell">
                          {getEntryStatus(student, subject._id)}
                        </td>
                      ))}
                      <td className="total-present">{student.summary?.presentCount || 0}</td>
                      <td className="total-classes">{student.summary?.absentCount || 0}</td>
                      <td className="total-classes">{student.summary?.notMarkedCount || 0}</td>
                      <td className="percentage">
                        {student.summary?.totalSessions
                          ? Math.round(
                              ((student.summary.presentCount || 0) /
                                (student.summary.totalSessions || 1)) *
                                100
                            )
                          : 0}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubjectAttendance;
