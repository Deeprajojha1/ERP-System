import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Users, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import {
  fetchStudentsByGroup,
  fetchFacultyAttendancePage,
  markAttendance as markAttendanceThunk,
  updateFacultyAttendanceSession,
  selectStudents,
  selectStudentsLoadState,
  selectMarkAttendanceState,
  selectAttendancePageLoadState,
  selectActiveAttendanceSessionId,
  selectUpdateAttendanceState,
  resetMarkAttendanceState,
  resetUpdateAttendanceState,
} from "../../redux/facultyDashboardSlice";

export default function AttendanceSection({ facultyData }) {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const reduxStudents = useSelector(selectStudents);
  const studentsLoadState = useSelector(selectStudentsLoadState);
  const attendancePageLoadState = useSelector(selectAttendancePageLoadState);
  const activeSessionId = useSelector(selectActiveAttendanceSessionId);
  const markAttendanceState = useSelector(selectMarkAttendanceState);
  const updateAttendanceState = useSelector(selectUpdateAttendanceState);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const isStudentsLoading =
    studentsLoadState === ADMIN_LOAD_STATES.PENDING ||
    attendancePageLoadState === ADMIN_LOAD_STATES.PENDING;
  const isSubmitting =
    markAttendanceState === ADMIN_LOAD_STATES.PENDING ||
    updateAttendanceState === ADMIN_LOAD_STATES.PENDING;

  // If a session already exists for the selected date/course, lock further edits (one-time marking)
  const isLocked = Boolean(activeSessionId);

  // Extract groups from faculty routine
  const groups = useMemo(() => {
    const todaySchedule = facultyData?.todaySchedule || [];
    const routine = facultyData?.roleDetails?.routine || facultyData?.facultyDetails?.routine || {};
    
    // Build groups from today's schedule or routine
    const groupMap = new Map();
    
    // From today's schedule
    todaySchedule.forEach((lecture) => {
      if (lecture?.group?._id && !groupMap.has(lecture.group._id)) {
        groupMap.set(lecture.group._id, {
          _id: lecture.group._id,
          name: lecture.group.name,
          roomNo: lecture.group.roomNo,
          courses: [],
        });
      }
      if (lecture?.group?._id && lecture?.course) {
        const group = groupMap.get(lecture.group._id);
        if (!group.courses.find((c) => c._id === lecture.course._id)) {
          group.courses.push(lecture.course);
        }
      }
    });

    // From routine (all days)
    Object.values(routine).forEach((daySlots) => {
      Object.values(daySlots || {}).forEach((item) => {
        if (item?.group?._id && !groupMap.has(item.group._id)) {
          groupMap.set(item.group._id, {
            _id: item.group._id,
            name: item.group.name,
            roomNo: item.group.roomNo,
            courses: [],
          });
        }
        if (item?.group?._id && item?.course) {
          const group = groupMap.get(item.group._id);
          if (group && !group.courses.find((c) => c._id === item.course._id)) {
            group.courses.push(item.course);
          }
        }
      });
    });

    return Array.from(groupMap.values());
  }, [facultyData]);

  // Set initial selection
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0]._id);
      if (groups[0].courses.length > 0) {
        setSelectedCourse(groups[0].courses[0]._id);
      }
    }
  }, [groups, selectedGroup]);

  // Fetch students/attendance session when group-course-date changes
  useEffect(() => {
    if (!apiBase || !selectedGroup) return;
    if (!selectedCourse) {
      dispatch(fetchStudentsByGroup({ apiBase, groupId: selectedGroup }));
      return;
    }
    dispatch(
      fetchFacultyAttendancePage({
        apiBase,
        groupId: selectedGroup,
        courseId: selectedCourse,
        date: attendanceDate,
      })
    );
  }, [apiBase, selectedGroup, selectedCourse, attendanceDate, dispatch]);

  // Initialize attendance when students change
  useEffect(() => {
    const initialAttendance = {};
    reduxStudents.forEach((student) => {
      const studentId = student._id || student.studentId;
      if (!studentId) return;
      initialAttendance[studentId] = student.status || "present";
    });
    setAttendance(initialAttendance);
  }, [reduxStudents]);

  // Handle mark attendance success/failure
  useEffect(() => {
    if (markAttendanceState === ADMIN_LOAD_STATES.SUCCESS) {
      toast.success("Attendance submitted successfully");
      dispatch(resetMarkAttendanceState());
    } else if (updateAttendanceState === ADMIN_LOAD_STATES.SUCCESS) {
      toast.success("Attendance updated successfully");
      dispatch(resetUpdateAttendanceState());
    } else if (markAttendanceState === ADMIN_LOAD_STATES.FAILURE) {
      toast.error("Failed to submit attendance");
      dispatch(resetMarkAttendanceState());
    } else if (updateAttendanceState === ADMIN_LOAD_STATES.FAILURE) {
      toast.error("Failed to update attendance");
      dispatch(resetUpdateAttendanceState());
    }
  }, [markAttendanceState, updateAttendanceState, dispatch]);

  const handleMarkAttendance = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const newAttendance = {};
    reduxStudents.forEach((student) => {
      const studentId = student._id || student.studentId;
      if (!studentId) return;
      newAttendance[studentId] = status;
    });
    setAttendance(newAttendance);
  };

  const resetAttendance = () => {
    const initialAttendance = {};
    reduxStudents.forEach((student) => {
      const studentId = student._id || student.studentId;
      if (!studentId) return;
      initialAttendance[studentId] = "present";
    });
    setAttendance(initialAttendance);
  };

  const handleRefresh = async () => {
    if (apiBase && selectedGroup && !refreshing) {
      setRefreshing(true);
      try {
        if (selectedCourse) {
          await dispatch(
            fetchFacultyAttendancePage({
              apiBase,
              groupId: selectedGroup,
              courseId: selectedCourse,
              date: attendanceDate,
            })
          ).unwrap();
        } else {
          await dispatch(fetchStudentsByGroup({ apiBase, groupId: selectedGroup })).unwrap();
        }
        toast.success("Students refreshed");
      } catch {
        toast.error("Failed to refresh students");
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (isLocked) {
      toast.error("Attendance already submitted for this date. Edits are disabled.");
      return;
    }
    if (!selectedGroup || !selectedCourse) {
      toast.error("Please select group and course");
      return;
    }

    if (reduxStudents.length === 0) {
      toast.error("No students to mark attendance for");
      return;
    }

    const records = reduxStudents
      .map((student) => {
        const studentId = student._id || student.studentId;
        if (!studentId) return null;
        return {
          student: studentId,
          status: attendance[studentId] || "present",
        };
      })
      .filter(Boolean);

    if (activeSessionId) {
      dispatch(
        updateFacultyAttendanceSession({
          apiBase,
          sessionId: activeSessionId,
          payload: { records },
        })
      );
      return;
    }

    dispatch(
      markAttendanceThunk({
        apiBase,
        groupId: selectedGroup,
        payload: {
          courseId: selectedCourse,
          date: attendanceDate,
          records,
        },
      })
    );
  };

  const counts = {
    present: Object.values(attendance).filter((s) => s === "present").length,
    absent: Object.values(attendance).filter((s) => s === "absent").length,
  };

  const selectedGroupData = groups.find((g) => g._id === selectedGroup);
  const availableCourses = selectedGroupData?.courses || [];

  return (
    <section className="faculty-section attendance-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">Take Attendance</h2>
          <p className="faculty-section-subtitle">Mark attendance for your classes</p>
        </div>
        <button
          type="button"
          className="faculty-secondary-btn"
          onClick={handleRefresh}
          disabled={refreshing || isStudentsLoading || !selectedGroup}
        >
          {refreshing ? (
            <ClipLoader size={16} color="#0284c7" />
          ) : (
            <RefreshCw size={18} />
          )}
          <span>Refresh</span>
        </button>
      </div>

      <div className="attendance-filters">
        <div className="attendance-filter-group">
          <label className="attendance-filter-label">Select Group</label>
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              const group = groups.find((g) => g._id === e.target.value);
              if (group && group.courses.length > 0) {
                setSelectedCourse(group.courses[0]._id);
              }
            }}
            className="faculty-form-select"
            disabled={groups.length === 0}
          >
            {groups.length === 0 ? (
              <option value="">No groups available</option>
            ) : (
              groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name} - Room {group.roomNo}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="attendance-filter-group">
          <label className="attendance-filter-label">Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="faculty-form-select"
            disabled={availableCourses.length === 0}
          >
            {availableCourses.length === 0 ? (
              <option value="">No courses available</option>
            ) : (
              availableCourses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.code} - {course.courseName}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="attendance-filter-group">
          <label className="attendance-filter-label">Date</label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="faculty-form-input"
          />
        </div>
      </div>

      <div className="attendance-actions">
        <button
          type="button"
          onClick={() => markAll("present")}
          className="attendance-btn attendance-btn-present"
          disabled={isStudentsLoading || reduxStudents.length === 0 || isLocked}
        >
          <CheckCircle size={18} />
          Mark All Present
        </button>
        <button
          type="button"
          onClick={() => markAll("absent")}
          className="attendance-btn attendance-btn-absent"
          disabled={isStudentsLoading || reduxStudents.length === 0 || isLocked}
        >
          <XCircle size={18} />
          Mark All Absent
        </button>
        <button
          type="button"
          onClick={resetAttendance}
          className="attendance-btn attendance-btn-reset"
          disabled={isStudentsLoading || reduxStudents.length === 0 || isLocked}
        >
          Reset
        </button>
      </div>

      <div className="attendance-summary">
        <span className="attendance-summary-item attendance-summary-present">Present: {counts.present}</span>
        <span className="attendance-summary-item attendance-summary-absent">Absent: {counts.absent}</span>
        <span className="attendance-summary-item attendance-summary-total">Total: {reduxStudents.length}</span>
        {activeSessionId ? (
          <span className="attendance-summary-item attendance-summary-marked">
            Attendance already submitted for selected date — edits disabled
          </span>
        ) : null}
      </div>

      {isStudentsLoading ? (
        <div className="faculty-loading-inline">
          <ClipLoader size={24} color="#0284c7" />
          <span>Loading students...</span>
        </div>
      ) : reduxStudents.length === 0 ? (
        <div className="faculty-empty-state">
          <Users size={48} color="#94a3b8" />
          <p>No students found for this group</p>
        </div>
      ) : (
        <div className="attendance-list">
          {reduxStudents.map((student) => {
            const studentId = student._id || student.studentId;
            const studentName =
              student.user?.name ||
              student.name ||
              student.studentName ||
              "Student";
            const studentEmail = student.user?.email || student.email || "";
            const studentRoll =
              student.rollNumber || student.enrollmentNumber || student.rollNo || "-";

            return (
              <div key={studentId} className="attendance-student-row">
                <div className="attendance-student-roll">{studentRoll}</div>
                <div className="attendance-student-name">{studentName}</div>
                <div className="attendance-student-email">{studentEmail.substring(0, 25)}</div>
                <div className="attendance-student-actions">
                  <button
                    type="button"
                    onClick={() => handleMarkAttendance(studentId, "present")}
                    className={`attendance-status-btn ${attendance[studentId] === "present" ? "active-present" : ""}`}
                    disabled={isLocked}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAttendance(studentId, "absent")}
                    className={`attendance-status-btn ${attendance[studentId] === "absent" ? "active-absent" : ""}`}
                    disabled={isLocked}
                  >
                    Absent
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || reduxStudents.length === 0 || isLocked}
        className="faculty-primary-btn attendance-submit-btn"
      >
        {isSubmitting ? (
          <>
            <ClipLoader size={16} color="#fff" />
            <span>{activeSessionId ? "Updating..." : "Submitting..."}</span>
          </>
        ) : (
          <span>{activeSessionId ? "Attendance Locked" : "Submit Attendance"}</span>
        )}
      </button>
    </section>
  );
}
