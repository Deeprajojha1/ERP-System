import React, { useMemo, useState } from "react";
import "./Subject.css";

const Subject = () => {
  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState("All Departments");

  const departments = [
    "All Departments",
    "CSE",
    "ECE",
    "MECH",
    "CIVIL",
    "HUMANITIES",
    "AGRICULTURE",
  ];

  const subjects = [
    {
      name: "Microprocessors",
      code: "CSE100",
      department: "CSE",
      semester: 1,
      credits: 3,
      instructor: "Faculty Member 1",
    },
    {
      name: "Farm Management",
      code: "ECE101",
      department: "ECE",
      semester: 2,
      credits: 3,
      instructor: "Faculty Member 2",
    },
    {
      name: "Structural Analysis",
      code: "MECH102",
      department: "MECH",
      semester: 3,
      credits: 2,
      instructor: "Faculty Member 3",
    },
    {
      name: "Soil Science",
      code: "CIVIL103",
      department: "CIVIL",
      semester: 4,
      credits: 2,
      instructor: "Faculty Member 4",
    },
    {
      name: "Machine Learning",
      code: "HUMANITIES104",
      department: "HUMANITIES",
      semester: 5,
      credits: 2,
      instructor: "Faculty Member 5",
    },
    {
      name: "Communication Skills",
      code: "AGRICULTURE105",
      department: "AGRICULTURE",
      semester: 6,
      credits: 5,
      instructor: "Faculty Member 6",
    },
    {
      name: "Transportation",
      code: "CSE106",
      department: "CSE",
      semester: 7,
      credits: 4,
      instructor: "Faculty Member 7",
    },
    {
      name: "Mobile Apps",
      code: "ECE107",
      department: "ECE",
      semester: 8,
      credits: 3,
      instructor: "Faculty Member 8",
    },
  ];

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      const term = search.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        s.department.toLowerCase().includes(term);
      const matchDept =
        activeDept === "All Departments" ||
        s.department === activeDept;
      return matchSearch && matchDept;
    });
  }, [search, activeDept]);

  return (
    <div className="subject-page">
      <h1 className="subject-title">Subjects & Curriculum</h1>

      <div className="subject-toolbar">
        <div className="subject-search">
          <span className="subject-search-icon">??</span>
          <input
            type="text"
            placeholder="Search subjects, codes, or departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="subject-tabs">
          {departments.map((dept) => (
            <button
              key={dept}
              type="button"
              className={`subject-tab ${
                activeDept === dept ? "active" : ""
              }`}
              onClick={() => setActiveDept(dept)}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      <div className="subject-table-wrap">
        <table className="subject-table">
          <thead>
            <tr>
              <th>SUBJECT NAME</th>
              <th>CODE</th>
              <th>DEPARTMENT</th>
              <th>SEMESTER</th>
              <th>CREDITS</th>
              <th>INSTRUCTOR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.code}>
                <td className="subject-name">{s.name}</td>
                <td>{s.code}</td>
                <td>{s.department}</td>
                <td>{s.semester}</td>
                <td>{s.credits}</td>
                <td>{s.instructor}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="subject-empty">
                  No subjects found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Subject;
