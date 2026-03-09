import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import "./ParentPortal.css";

const ParentDashboard = () => {
  const { data } = useOutletContext();
  const attendance = data?.attendance?.overall || {};
  const hostel = data?.hostel || {};
  const feeSummary = data?.fees?.summary || {};
  const subjectWiseAttendance = Array.isArray(data?.attendance?.subjectWise) ? data.attendance.subjectWise : [];

  const topAssignmentMarks = useMemo(() => {
    const list = Array.isArray(data?.assignmentMarks) ? data.assignmentMarks : [];
    return list.slice(0, 5);
  }, [data]);

  return (
    <>
      <div className="parent-grid">
        <section className="parent-card">
          <h3>Student Details</h3>
          <div className="parent-kv"><span>Name</span><strong>{data?.student?.name || "N/A"}</strong></div>
          <div className="parent-kv"><span>Email</span><strong>{data?.student?.email || "N/A"}</strong></div>
          <div className="parent-kv"><span>Academic Year</span><strong>{data?.student?.academicYear || "N/A"}</strong></div>
          <div className="parent-kv"><span>Semester</span><strong>{data?.student?.semester ?? "N/A"}</strong></div>
        </section>

        <section className="parent-card">
          <h3>Attendance Overview</h3>
          <div className="parent-kv"><span>Present</span><strong>{attendance.present ?? 0}</strong></div>
          <div className="parent-kv"><span>Absent</span><strong>{attendance.absent ?? 0}</strong></div>
          <div className="parent-kv"><span>Total</span><strong>{attendance.total ?? 0}</strong></div>
          <div className="parent-kv"><span>Percentage</span><strong>{attendance.percentage ?? 0}%</strong></div>
        </section>

        <section className="parent-card">
          <h3>Hostel</h3>
          <div className="parent-kv"><span>Hosteller</span><strong>{hostel?.isHosteller ? "Yes" : "No"}</strong></div>
          <div className="parent-kv"><span>Hostel Name</span><strong>{hostel?.hostel?.name || "N/A"}</strong></div>
          <div className="parent-kv"><span>Hostel Type</span><strong>{hostel?.hostel?.type || "N/A"}</strong></div>
          <div className="parent-kv"><span>Room</span><strong>{hostel?.room?.roomNumber || "N/A"}</strong></div>
        </section>

        <section className="parent-card">
          <h3>Fee Summary</h3>
          <div className="parent-kv"><span>Total Demand</span><strong>{feeSummary.totalDemand ?? 0}</strong></div>
          <div className="parent-kv"><span>Total Paid</span><strong>{feeSummary.totalPaid ?? 0}</strong></div>
          <div className="parent-kv"><span>Total Due</span><strong>{feeSummary.totalDue ?? 0}</strong></div>
        </section>
      </div>

      <section className="parent-card parent-card--wide">
        <h3>Subject-wise Attendance</h3>
        {subjectWiseAttendance.length === 0 ? (
          <p className="parent-muted">No attendance subjects found.</p>
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Total</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {subjectWiseAttendance.map((row) => (
                  <tr key={row.courseId}>
                    <td>{row.courseName || row.courseCode || "N/A"}</td>
                    <td>{row.present ?? 0}</td>
                    <td>{row.absent ?? 0}</td>
                    <td>{row.total ?? 0}</td>
                    <td>{row.percentage ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="parent-card parent-card--wide">
        <h3>Recent Assignments</h3>
        {topAssignmentMarks.length === 0 ? (
          <p className="parent-muted">No assignment submissions found.</p>
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Marks</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {topAssignmentMarks.map((row) => (
                  <tr key={row.submissionId}>
                    <td>{row.title || "Untitled"}</td>
                    <td>{row.marks ?? "N/A"}</td>
                    <td>{row.grade || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default ParentDashboard;
