import React, { useMemo, useState } from "react";
import "./Courses.css";

const Courses = () => {
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState("All Branches");
  const [isOpen, setIsOpen] = useState(false);

  const branches = [
    "All Branches",
    "CSE",
    "MECH",
    "ECE",
    "CIVIL",
    "AGR",
    "HUM",
  ];

  const courses = [
    {
      code: "CSE101-S5-A",
      name: "Machine Learning",
      department: "CSE",
      students: 77,
      instructor: "Faculty 1",
      status: "Active",
    },
    {
      code: "MECH102-S1-A",
      name: "IoT",
      department: "MECH",
      students: 60,
      instructor: "Faculty 2",
      status: "Active",
    },
    {
      code: "ECE103-S4-B",
      name: "Soft Skills",
      department: "ECE",
      students: 22,
      instructor: "Faculty 3",
      status: "Active",
    },
    {
      code: "CIVIL104-S4-C",
      name: "Cloud Systems",
      department: "CIVIL",
      students: 75,
      instructor: "Faculty 4",
      status: "Active",
    },
    {
      code: "MECH105-S6-A",
      name: "Data Structures",
      department: "MECH",
      students: 54,
      instructor: "Faculty 5",
      status: "Active",
    },
    {
      code: "MECH106-S8-A",
      name: "DBMS",
      department: "MECH",
      students: 42,
      instructor: "Faculty 6",
      status: "Active",
    },
    {
      code: "AGR107-S2-C",
      name: "Soil Science",
      department: "AGR",
      students: 59,
      instructor: "Faculty 7",
      status: "Active",
    },
    {
      code: "CSE108-S5-C",
      name: "Operating Systems",
      department: "CSE",
      students: 73,
      instructor: "Faculty 8",
      status: "Active",
    },
  ];

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return courses.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.department.toLowerCase().includes(term);
      const matchBranch =
        activeBranch === "All Branches" ||
        c.department === activeBranch;
      return matchSearch && matchBranch;
    });
  }, [search, activeBranch]);

  return (
    <div className="courses-page">
      <div className="courses-header">
        <h1 className="courses-title">Courses</h1>
        <button
          className="courses-add-btn"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          + Add Course
        </button>
      </div>

      <div className="courses-toolbar">
        <div className="courses-search">
          <span className="courses-search-icon">??</span>
          <input
            type="text"
            placeholder="Search courses by name, department, or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="courses-tabs">
          {branches.map((b) => (
            <button
              key={b}
              type="button"
              className={`courses-tab ${
                activeBranch === b ? "active" : ""
              }`}
              onClick={() => setActiveBranch(b)}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="courses-table-wrap">
        <table className="courses-table">
          <thead>
            <tr>
              <th>COURSE CODE</th>
              <th>COURSE NAME</th>
              <th>DEPARTMENT</th>
              <th>STUDENTS</th>
              <th>INSTRUCTOR</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.code}>
                <td className="courses-code">{c.code}</td>
                <td>{c.name}</td>
                <td>{c.department}</td>
                <td>{c.students}</td>
                <td>{c.instructor}</td>
                <td>
                  <span className="courses-status">
                    {c.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="courses-empty">
                  No courses found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="courses-modal">
          <div
            className="courses-modal-backdrop"
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="courses-modal-card">
            <div className="courses-modal-head">
              <h2>Add New Course</h2>
              <p>Create a new course entry</p>
            </div>
            <form className="courses-form">
              <label>
                Course Code
                <input placeholder="e.g., CS101" />
              </label>
              <label>
                Course Name
                <input placeholder="e.g., Data Structures" />
              </label>
              <div className="courses-form-row">
                <label>
                  Department
                  <select>
                    {branches
                      .filter((b) => b !== "All Branches")
                      .map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Credits
                  <input placeholder="4" type="number" />
                </label>
              </div>
              <label>
                Instructor
                <select>
                  <option>Select an instructor</option>
                  <option>Faculty 1</option>
                  <option>Faculty 2</option>
                  <option>Faculty 3</option>
                </select>
              </label>
              <div className="courses-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="button" className="btn-primary">
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
