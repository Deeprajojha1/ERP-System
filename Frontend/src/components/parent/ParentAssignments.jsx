import { useOutletContext } from "react-router-dom";
import "./ParentPortal.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
};

const ParentAssignments = () => {
  const { data } = useOutletContext();
  const assignments = Array.isArray(data?.assignmentMarks) ? data.assignmentMarks : [];

  return (
    <section className="parent-card parent-card--wide parent-section">
      <h3>Assignment Marks</h3>
      {assignments.length === 0 ? (
        <p className="parent-muted">No assignment submissions found.</p>
      ) : (
        <div className="parent-table-wrap">
          <table className="parent-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Submitted</th>
                <th>Marks</th>
                <th>Grade</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.submissionId}>
                  <td>{row.title || "Untitled"}</td>
                  <td>{formatDate(row.submittedAt)}</td>
                  <td>{row.marks ?? "N/A"}</td>
                  <td>{row.grade || "N/A"}</td>
                  <td>{row.feedback || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ParentAssignments;
