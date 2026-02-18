import React, { useEffect, useMemo, useState } from "react";
import { FiPrinter } from "react-icons/fi";
import { useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import emptyStateImg from "../assets/empty-state.svg";
import "./Teachingload.css";

const normalizeProgram = (value) => String(value || "").trim().toLowerCase();

const TeachingLoad = () => {
  const [selectedForm, setSelectedForm] = useState("B");
  const [formFilters, setFormFilters] = useState({
    A: { selectedDepartment: "", selectedProgram: "", selectedSemester: "" },
    B: { selectedDepartment: "", selectedProgram: "", selectedSemester: "" },
  });
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const apiBase = useSelector((state) => state.config.apiBase);

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

  useEffect(() => {
    if (!apiBase) return;

    const fetchMasterData = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const [deptRes, courseRes] = await Promise.all([
          axios.get(`${apiBase}/admin/department`, {
            withCredentials: true,
            params: { noCache: "true" },
          }),
          axios.get(`${apiBase}/admin/course`, {
            withCredentials: true,
            params: { noCache: "true" },
          }),
        ]);

        setDepartments(deptRes.data?.departments || []);
        setCourses(courseRes.data?.courses || []);
      } catch (error) {
        setLoadError(error.response?.data?.message || "Failed to fetch course data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasterData();
  }, [apiBase]);

  const selectedDeptName = useMemo(() => {
    const dept = departments.find((d) => String(d._id) === String(selectedDepartment));
    return dept?.name || "";
  }, [departments, selectedDepartment]);

  const programs = useMemo(() => {
    if (!selectedDepartment) return [];
    const selectedDept = departments.find(
      (dept) => String(dept._id) === String(selectedDepartment)
    );
    const deptPrograms = selectedDept?.programs || selectedDept?.program || [];
    if (!Array.isArray(deptPrograms)) return [];

    const dedupedByKey = new Map();
    deptPrograms.forEach((prog) => {
      const label = String(prog || "").trim();
      const key = normalizeProgram(label);
      if (!key || dedupedByKey.has(key)) return;
      dedupedByKey.set(key, label);
    });

    return Array.from(dedupedByKey.values());
  }, [departments, selectedDepartment]);

  const teachingLoadData = useMemo(() => {
    if (!selectedDepartment) return [];
    return courses.filter((course) => {
      if (String(course.departmentId) !== String(selectedDepartment)) return false;
      if (
        selectedProgram &&
        normalizeProgram(course.branch) !== normalizeProgram(selectedProgram)
      ) {
        return false;
      }
      if (selectedSemester && String(course.semester) !== String(selectedSemester)) return false;
      if (Array.isArray(course.facultyIds) && course.facultyIds.length === 0) return false;
      if (Array.isArray(course.facultyMembers) && course.facultyMembers.length === 0) return false;
      return true;
    });
  }, [courses, selectedDepartment, selectedProgram, selectedSemester]);

  const tableRows = useMemo(
    () =>
      teachingLoadData.map((item, index) => ({
        key: item.id || `${item.code || "row"}-${index}`,
        srNo: index + 1,
        facultyName:
          item.coordinatorName ||
          (Array.isArray(item.facultyMembers) && item.facultyMembers.length
            ? item.facultyMembers.map((f) => f.name).filter(Boolean).join(", ")
            : "-"),
        subjectName: item.courseName || "-",
        subjectCode: item.code || "-",
        deptName: item.department || selectedDeptName || "-",
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
          <p className="teaching-load-subtitle">Live mode: mapped from getAllCourses</p>
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
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
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
                  {String(prog).toUpperCase()}
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

        {isLoading ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="Loading" />
            <h3>Loading</h3>
            <p>Fetching departments and courses...</p>
          </div>
        ) : loadError ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="Error" />
            <h3>Failed to Load Data</h3>
            <p>{loadError}</p>
          </div>
        ) : !selectedDepartment ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="Select filters" />
            <h3>Select Department</h3>
            <p>Choose a department to view teaching load</p>
          </div>
        ) : teachingLoadData.length === 0 ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="No data" />
            <h3>No Teaching Load Data</h3>
            <p>No course records found for the selected filters</p>
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
