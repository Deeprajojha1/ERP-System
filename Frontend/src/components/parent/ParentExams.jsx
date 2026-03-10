import { useOutletContext } from "react-router-dom";
import "./ParentPortal.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
};

const ParentExams = () => {
  const { data } = useOutletContext();
  const examMarks = Array.isArray(data?.examMarks) ? data.examMarks : [];

  return (
    <section className="parent-card parent-card--wide parent-section">
      <h3>Exam Results</h3>
      {examMarks.length === 0 ? (
        <p className="parent-muted">No published results found.</p>
      ) : (
        <div className="parent-table-wrap">
          <table className="parent-table">
            <thead>
              <tr>
                <th>Semester</th>
                <th>Academic Year</th>
                <th>Status</th>
                <th>Result Date</th>
              </tr>
            </thead>
            <tbody>
              {examMarks.map((row) => (
                <tr key={row.resultId}>
                  <td>{row.semester ?? "N/A"}</td>
                  <td>{row.academicYear || "N/A"}</td>
                  <td>{row.overallStatus || "N/A"}</td>
                  <td>{formatDate(row.resultDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ParentExams;
