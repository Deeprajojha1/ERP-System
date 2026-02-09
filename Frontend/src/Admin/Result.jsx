import React, { useMemo, useState } from "react";
import "./Result.css";

const Result = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const results = [
    {
      student: "Priya Joshi",
      subject: "AI Fundamentals",
      marks: 48,
      grade: "A+",
      status: "PASS",
    },
    {
      student: "Aditya Rao",
      subject: "Concrete Technology",
      marks: 63,
      grade: "B+",
      status: "PASS",
    },
    {
      student: "Karan Joshi",
      subject: "Power Systems",
      marks: 68,
      grade: "B+",
      status: "PASS",
    },
    {
      student: "Rohan Kumar",
      subject: "Animal Husbandry",
      marks: 87,
      grade: "C+",
      status: "PASS",
    },
    {
      student: "Pooja Sharma",
      subject: "Psychology",
      marks: 65,
      grade: "B+",
      status: "PASS",
    },
    {
      student: "Arjun Rao",
      subject: "AI Fundamentals",
      marks: 60,
      grade: "B+",
      status: "PASS",
    },
    {
      student: "Divya Desai",
      subject: "Mechanics",
      marks: 58,
      grade: "A",
      status: "PASS",
    },
  ];

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return results.filter((r) => {
      const matchSearch =
        r.student.toLowerCase().includes(term) ||
        r.subject.toLowerCase().includes(term);
      const matchStatus =
        status === "All" || r.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  return (
    <div className="result-page">
      <h1 className="result-title">Results & Grades</h1>

      <div className="result-toolbar">
        <div className="result-search">
          <span className="result-search-icon">??</span>
          <input
            type="text"
            placeholder="Search student or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="result-status">
          <span>Status</span>
          {['All','PASS','FAIL'].map((s) => (
            <button
              key={s}
              type="button"
              className={`result-chip ${status === s ? "active" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="result-table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>STUDENT NAME</th>
              <th>SUBJECT</th>
              <th>MARKS</th>
              <th>GRADE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={`${r.student}-${i}`}>
                <td className="result-name">{r.student}</td>
                <td>{r.subject}</td>
                <td>{r.marks}</td>
                <td>{r.grade}</td>
                <td>{r.status}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="result-empty">
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Result;
