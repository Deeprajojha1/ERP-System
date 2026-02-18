import React, { useEffect, useState, useMemo } from "react";
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Oval } from "react-loader-spinner";
import { FiPrinter } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import "./Subjectattendance.css";

const SubjectAttendance = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [attendanceData, setAttendanceData] = useState(null);

  const semesterOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const batchOptions = ["2023-27", "2024-28", "2022-26", "2021-25", "2020-24"];

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchGroups();
    }
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${apiBase}/admin/department`, {
        withCredentials: true,
      });
      setDepartments(res.data?.departments || []);
    } catch (error) {
      console.error("Fetch departments failed:", error);
      toast.error("Failed to load departments");
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${apiBase}/admin/group`, {
        withCredentials: true,
        params: { department: selectedDepartment },
      });
      setGroups(res.data?.groups || []);
    } catch (error) {
      console.error("Fetch groups failed:", error);
      toast.error("Failed to load groups");
    }
  };

  const fetchAttendanceReport = async () => {
    if (!selectedGroup) {
      toast.error("Please select a Group");
      return;
    }

    try {
      setLoading(true);
      const params = {
        groupId: selectedGroup,
      };

      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (selectedSemester) params.semester = selectedSemester;

      const res = await axios.get(`${apiBase}/admin/attendance/subject-wise-report`, {
        withCredentials: true,
        params,
      });
      setAttendanceData(res.data);
    } catch (error) {
      console.error("Fetch attendance report failed:", error);
      toast.error("Failed to load attendance report");
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedDeptName = useMemo(() => {
    const dept = departments.find((d) => d._id === selectedDepartment);
    return dept?.name || "";
  }, [departments, selectedDepartment]);

  const selectedGroupName = useMemo(() => {
    const group = groups.find((g) => g._id === selectedGroup);
    return group?.name || "";
  }, [groups, selectedGroup]);

  const calculateAttendancePercentage = (present, total) => {
    if (total === 0) return "0%";
    return `${Math.round((present / total) * 100)}%`;
  };

  const formatAttendance = (present, total) => {
    return `${present || 0} / ${total || 0}`;
  };

  return (
    <div className="subject-attendance-page">
      <div className="subject-attendance-header no-print">
        <div>
          <h1 className="subject-attendance-title">Subject-wise Attendance Report</h1>
          <p className="subject-attendance-subtitle">
            View detailed attendance records by subject and group
          </p>
        </div>
      </div>

      <div className="subject-attendance-panel">
        <div className="subject-attendance-filters no-print">
          <div className="filter-row">
            <div className="subject-attendance-filter-group">
              <label htmlFor="batch-select">Batch</label>
              <select
                id="batch-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">Select Batch</option>
                {batchOptions.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="department-select">Department</label>
              <select
                id="department-select"
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedGroup("");
                  setAttendanceData(null);
                }}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="semester-select">Semester</label>
              <select
                id="semester-select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                disabled={!selectedDepartment}
              >
                <option value="">All Semesters</option>
                {semesterOptions.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="group-select">Group</label>
              <select
                id="group-select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                disabled={!selectedDepartment}
              >
                <option value="">Select Group</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="subject-attendance-filter-group">
              <label htmlFor="from-date">From</label>
              <input
                type="date"
                id="from-date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="subject-attendance-filter-group">
              <label htmlFor="to-date">To</label>
              <input
                type="date"
                id="to-date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <button
              className="subject-attendance-show-btn"
              onClick={fetchAttendanceReport}
              disabled={!selectedGroup}
            >
              Show Attendance
            </button>

            <button
              className="subject-attendance-print-btn"
              onClick={handlePrint}
              disabled={!attendanceData}
            >
              <FiPrinter />
              Print
            </button>
          </div>
        </div>

        {loading ? (
          <div className="subject-attendance-loading">
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
            <p>Loading attendance report...</p>
          </div>
        ) : !attendanceData ? (
          <div className="subject-attendance-empty">
            <img src={emptyStateImg} alt="Select filters" />
            <h3>Select Filters to View Report</h3>
            <p>Choose department and group to generate attendance report</p>
          </div>
        ) : (
          <>
            <div className="print-header">
              <h2>HARIDWAR UNIVERSITY</h2>
              <h3>
                Batch: {selectedBatch || "N/A"} | Semester: {selectedSemester || "All"}
              </h3>
              <h4>
                Course: B.Tech. Hons (CSE) (Group {selectedGroupName})
              </h4>
              <p>
                Date Range: {fromDate || "13-02-2026"} to {toDate || "13-02-2026"}
              </p>
              <h3>Subject-wise Attendance Report</h3>
            </div>

            <div className="subject-attendance-table-wrapper">
              <table className="subject-attendance-table">
                <thead>
                  <tr>
                    <th rowSpan="2" className="sr-no-col">SR NO.</th>
                    <th rowSpan="2" className="student-col">STUDENT DETAILS</th>
                    {attendanceData.subjects?.map((subject, idx) => (
                      <th key={idx} className="subject-col">
                        <div className="subject-code">{subject.courseCode}</div>
                        <div className="subject-name">{subject.courseName}</div>
                      </th>
                    ))}
                    <th rowSpan="2" className="total-col">TOTAL PRESENT</th>
                    <th rowSpan="2" className="total-col">TOTAL CLASSES</th>
                    <th rowSpan="2" className="percentage-col">PERCENTAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.students?.map((student, index) => (
                    <tr key={student._id || index}>
                      <td className="sr-no-cell">{index + 1}</td>
                      <td className="student-details">
                        <div className="student-name">{student.name}</div>
                        <div className="student-info">
                          Father: {student.fatherName}
                        </div>
                        <div className="student-info">
                          Enrollment: {student.enrollmentNo}
                        </div>
                        <div className="student-info">
                          Phone: {student.phone}
                        </div>
                      </td>
                      {student.subjectAttendance?.map((subAtt, idx) => (
                        <td key={idx} className="attendance-cell">
                          {formatAttendance(subAtt.present, subAtt.total)}
                        </td>
                      ))}
                      <td className="total-present">{student.totalPresent || 0}</td>
                      <td className="total-classes">{student.totalClasses || 0}</td>
                      <td className="percentage">
                        {calculateAttendancePercentage(
                          student.totalPresent,
                          student.totalClasses
                        )}
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
