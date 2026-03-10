import { useOutletContext } from "react-router-dom";
import "./ParentPortal.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
};

const ParentDailySubjectAttendance = () => {
  const { data } = useOutletContext();
  const dailySubjectAttendance = Array.isArray(data?.attendance?.dailySubjectAttendance)
    ? data.attendance.dailySubjectAttendance
    : [];

  return (
    <section className="parent-card parent-card--wide parent-section">
      <h3>Daily Subject Attendance</h3>
      {dailySubjectAttendance.length === 0 ? (
        <p className="parent-muted">No daily subject attendance entries found.</p>
      ) : (
        <div className="parent-table-wrap">
          <table className="parent-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Present Sessions</th>
                <th>Absent Sessions</th>
                <th>Total Sessions</th>
                <th>Day Percentage</th>
                <th>Subjects</th>
              </tr>
            </thead>
            <tbody>
              {dailySubjectAttendance.map((row) => (
                <tr key={row.date}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.presentSessions ?? 0}</td>
                  <td>{row.absentSessions ?? 0}</td>
                  <td>{row.totalSessions ?? 0}</td>
                  <td>{row.dayPercentage ?? 0}%</td>
                  <td>
                    {Array.isArray(row.courses) && row.courses.length
                      ? row.courses
                          .map((course) => `${course.courseCode || course.courseName || "Subject"}: ${course.status || "N/A"}`)
                          .join(", ")
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ParentDailySubjectAttendance;
