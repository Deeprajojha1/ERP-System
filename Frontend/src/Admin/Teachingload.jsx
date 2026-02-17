import React, { useEffect, useState, useMemo } from "react";
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Oval } from "react-loader-spinner";
import { FiPrinter } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import "./Teachingload.css";

const TeachingLoad = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [teachingLoadData, setTeachingLoadData] = useState([]);

  const semesterOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchPrograms();
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedDepartment && selectedProgram) {
      fetchTeachingLoad();
    }
  }, [selectedDepartment, selectedProgram, selectedSemester]);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${apiBase}/admin/department`, {
        withCredentials: true,
      });
      setDepartments(res.data?.departments || []);
    } catch (error) {
      console.error("Fetch departments failed:", error);
      toast.error("Failed to load departments");
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await axios.get(`${apiBase}/admin/courses`, {
        withCredentials: true,
        params: { department: selectedDepartment },
      });
      const uniquePrograms = [
        ...new Set(
          (res.data?.courses || [])
            .map((c) => c.program)
            .filter(Boolean)
        ),
      ];
      setPrograms(uniquePrograms);
    } catch (error) {
      console.error("Fetch programs failed:", error);
      toast.error("Failed to load programs");
    }
  };

  const fetchTeachingLoad = async () => {
    try {
      setLoading(true);
      const params = {
        department: selectedDepartment,
        program: selectedProgram,
      };
      
      if (selectedSemester) {
        params.semester = selectedSemester;
      }

      const res = await axios.get(`${apiBase}/admin/teaching-load`, {
        withCredentials: true,
        params,
      });
      setTeachingLoadData(res.data?.teachingLoad || []);
    } catch (error) {
      console.error("Fetch teaching load failed:", error);
      toast.error("Failed to load teaching load data");
      setTeachingLoadData([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedDeptName = useMemo(() => {
    const dept = departments.find((d) => d._id === selectedDepartment);
    return dept?.name || "";
  }, [departments, selectedDepartment]);

  return (
    <div className="teaching-load-page">
      <div className="teaching-load-header no-print">
        <div>
          <h1 className="teaching-load-title">Faculty Teaching Load</h1>
          <p className="teaching-load-subtitle">
            View class-wise faculty schedule and assignments
          </p>
        </div>
      </div>

      <div className="teaching-load-panel">
        <div className="teaching-load-filters no-print">
          <div className="teaching-load-filter-group">
            <label htmlFor="department-select">Department</label>
            <select
              id="department-select"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedProgram("");
                setSelectedSemester("");
                setTeachingLoadData([]);
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
            <label htmlFor="program-select">Program / Class</label>
            <select
              id="program-select"
              value={selectedProgram}
              onChange={(e) => {
                setSelectedProgram(e.target.value);
                setSelectedSemester("");
              }}
              disabled={!selectedDepartment}
            >
              <option value="">Select Program</option>
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
              onChange={(e) => setSelectedSemester(e.target.value)}
              disabled={!selectedProgram}
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

        {loading ? (
          <div className="teaching-load-loading">
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
            <p>Loading teaching load data...</p>
          </div>
        ) : !selectedDepartment || !selectedProgram ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="Select filters" />
            <h3>Select Department and Program</h3>
            <p>Choose a department and program to view teaching load</p>
          </div>
        ) : teachingLoadData.length === 0 ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="No data" />
            <h3>No Teaching Load Data</h3>
            <p>No faculty assignments found for the selected filters</p>
          </div>
        ) : (
          <>
            <div className="print-header">
              <h2>HARIDWAR UNIVERSITY, ROORKEE</h2>
              <h3>TEACHING LOAD (ODD SEMESTER, 2024-2025)</h3>
              <h4>
                Department of {selectedDeptName} - {selectedProgram}
                {selectedSemester && ` - Semester ${selectedSemester}`}
              </h4>
              <p className="print-form-label">Form II</p>
            </div>

            <div className="teaching-load-table-wrapper">
              <table className="teaching-load-table">
                <thead>
                  <tr>
                    <th>SR NO.</th>
                    <th>Faculty Name</th>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Dept Name</th>
                    <th>Semester</th>
                    <th>Batch</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {teachingLoadData.map((item, index) => (
                    <tr key={item._id || index}>
                      <td>{index + 1}</td>
                      <td>{item.facultyName || "-"}</td>
                      <td>{item.subjectName || "-"}</td>
                      <td>{item.subjectcode || "-"}</td>
                      <td>{item.deptName || selectedDeptName}</td>
                      <td>{item.semester || "-"}</td>
                      <td>{item.batch || "-"}</td>
                      <td>{item.remarks || "-"}</td>
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
