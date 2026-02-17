import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../utils/axiosInstance";
import toast from "react-hot-toast";
import { FiCheckCircle, FiEdit, FiXCircle } from "react-icons/fi";
import "./Attendance.css";
import {
  fetchAdminDailySummary,
  fetchGroupAttendanceByDate,
  selectDailySummary,
  selectDailySummaryLoading,
  selectGroupStudents,
  selectGroupLoading,
  selectGroupError,
  selectGroupStatusMap,
} from "../redux/attendanceSlice";

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
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const dailySummary = useSelector(selectDailySummary);
  const dailyLoading = useSelector(selectDailySummaryLoading);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [dailyDate, setDailyDate] = useState(DEFAULT_DATE);
  const groupStudents = useSelector(selectGroupStudents);
  const groupLoading = useSelector(selectGroupLoading);
  const groupError = useSelector(selectGroupError);
  const groupStatusMap = useSelector(selectGroupStatusMap);
  const [studentsFetchingStarted, setStudentsFetchingStarted] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [recordDisplayCount, setRecordDisplayCount] = useState(10);
  const [studentReport, setStudentReport] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const groupOptions = useMemo(() => groups || [], [groups]);

  useEffect(() => {
    if (!apiBase || !dailyDate) return;
    setSessionDetails(null);
    setStatusMap({});
    dispatch(fetchAdminDailySummary({ date: dailyDate }));
  }, [apiBase, dailyDate, dispatch]);

  useEffect(() => {
    if (!apiBase || !selectedGroupId) return;
    dispatch(fetchGroupAttendanceByDate({ groupId: selectedGroupId, date: dailyDate }));
  }, [apiBase, selectedGroupId, dailyDate, dispatch]);

  useEffect(() => {
    setStudentsFetchingStarted(groupLoading);
  }, [groupLoading]);

  const fetchGroups = useCallback(async () => {
    if (!apiBase) return;
    setGroupsLoading(true);
    try {
      const res = await axiosInstance.get(`${apiBase}/admin/group`);
      const fetched = res.data.groups || [];
      setGroups(fetched);
      setSelectedGroupId((prevId) => prevId || fetched[0]?._id || null);
    } catch (error) {
      toast.error("Failed to load groups");
    } finally {
      setGroupsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (!apiBase) return;
    fetchGroups();
  }, [apiBase, fetchGroups]);

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
    if (!sessionDetails) {
      toast.error("Load a session first");
      return;
    }
    const records = sessionDetails.records ? [...sessionDetails.records] : [];
    const index = records.findIndex((record) => {
      const id = (record.student?._id || record.student)?.toString();
      return id === studentId;
    });
    if (index >= 0) {
      records[index] = { ...records[index], status: newStatus };
    } else {
      records.push({ student: studentId, status: newStatus });
    }
    await updateSessionRecords(records, studentId);
  };

  const handleToggleStatus = (studentId) => {
    const current = getRowDisplayStatus(studentId);
    const next = current === "present" ? "absent" : "present";
    handleChangeStatus(studentId, next);
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

  const getRowDisplayStatus = (studentId) =>
    statusMap[studentId] || groupStatusMap[studentId] || "not-marked";

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
            <div className="attendance-summary-loader">
              <div className="attendance-dots">
                <span />
                <span />
                <span />
              </div>
              <p>Loading sessions...</p>
            </div>
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
            <div className="attendance-head-controls">
              <div className="group-head-meta">
                <label>
                  
                  <input
                    type="date"
                    value={dailyDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setDailyDate(event.target.value)}
                  />
                </label>
              </div>
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
          </div>

          <div className="attendance-students">
            {groupLoading && studentsFetchingStarted ? (
              <div className="attendance-dots">
                <span />
                <span />
                <span />
                <p>Loading students...</p>
              </div>
            ) : !groupStudents.length ? (
              <div className="attendance-empty">
                {groupError || "Select a group to display students."}
              </div>
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
                        {(() => {
                          const displayStatus = getRowDisplayStatus(student.studentId);
                          return (
                            <span className={`attendance-status ${displayStatus}`}>
                              {displayStatus === "present" ? (
                                <>
                                  <FiCheckCircle />
                                  Present
                                </>
                              ) : displayStatus === "absent" ? (
                                <>
                                  <FiXCircle />
                                  Absent
                                </>
                              ) : (
                                <>
                                  <FiXCircle />
                                  Not marked
                                </>
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="student-actions-cell">
                        <button
                          type="button"
                          className="student-action-btn edit"
                          title="Toggle present/absent"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleStatus(student.studentId);
                          }}
                          disabled={!sessionDetails || actionLoadingId === student.studentId}
                        >
                          <FiEdit />
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
