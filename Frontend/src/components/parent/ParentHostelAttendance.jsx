import { useOutletContext } from "react-router-dom";
import "./ParentPortal.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
};

const ParentHostelAttendance = () => {
  const { data } = useOutletContext();
  const hostel = data?.hostel || {};
  const hostelDailyAttendance = Array.isArray(hostel?.dailyAttendance) ? hostel.dailyAttendance : [];

  return (
    <section className="parent-card parent-card--wide parent-section">
      <h3>Hostel Daily Attendance</h3>
      {!hostel?.isHosteller ? (
        <p className="parent-muted">Student is not currently an active hosteller.</p>
      ) : hostelDailyAttendance.length === 0 ? (
        <p className="parent-muted">No daily attendance entries found.</p>
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
              </tr>
            </thead>
            <tbody>
              {hostelDailyAttendance.map((row) => (
                <tr key={row.date}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.presentSessions ?? 0}</td>
                  <td>{row.absentSessions ?? 0}</td>
                  <td>{row.totalSessions ?? 0}</td>
                  <td>{row.dayPercentage ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ParentHostelAttendance;
