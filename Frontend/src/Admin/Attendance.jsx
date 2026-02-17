import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../utils/axiosInstance";
import toast from "react-hot-toast";
import { FiCheckCircle, FiEdit, FiTrash2, FiXCircle } from "react-icons/fi";
import "./Attendance.css";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const DEFAULT_DATE = new Date().toISOString().slice(0, 10);

const Attendance = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [dailyDate, setDailyDate] = useState(DEFAULT_DATE);
  const [dailySummary, setDailySummary] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [recordDisplayCount, setRecordDisplayCount] = useState(10);
  const [studentReport, setStudentReport] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMap, setStatusMap] = useState({});

  const groupOptions = useMemo(() => groups || [], [groups]);

  useEffect(() => {
    if (!apiBase) return;
    fetchGroups();
  }, [apiBase]);

  useEffect(() => {
    if (!apiBase || !dailyDate) return;
    fetchDailySummary(dailyDate);
  }, [apiBase, dailyDate]);

  useEffect(() => {
    if (!selectedGroupId) return;
    fetchGroupStudents(selectedGroupId);
  }, [apiBase, selectedGroupId]);

  const buildStatusMap = (records = []) => {
    const map = {};
    for (const record of records) {
      const id = record.student?._id?.toString() || record.student?.toString();
      if (id) map[id] = record.status;
    }
    setStatusMap(map);
  };

  const setSessionWithRecords = (session) => {
    setSessionDetails(session);
    setRecordDisplayCount(10);
    buildStatusMap(session?.records || []);
  };

  const mapRecordsForPayload = (records = []) =>
    records.map((record) => ({
      student: record.student?._id || record.student,
      status: record.status,
    }));

  const fetchGroups = async () => {
    if (!apiBase) return;
    setGroupsLoading(true);
    try {
      const res = await axiosInstance.get(`${apiBase}/admin/group`);
      const fetched = res.data.groups || [];
      console.log(res);
      setGroups(fetched);
      if (!selectedGroupId && fetched.length) {
        setSelectedGroupId(fetched[0]._id);
      }
    } catch (error) {
      toast.error("Failed to load groups");
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchDailySummary = async (date) => {
    setDailyLoading(true);
    try {
      const res = await axiosInstance.get(`${apiBase}/admin/attendance/daily`, {
        params: { date },
      });
      setDailySummary(res.data.summary || []);
      setSessionDetails(null);
    } catch (error) {
      toast.error("Unable to load attendance summary");
      setDailySummary([]);
    } finally {
      setDailyLoading(false);
    }
  };

  const fetchGroupStudents = async (groupId) => {
    if (!groupId) return;
    setStudentsLoading(true);
    try {
      const res = await axiosInstance.get(`${apiBase}/admin/attendance/group/${groupId}/students`);
      const students = (res.data.students || []).map((student) => ({
        ...student,
        name: student.user?.name,
      }));
      setGroupStudents(students);
      setStudentReport(null);
      setStatusMap({});
    } catch (error) {
      toast.error("Failed to load students for the selected group");
      setGroupStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const buildStatusMap = (records = []) => {
    const map = {};
    for (const record of records) {
      const id = record.student?._id?.toString() || record.student?.toString();
      if (id) map[id] = record.status;
    }
    setStatusMap(map);
  };

  const setSessionWithRecords = (session) => {
    setSessionDetails(session);
    setRecordDisplayCount(10);
    buildStatusMap(session?.records || []);
  };

  const mapRecordsForPayload = (records = []) =>
    records.map((record) => ({
      student: record.student?._id || record.student,
      status: record.status,
    }));

  const updateSessionRecords = async (records, studentId) => {
    if (!sessionDetails?._id) {
      toast.error("Select a session before updating");
      return;
    }

    setActionLoadingId(studentId);
    try {
      const payload = mapRecordsForPayload(records);
      const res = await axiosInstance.put(
        `${apiBase}/admin/attendance/${sessionDetails._id}`,
        { records: payload }
      );
      setSessionWithRecords(res.data.session || null);
    } catch (error) {
      toast.error("Failed to update attendance record");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeStatus = async (studentId, newStatus) => {
    if (!sessionDetails?.records?.length) {
      toast.error("No session loaded to edit");
      return;
    }
    const updated = sessionDetails.records.map((record) => {
      const id = (record.student?._id || record.student)?.toString();
      if (id === studentId) {
        return { ...record, status: newStatus };
      }
      return record;
    });
    await updateSessionRecords(updated, studentId);
  };

  const handleRemoveRecord = async (studentId) => {
    if (!sessionDetails?.records?.length) {
      toast.error("No session loaded to delete from");
      return;
    }
    const updated = sessionDetails.records.filter((record) => {
      const id = (record.student?._id || record.student)?.toString();
      return id !== studentId;
    });
    if (updated.length === sessionDetails.records.length) {
      toast.error("Record not found in session");
      return;
    }
    await updateSessionRecords(updated, studentId);
  };

  const handleSessionClick = async (sessionId) => {
    if (!sessionId) return;
    setSessionLoading(true);
    try {
      const res = await axiosInstance.get(`${apiBase}/admin/attendance/${sessionId}`);
      setSessionWithRecords(res.data.session || null);
    } catch (error) {
      toast.error("Unable to load session details");
      setSessionDetails(null);
      setStatusMap({});
    } finally {
      setSessionLoading(false);
    }
  };

  const handleStudentClick = async (studentId) => {
    if (!studentId) return;
    try {
      const res = await axiosInstance.get(`${apiBase}/admin/attendance/student/${studentId}`);
      setStudentReport(res.data.courses || []);
    } catch (error) {
      toast.error("Failed to load student attendance report");
      setStudentReport(null);
    }
  };

  const handleClearSession = () => {
    setSessionDetails(null);
    setStatusMap({});
  };

  const formatPercentage = (value) => (value != null ? `${Number(value).toFixed(2)}%` : "—");

  const totalStudents = useMemo(() => groupStudents.length, [groupStudents]);

  const markedRecords = sessionDetails?.records || [];
  const totalMarked = markedRecords.length;

  const summaryColumns = [
    {
      label: "Group",
      render: (session) => session.group?.name,
    },
    {
      label: "Course",
      render: (session) => session.course?.courseName,
    },
    {
      label: "Present",
      render: (session) => session.present,
    },
    {
      label: "Absent",
      render: (session) => session.absent,
    },
    {
      label: "%",
      render: (session) => formatPercentage(session.percentage),
    },
  ];

  return (
    <div className="attendance-page">
      <div className="attendance-section">
        <div className="attendance-header">
          <div>
            <h1 className="attendance-title">Attendance Overview</h1>
            <p className="attendance-subtitle">Use backend APIs to review daily sessions.</p>
          </div>
          <div className="attendance-filter">
            <label className="attendance-filter-label">
              Select date
              <input
                type="date"
                value={dailyDate}
                onChange={(event) => setDailyDate(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="attendance-summary-table">
          {dailyLoading ? (
            <div className="attendance-loading">Loading summary...</div>
          ) : dailySummary.length === 0 ? (
            <div className="attendance-empty">No sessions logged for this date.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  {summaryColumns.map((column) => (
                    <th key={column.label}>{column.label}</th>
                  ))}
                  <th className="attendance-action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.map((session) => (
                  <tr key={session.sessionId}>
                    {summaryColumns.map((column) => (
                      <td key={column.label}>{column.render(session)}</td>
                    ))}
                    <td className="attendance-action-col">
                      <button
                        className="attendance-action"
                        onClick={() => handleSessionClick(session.sessionId)}
                        disabled={sessionLoading}
                      >
                        View session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="attendance-layout">
        <div className="attendance-section attendance-vertical">
          <div className="attendance-section-head">
            <h2>Group students</h2>
            <div className="attendance-select-wrapper">
              <select
                value={selectedGroupId || ""}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                disabled={groupsLoading}
              >
                <option value="">Choose a group</option>
                {groupOptions.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="attendance-students">
            {studentsLoading ? (
              <div className="attendance-loading">Loading students...</div>
            ) : !groupStudents.length ? (
              <div className="attendance-empty">Select a group to display students.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>S.no</th>
                    <th>Student</th>
                    <th>Enrollment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupStudents.map((student, index) => (
                    <tr
                      key={student.studentId}
                      onClick={() => handleStudentClick(student.studentId)}
                    >
                      <td>{index + 1}</td>
                      <td>{student.name || student.user?.name || "—"}</td>
                      <td>{student.enrollmentNumber || "—"}</td>
                      <td>
                        <span
                          className={`attendance-status ${(statusMap[student.studentId] || "pending").toLowerCase()}`}
                        >
                          {statusMap[student.studentId] ? (
                            <>
                              {statusMap[student.studentId] === "present" ? (
                                <FiCheckCircle />
                              ) : (
                                <FiXCircle />
                              )}
                              {statusMap[student.studentId].toUpperCase()}
                            </>
                          ) : (
                            <>
                              <FiXCircle />
                              Not marked
                            </>
                          )}
                        </span>
                      </td>
                      <td className="student-actions-cell">
                        <button
                          type="button"
                          className="student-action-btn"
                          title="Mark present"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleChangeStatus(student.studentId, "present");
                          }}
                          disabled={!sessionDetails || actionLoadingId === student.studentId}
                        >
                          <FiEdit />
                        </button>
                        <button
                          type="button"
                          className="student-action-btn delete"
                          title="Remove attendance record"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveRecord(student.studentId);
                          }}
                          disabled={!sessionDetails || actionLoadingId === student.studentId}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="attendance-summary">
            <p>Total students</p>
            <strong>{totalStudents}</strong>
          </div>
        </div>

        <div className="attendance-section attendance-detail">
          <div className="attendance-section-head">
            <h2>Session & student details</h2>
            <button className="attendance-action" onClick={handleClearSession}>
              Clear view
            </button>
          </div>

          {sessionDetails ? (
            <div className="session-card">
              <p className="session-card-label">Session</p>
              <h3>{sessionDetails.course?.courseName}</h3>
              <p>{sessionDetails.group?.name}</p>
              <div className="session-card-stats">
                <span>Marked: {sessionDetails.records?.length || 0}</span>
                <span>Date: {formatDate(sessionDetails.date)}</span>
              </div>
              <p className="session-card-label">
                Students marked ({totalStudents} present + absent)
              </p>
              <div className="session-card-records">
                {markedRecords
                  .slice(0, recordDisplayCount)
                  .map((rec) => (
                    <div key={rec._id} className="session-card-record">
                      <span>{rec.student?.user?.name || rec.student?.enrollmentNumber}</span>
                      <strong className="session-record-status">
                        {rec.status === "present" ? <FiCheckCircle /> : <FiXCircle />}
                        {rec.status}
                      </strong>
                    </div>
                  ))}
                {totalMarked > recordDisplayCount && (
                  <button
                    className="session-card-more-btn"
                    type="button"
                    onClick={() =>
                      setRecordDisplayCount((prev) => Math.min(prev + 10, totalMarked))
                    }
                  >
                    Show more ({Math.min(recordDisplayCount + 10, totalMarked)} / {totalMarked})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="attendance-empty">Select a summary row to view session.</div>
          )}

          {studentReport ? (
            <div className="student-report">
              <p className="session-card-label">Student overall attendance</p>
              {studentReport.map((course) => (
                <div key={course.course?._id || course.course?.code} className="student-report-row">
                  <span>{course.course?.courseName || course.course?.code}</span>
                  <strong>{formatPercentage(course.percentage)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="attendance-empty">Click any student to load their attendance.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
