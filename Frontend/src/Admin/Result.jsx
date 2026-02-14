import React, { useMemo, useState } from "react";
import { FiCheckCircle, FiSearch, FiXCircle } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Result.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";

const Result = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);

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
      const matchStatus = status === "All" || r.status === status;
      return matchSearch && matchStatus;
    });
  }, [results, search, status]);

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="result-state pending app-loader-state">
          <Oval
            height={64}
            width={64}
            color="#2563eb"
            secondaryColor="#bfdbfe"
            strokeWidth={4}
            strokeWidthSecondary={4}
            ariaLabel="Loading"
            visible
          />
          <p>Loading results...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="result-state error">
          <img src={emptyStateImg} alt="Failed" className="result-state-img" />
          <h3>Failed to load results</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <h1 className="result-title">Results & Grades</h1>

        <div className="result-toolbar">
          <div className="result-search">
            <span className="result-search-icon" aria-hidden="true">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search student or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="result-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["All", "PASS", "FAIL"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
                  <td>
                    <span className={`result-status ${r.status === "PASS" ? "pass" : "fail"}`}>
                      {r.status === "PASS" ? <FiCheckCircle /> : <FiXCircle />}
                      {r.status}
                    </span>
                  </td>
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
      </>
    );
  };

  return <div className="result-page">{renderState()}</div>;
};

export default Result;


