import React, { useMemo, useState } from "react";
import { FiPrinter } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import "./Teachingload.css";

const DUMMY_DEPARTMENTS = [
  { id: "dept-cse", name: "Computer Science & Engineering", programs: ["CSE", "AI", "DS"] },
  { id: "dept-mech", name: "Mechanical Engineering", programs: ["MECH"] },
  { id: "dept-civil", name: "Civil Engineering", programs: ["CIVIL"] },
  { id: "dept-ee", name: "Electrical Engineering", programs: ["EE"] },
  { id: "dept-pharma", name: "Pharmacy", programs: ["B.Pharm", "D.Pharm"] },
  { id: "dept-bs", name: "Basic Sciences", programs: ["BS"] },
  { id: "dept-ca", name: "Computer Application", programs: ["BCA", "MCA"] },
  {
    id: "dept-ash",
    name: "Applied Science and Humanities",
    programs: ["ASH", "Humanities"],
  },
  { id: "dept-nursing", name: "Nursing", programs: ["B.Sc Nursing", "GNM"] },
];

const SUBJECT_POOL = [
  "Engineering Mathematics",
  "Data Structures",
  "Operating System",
  "DBMS",
  "Software Engineering",
  "Fluid Mechanics",
  "Surveying",
  "Machine Design",
  "Pharmacology",
  "Pharmaceutics",
  "Biochemistry",
  "Human Anatomy",
  "Programming in C",
  "Python Programming",
  "Communication Skills",
  "Environmental Science",
];

const FACULTY_POOL = [
  "Dr. A. Sharma",
  "Prof. R. Patel",
  "Ms. Pooja Yadav",
  "Mr. Rajiv Patel",
  "Dr. Himanshu Verma",
  "Ms. Sanjana",
  "Mr. Ankit Agarwal",
  "Dr. B. Singh",
  "Mr. Vinay Pant",
  "Ms. Mrinalinee Singh",
];

const buildDummyCourses = () => {
  const rows = [];
  let serial = 1;
  DUMMY_DEPARTMENTS.forEach((department) => {
    for (let i = 0; i < 30; i += 1) {
      const program = department.programs[i % department.programs.length];
      const semester = (i % 8) + 1;
      const subjectName = SUBJECT_POOL[(serial - 1) % SUBJECT_POOL.length];
      const facultyName = FACULTY_POOL[(serial - 1) % FACULTY_POOL.length];
      const subjectCode = `DUM${String(1000 + serial)}`;

      rows.push({
        _id: `dummy-${serial}`,
        facultyName,
        subjectName: `${subjectName} ${program}`,
        subjectCode,
        deptId: department.id,
        deptName: department.name,
        program,
        semester,
      });
      serial += 1;
    }
  });
  return rows;
};

const DUMMY_COURSES = buildDummyCourses();
const TOTAL_DUMMY_RECORDS = DUMMY_COURSES.length;

const TeachingLoad = () => {
  const [selectedForm, setSelectedForm] = useState("B");
  const [formFilters, setFormFilters] = useState({
    A: { selectedDepartment: "", selectedProgram: "", selectedSemester: "" },
    B: { selectedDepartment: "", selectedProgram: "", selectedSemester: "" },
  });

  const semesterOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const selectedDepartment = formFilters[selectedForm].selectedDepartment;
  const selectedProgram = formFilters[selectedForm].selectedProgram;
  const selectedSemester = formFilters[selectedForm].selectedSemester;

  const updateActiveFormFilters = (updates) => {
    setFormFilters((prev) => ({
      ...prev,
      [selectedForm]: {
        ...prev[selectedForm],
        ...updates,
      },
    }));
  };

  const selectedDeptName = useMemo(() => {
    const dept = DUMMY_DEPARTMENTS.find((d) => d.id === selectedDepartment);
    return dept?.name || "";
  }, [selectedDepartment]);

  const programs = useMemo(() => {
    const dept = DUMMY_DEPARTMENTS.find((d) => d.id === selectedDepartment);
    return dept?.programs || [];
  }, [selectedDepartment]);

  const teachingLoadData = useMemo(() => {
    if (!selectedDepartment) return [];

    return DUMMY_COURSES.filter((course) => {
      if (course.deptId !== selectedDepartment) return false;
      if (selectedProgram && course.program !== selectedProgram) return false;
      if (selectedSemester && String(course.semester) !== String(selectedSemester)) return false;
      return true;
    });
  }, [selectedDepartment, selectedProgram, selectedSemester]);

  const tableRows = useMemo(
    () =>
      teachingLoadData.map((item, index) => ({
        key: item._id || `${item.facultyName || "row"}-${index}`,
        srNo: index + 1,
        facultyName: item.facultyName || "-",
        subjectName: item.subjectName || "-",
        subjectCode: item.subjectCode || "-",
        deptName: item.deptName || selectedDeptName || "-",
        sem: item.semester || "-",
      })),
    [teachingLoadData, selectedDeptName]
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="teaching-load-page">
      <div className="teaching-load-header no-print">
        <div>
          <h1 className="teaching-load-title">Faculty Teaching Load</h1>
          <p className="teaching-load-subtitle">
            Hardcoded mode: {TOTAL_DUMMY_RECORDS} dummy records (30 per department field)
          </p>
        </div>
      </div>

      <div className="teaching-load-panel">
        <div className="teaching-load-filters no-print">
          <div className="teaching-load-form-toggle" role="group" aria-label="Select form">
            <button
              type="button"
              className={`teaching-load-form-toggle-btn ${selectedForm === "A" ? "active" : ""}`}
              onClick={() => setSelectedForm("A")}
            >
              Form A
            </button>
            <button
              type="button"
              className={`teaching-load-form-toggle-btn ${selectedForm === "B" ? "active" : ""}`}
              onClick={() => setSelectedForm("B")}
            >
              Form B
            </button>
          </div>

          <div className="teaching-load-filter-group">
            <label htmlFor="department-select">Department</label>
            <select
              id="department-select"
              value={selectedDepartment}
              onChange={(e) => {
                updateActiveFormFilters({
                  selectedDepartment: e.target.value,
                  selectedProgram: "",
                  selectedSemester: "",
                });
              }}
            >
              <option value="">Select Department</option>
              {DUMMY_DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="teaching-load-filter-group">
            <label htmlFor="program-select">Program / Class (Optional)</label>
            <select
              id="program-select"
              value={selectedProgram}
              onChange={(e) => {
                updateActiveFormFilters({
                  selectedProgram: e.target.value,
                  selectedSemester: "",
                });
              }}
              disabled={!selectedDepartment}
            >
              <option value="">All Programs</option>
              {programs.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>

          <div className="teaching-load-filter-group">
            <label htmlFor="semester-select">Semester (Optional)</label>
            <select
              id="semester-select"
              value={selectedSemester}
              onChange={(e) =>
                updateActiveFormFilters({
                  selectedSemester: e.target.value,
                })
              }
              disabled={!selectedDepartment}
            >
              <option value="">All Semesters</option>
              {semesterOptions.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          <button
            className="teaching-load-print-btn"
            onClick={handlePrint}
            disabled={!teachingLoadData.length}
          >
            <FiPrinter />
            Print This
          </button>
        </div>

        {!selectedDepartment ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="Select filters" />
            <h3>Select Department</h3>
            <p>Choose a department to view dummy teaching load</p>
          </div>
        ) : teachingLoadData.length === 0 ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="No data" />
            <h3>No Teaching Load Data</h3>
            <p>No dummy records found for the selected filters</p>
          </div>
        ) : (
          <>
            <div className="print-header">
              <h2>HARIDWAR UNIVERSITY, ROORKEE</h2>
              <h3>TEACHING LOAD (ODD SEMESTER, 2024-2025)</h3>
              <h4>
                Department of {selectedDeptName}
                {selectedProgram ? ` - ${selectedProgram}` : ""}
                {selectedSemester && ` - Semester ${selectedSemester}`}
              </h4>
              <p className="print-form-label">{selectedForm === "A" ? "Form A" : "Form B"}</p>
            </div>

            <div className="teaching-load-table-wrapper">
              <p className="teaching-load-form-label">
                Generate {selectedForm === "A" ? "Form A" : "Form B"}
              </p>
              <table className="teaching-load-table">
                <thead>
                  <tr className="teaching-load-table-title-row">
                    <th colSpan={6}>
                      <div className="teaching-load-table-title-block">
                        <p>HARIDWAR UNIVERSITY, ROORKEE</p>
                        <p>TEACHING LOAD (ODD SEMESTER, 2024 2025)</p>
                        <p>{selectedForm === "A" ? "Form A" : "Form B"}</p>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <th>SR NO.</th>
                    <th>Faculty Name</th>
                    <th>Subject Name</th>
                    <th>Subject Code</th>
                    <th>Dept Name</th>
                    <th>Sem</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.srNo}</td>
                      <td>{row.facultyName}</td>
                      <td>{row.subjectName}</td>
                      <td>{row.subjectCode}</td>
                      <td>{row.deptName}</td>
                      <td>{row.sem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeachingLoad;