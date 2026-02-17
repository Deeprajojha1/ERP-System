import { useState, useEffect } from "react";
import axios from "axios";
import { Users, CheckCircle, XCircle } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function AttendanceSection({ facultyData, showToast }) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);

  const todaySchedule = facultyData?.todaySchedule || [];

  useEffect(() => {
    // Extract unique groups from today's schedule
    const uniqueGroups = todaySchedule.reduce((acc, lecture) => {
      if (!acc.find((g) => g._id === lecture.group._id)) {
        acc.push({
          _id: lecture.group._id,
          name: lecture.group.name,
          roomNo: lecture.group.roomNo,
          courses: [],
        });
      }
      const groupIndex = acc.findIndex((g) => g._id === lecture.group._id);
      if (!acc[groupIndex].courses.find((c) => c._id === lecture.course._id)) {
        acc[groupIndex].courses.push(lecture.course);
      }
      return acc;
    }, []);
    
    console.log("Extracted groups:", uniqueGroups);
    setGroups(uniqueGroups);

    if (uniqueGroups.length > 0 && !selectedGroup) {
      console.log("Setting initial group:", uniqueGroups[0]._id);
      setSelectedGroup(uniqueGroups[0]._id);
      if (uniqueGroups[0].courses.length > 0) {
        console.log("Setting initial course:", uniqueGroups[0].courses[0]._id);
        setSelectedCourse(uniqueGroups[0].courses[0]._id);
      }
    }
  }, [todaySchedule, selectedGroup]);

  useEffect(() => {
    if (selectedGroup) {
      fetchStudents();
    }
  }, [selectedGroup]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/faculty/attendance/group/${selectedGroup}/students`, {
        withCredentials: true,
      });
      setStudents(response.data.students || []);
      // Initialize attendance state
      const initialAttendance = {};
      (response.data.students || []).forEach((student) => {
        initialAttendance[student._id] = "present";
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error("Error fetching students:", error);
      showToast("Failed to fetch students", "error");
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student._id] = status;
    });
    setAttendance(newAttendance);
  };

  const resetAttendance = () => {
    const initialAttendance = {};
    students.forEach((student) => {
      initialAttendance[student._id] = "present";
    });
    setAttendance(initialAttendance);
  };

  const handleSubmit = async () => {
    console.log("Submit clicked - selectedGroup:", selectedGroup, "selectedCourse:", selectedCourse);
    
    if (!selectedGroup || !selectedCourse) {
      showToast("Please select group and course", "error");
      return;
    }

    try {
      setLoading(true);
      const records = students.map((student) => ({
        student: student._id,
        status: attendance[student._id] || "present",
      }));

      console.log("Submitting attendance to:", `${API_BASE_URL}/faculty/attendance/${selectedGroup}`);
      console.log("Attendance data:", { courseId: selectedCourse, date: attendanceDate, records });

      await axios.post(
        `${API_BASE_URL}/faculty/attendance/${selectedGroup}`,
        {
          courseId: selectedCourse,
          date: attendanceDate,
          records,
        },
        { withCredentials: true }
      );

      showToast("Attendance submitted successfully", "success");
    } catch (error) {
      console.error("Error submitting attendance:", error);
      showToast(error.response?.data?.message || "Failed to submit attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    present: Object.values(attendance).filter((s) => s === "present").length,
    absent: Object.values(attendance).filter((s) => s === "absent").length,
  };

  const selectedGroupData = groups.find((g) => g._id === selectedGroup);
  const availableCourses = selectedGroupData?.courses || [];

  return (
    <section className="attendance-section">
      <div className="attendance-header">
        <Users size={28} className="attendance-header-icon" />
        <h2 className="faculty-section-title">Take Attendance</h2>
      </div>

      <div className="attendance-filters">
        <div className="attendance-filter-group">
          <label className="attendance-filter-label">Select Group</label>
          <select
            value={selectedGroup}
            onChange={(e) => {
              console.log("Group changed to:", e.target.value);
              setSelectedGroup(e.target.value);
              const group = groups.find((g) => g._id === e.target.value);
              if (group && group.courses.length > 0) {
                console.log("Setting course to:", group.courses[0]._id);
                setSelectedCourse(group.courses[0]._id);
              }
            }}
            className="attendance-filter-select"
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
            onChange={(e) => {
              console.log("Course changed to:", e.target.value);
              setSelectedCourse(e.target.value);
            }}
            className="attendance-filter-select"
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
            className="attendance-filter-input"
          />
        </div>
      </div>

      <div className="attendance-actions">
        <button onClick={() => markAll("present")} className="attendance-btn attendance-btn-present">
          <CheckCircle size={18} />
          Mark All Present
        </button>
        <button onClick={() => markAll("absent")} className="attendance-btn attendance-btn-absent">
          <XCircle size={18} />
          Mark All Absent
        </button>
        <button onClick={resetAttendance} className="attendance-btn attendance-btn-reset">
          Reset
        </button>
      </div>

      <div className="attendance-summary">
        <span className="attendance-summary-item attendance-summary-present">Present: {counts.present}</span>
        <span className="attendance-summary-item attendance-summary-absent">Absent: {counts.absent}</span>
        <span className="attendance-summary-item attendance-summary-total">Total: {students.length}</span>
      </div>

      {loading ? (
        <div className="faculty-empty-state">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="faculty-empty-state">No students found for this group</div>
      ) : (
        <div className="attendance-list">
          {students.map((student) => (
            <div key={student._id} className="attendance-student-row">
              <div className="attendance-student-roll">{student.rollNumber || student.enrollmentNumber}</div>
              <div className="attendance-student-name">{student.user?.name || "Student"}</div>
              <div className="attendance-student-email">{student.user?.email?.substring(0, 25) || ""}</div>
              <div className="attendance-student-actions">
                <button
                  onClick={() => markAttendance(student._id, "present")}
                  className={`attendance-status-btn ${attendance[student._id] === "present" ? "active-present" : ""}`}
                >
                  Present
                </button>
                <button
                  onClick={() => markAttendance(student._id, "absent")}
                  className={`attendance-status-btn ${attendance[student._id] === "absent" ? "active-absent" : ""}`}
                >
                  Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || students.length === 0}
        className="attendance-submit-btn"
      >
        {loading ? "Submitting..." : "Submit Attendance"}
      </button>
    </section>
  );
}
