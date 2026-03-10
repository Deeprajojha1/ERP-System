import React, { useEffect, useMemo, useState } from "react";
import { FiPrinter, FiSearch } from "react-icons/fi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import emptyStateImg from "../assets/empty-state.svg";
import ClipLoader from "./components/ClipLoader";
import "./Teachingload.css";

const TeachingLoad = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const semesterOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  const programOptions = useMemo(() => {
    const selectedDept = String(selectedDepartment || "").trim();
    const options = new Set();
    (courses || []).forEach((course) => {
      const deptId = String(course.departmentId || course.department?._id || "").trim();
      const deptName = String(course.department || course.department?.name || "").trim();
      if (selectedDept && selectedDept !== deptId && selectedDept !== deptName) return;
      const branch = String(course.branch || "").trim();
      if (branch) options.add(branch);
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [courses, selectedDepartment]);

  const groupOptions = useMemo(() => {
    const selectedDept = String(selectedDepartment || "").trim();
    return groups.filter((group) => {
      const deptId = String(group.department?._id || group.departmentId || group.department || "").trim();
      const deptName = String(group.department?.name || "").trim();
      if (!selectedDept) return true;
      return selectedDept === deptId || selectedDept === deptName;
    });
  }, [groups, selectedDepartment]);

  const selectedDeptName = useMemo(
    () =>
      departments.find((department) => String(department._id) === String(selectedDepartment))
        ?.name || "",
    [departments, selectedDepartment]
  );

  const filteredRows = useMemo(() => {
    if (!selectedGroup) return rows;
    const selectedGroupName = groupOptions.find((group) => group._id === selectedGroup)?.name;
    if (!selectedGroupName) return rows;
    return rows.filter((row) =>
      String(row.batch || "")
        .toLowerCase()
        .includes(String(selectedGroupName).toLowerCase())
    );
  }, [rows, selectedGroup, groupOptions]);

  const fetchMasterData = async () => {
    if (!apiBase) return;
    try {
      setLoadingMaster(true);
      const [deptRes, courseRes, groupRes] = await Promise.all([
        axios.get(`${apiBase}/admin/department`, {
          withCredentials: true,
          params: { noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/course`, {
          withCredentials: true,
          params: { noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/group`, {
          withCredentials: true,
          params: { noCache: "true" },
        }),
      ]);
      setDepartments(deptRes.data?.departments || []);
      setCourses(courseRes.data?.courses || []);
      setGroups(groupRes.data?.groups || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load master data");
    } finally {
      setLoadingMaster(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [apiBase]);

  useEffect(() => {
    if (!selectedProgram) return;
    if (!programOptions.includes(selectedProgram)) {
      setSelectedProgram("");
      setRows([]);
    }
  }, [programOptions, selectedProgram]);

  const searchTeachingLoad = async () => {
    if (!selectedDepartment || !selectedProgram) {
      toast.error("Department and program are required");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${apiBase}/admin/teaching-load`, {
        params: {
          department: selectedDepartment,
          program: selectedProgram,
          semester: selectedSemester || undefined,
        },
        withCredentials: true,
      });
      setRows(response.data?.teachingLoad || []);
    } catch (error) {
      setRows([]);
      toast.error(error.response?.data?.message || "Failed to fetch teaching load");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!filteredRows.length || isPrinting) return;
    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 120));
    window.print();
    setTimeout(() => setIsPrinting(false), 120);
  };

  return (
    <div className="teaching-load-page">
      <div className="teaching-load-header no-print">
        <div>
          <h1 className="teaching-load-title">Faculty Teaching Load</h1>
          <p className="teaching-load-subtitle">
            Backend route: <code>/api/admin/teaching-load</code>
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
              onChange={(event) => {
                setSelectedDepartment(event.target.value);
                setSelectedProgram("");
                setSelectedSemester("");
                setSelectedGroup("");
                setRows([]);
              }}
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="teaching-load-filter-group">
            <label htmlFor="program-select">Program</label>
            <select
              id="program-select"
              value={selectedProgram}
              onChange={(event) => setSelectedProgram(event.target.value)}
            >
              <option value="">Select Program</option>
              {programOptions.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>

          <div className="teaching-load-filter-group">
            <label htmlFor="semester-select">Semester (Optional)</label>
            <select
              id="semester-select"
              value={selectedSemester}
              onChange={(event) => setSelectedSemester(event.target.value)}
            >
              <option value="">All Semesters</option>
              {semesterOptions.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </div>

          <div className="teaching-load-filter-group">
            <label htmlFor="group-select">Group (Optional)</label>
            <select
              id="group-select"
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              disabled={!selectedDepartment}
            >
              <option value="">All Groups</option>
              {groupOptions.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="teaching-load-print-btn"
            onClick={searchTeachingLoad}
            disabled={loading || loadingMaster}
          >
            <FiSearch />
            <span>{loading ? "Loading..." : "Load Report"}</span>
          </button>

          <button
            className="teaching-load-print-btn admin-btn-with-loader"
            onClick={handlePrint}
            disabled={!filteredRows.length || isPrinting}
          >
            {isPrinting ? (
              <>
                <ClipLoader size={15} />
                <span>Printing...</span>
              </>
            ) : (
              <>
                <FiPrinter />
                <span>Print</span>
              </>
            )}
          </button>
        </div>

        {loadingMaster ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="Loading" />
            <h3>Loading</h3>
            <p>Fetching departments and courses...</p>
          </div>
        ) : !selectedDepartment || !selectedProgram ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="Select filters" />
            <h3>Select Department and Program</h3>
            <p>Choose filters and click Load Report.</p>
          </div>
        ) : loading ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="Loading report" />
            <h3>Loading Teaching Load</h3>
            <p>Fetching records from server...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="teaching-load-empty">
            <img src={emptyStateImg} alt="No data" />
            <h3>No Teaching Load Data</h3>
            <p>No records found for selected filters.</p>
          </div>
        ) : (
          <>
            <div className="print-header">
              <h2>HARIDWAR UNIVERSITY, ROORKEE</h2>
              <h3>TEACHING LOAD REPORT</h3>
              <h4>
                Department of {selectedDeptName}
                {selectedSemester ? ` - Semester ${selectedSemester}` : ""}
              </h4>
            </div>

            <div className="teaching-load-table-wrapper">
              <table className="teaching-load-table">
                <thead>
                  <tr>
                    <th>SR NO.</th>
                    <th>Faculty Name</th>
                    <th>Subject Name</th>
                    <th>Subject Code</th>
                    <th>Dept Name</th>
                    <th>Sem</th>
                    <th>Program</th>
                    <th>Group</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={row._id || `${row.subjectCode}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{row.facultyName || "-"}</td>
                      <td>{row.subjectName || "-"}</td>
                      <td>{row.subjectCode || "-"}</td>
                      <td>{row.deptName || "-"}</td>
                      <td>{row.semester || "-"}</td>
                      <td>{row.branch || "-"}</td>
                      <td>{row.batch || "-"}</td>
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
