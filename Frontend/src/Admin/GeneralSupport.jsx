import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import "./GeneralSupport.css";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import axios from "../utils/axiosInstance";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import { downloadTabularFile } from "../utils/tabularDownload";
import toast from "react-hot-toast";

const GeneralSupport = () => {
  const [reportType, setReportType] = useState("Daily Attendance Report");
  const [department, setDepartment] = useState("All Departments");
  const [courseProgram, setCourseProgram] = useState("All Courses");
  const [semester, setSemester] = useState("All Semesters");
  const [section, setSection] = useState("All Sections");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState("Excel");
  const [recent, setRecent] = useState([]);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.PENDING);
  const [departments, setDepartments] = useState(["All Departments"]);
  const [departmentRecords, setDepartmentRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const apiBase = useSelector((state) => state.config.apiBase);

  const reportTypes = [
    "Daily Attendance Report",
    "Student Master Report",
    "Faculty Master Report",
    // "Fees Summary Report",
    "Exam Schedule Report",
    "Results Summary Report",
  ];

  useEffect(() => {
    if (!apiBase) return;

    const fetchDepartments = async () => {
      try {
        setLoadState(ADMIN_LOAD_STATES.PENDING);
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

        const fetchedDepartments = deptRes.data?.departments || [];
        const fetchedNames = fetchedDepartments
          .map((dept) => String(dept?.name || "").trim())
          .filter(Boolean);

        setDepartmentRecords(fetchedDepartments);
        setDepartments(["All Departments", ...fetchedNames]);
        setCourses(courseRes.data?.courses || []);
        setGroups(groupRes.data?.groups || []);
        setLoadState(ADMIN_LOAD_STATES.SUCCESS);
      } catch (error) {
        setLoadState(ADMIN_LOAD_STATES.FAILURE);
        toast.error(error.response?.data?.message || "Failed to load report filters");
      }
    };

    fetchDepartments();
  }, [apiBase]);

  const departmentFilter = useMemo(
    () => String(department || "").trim().toLowerCase(),
    [department]
  );

  const toDepartmentTokens = (value = "") =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const toDepartmentAcronym = (value = "") =>
    toDepartmentTokens(value)
      .map((token) => token[0])
      .join("");

  const downloadPDF = async (rows, filename) => {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    if (!headers.length) {
      throw new Error("No data available for export");
    }

    const esc = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const headerHtml = headers.map((h) => `<th>${esc(h)}</th>`).join("");

    const bodyHtml = rows
      .map(
        (r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`,
      )
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h2>${reportType}</h2>
          <p>Department: ${department}</p>
          <p>Date Range: ${fromDate || "N/A"} to ${toDate || "N/A"}</p>
          <table>
            <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
            <tbody>${list}</tbody>
          </table>
        </body>
      </html>
    `;

    await downloadPdfFromHtml(apiBase, {
      html,
      fileName: filename,
      fallbackToPrint: false,
    });
  };

  const matchesDepartment = (deptName = "") => {
    if (!departmentFilter || departmentFilter === "all departments") return true;

    const normalized = String(deptName || "").trim().toLowerCase();
    if (!normalized) return false;

    if (normalized === departmentFilter) return true;
    if (normalized.includes(departmentFilter) || departmentFilter.includes(normalized)) return true;

    const selectedAcronym = toDepartmentAcronym(departmentFilter);
    const rowAcronym = toDepartmentAcronym(normalized);
    if (selectedAcronym && rowAcronym && selectedAcronym === rowAcronym) return true;

    return false;
  };

  const normalizedCourseProgramFilter = useMemo(
    () => String(courseProgram || "").trim().toLowerCase(),
    [courseProgram]
  );
  const normalizedSectionFilter = useMemo(
    () => String(section || "").trim().toLowerCase(),
    [section]
  );

  const selectedDepartmentRecord = useMemo(() => {
    if (department === "All Departments") return null;
    return departmentRecords.find((dept) => String(dept?.name || "") === String(department)) || null;
  }, [departmentRecords, department]);

  const courseProgramOptions = useMemo(() => {
    const options = new Map();
    const departmentPrograms =
      selectedDepartmentRecord?.programs || selectedDepartmentRecord?.program || [];

    if (Array.isArray(departmentPrograms)) {
      departmentPrograms.forEach((program) => {
        const label = String(program || "").trim();
        if (!label) return;
        options.set(`prog-${label.toLowerCase()}`, label.toUpperCase());
      });
    }

    courses
      .filter((course) => matchesDepartment(course?.department))
      .forEach((course) => {
        const code = String(course?.code || "").trim();
        const name = String(course?.courseName || "").trim();
        if (code || name) {
          const label = code && name ? `${code} - ${name}` : code || name;
          options.set(`course-${String(label).toLowerCase()}`, label);
        }
      });

    return ["All Courses", ...Array.from(options.values())];
  }, [courses, matchesDepartment, selectedDepartmentRecord]);

  const semesterOptions = useMemo(() => {
    const semesters = new Set();
    courses
      .filter((course) => matchesDepartment(course?.department))
      .forEach((course) => {
        const semValue = Number(course?.semester);
        if (!Number.isNaN(semValue) && semValue > 0) {
          semesters.add(semValue);
        }
      });

    if (!semesters.size) {
      Array.from({ length: 12 }, (_, index) => index + 1).forEach((value) => semesters.add(value));
    }

    return ["All Semesters", ...Array.from(semesters).sort((a, b) => a - b)];
  }, [courses, matchesDepartment]);

  const sectionOptions = useMemo(() => {
    const options = new Set(["All Sections"]);
    groups
      .filter((group) => matchesDepartment(group?.department?.name || group?.department))
      .forEach((group) => {
        const name = String(group?.name || "").trim();
        if (name) options.add(name);
      });
    return Array.from(options);
  }, [groups, matchesDepartment]);

  useEffect(() => {
    if (!courseProgramOptions.includes(courseProgram)) {
      setCourseProgram("All Courses");
    }
  }, [courseProgramOptions, courseProgram]);

  useEffect(() => {
    const selectedSemesterExists = semesterOptions.some(
      (option) => String(option) === String(semester)
    );
    if (!selectedSemesterExists) {
      setSemester("All Semesters");
    }
  }, [semesterOptions, semester]);

  useEffect(() => {
    if (!sectionOptions.includes(section)) {
      setSection("All Sections");
    }
  }, [sectionOptions, section]);

  const matchesCourseProgram = (...candidates) => {
    if (normalizedCourseProgramFilter === "all courses") return true;

    return candidates.some((candidate) => {
      const value = String(candidate || "").trim().toLowerCase();
      if (!value) return false;
      return (
        value === normalizedCourseProgramFilter ||
        value.includes(normalizedCourseProgramFilter) ||
        normalizedCourseProgramFilter.includes(value)
      );
    });
  };

  const matchesSemester = (value) => {
    if (String(semester) === "All Semesters") return true;
    if (value === null || value === undefined || value === "") return false;
    return String(value) === String(semester);
  };

  const matchesSection = (...candidates) => {
    if (normalizedSectionFilter === "all sections") return true;

    return candidates.some((candidate) => {
      const value = String(candidate || "").trim().toLowerCase();
      if (!value) return false;
      return (
        value === normalizedSectionFilter ||
        value.includes(normalizedSectionFilter) ||
        normalizedSectionFilter.includes(value)
      );
    });
  };

  const fetchReportRows = async () => {
    switch (reportType) {
      case "Daily Attendance Report": {
        const date = fromDate || toDate || new Date().toISOString().slice(0, 10);
        const res = await axios.get(`${apiBase}/admin/attendance/daily`, {
          withCredentials: true,
          params: { date },
        });

        return (res.data?.summary || [])
          .filter((item) =>
            matchesCourseProgram(
              item?.course?.code,
              item?.course?.courseName,
              item?.course?.name,
              item?.group?.name
            )
          )
          .filter((item) => matchesSection(item?.group?.name, item?.section))
          .map((item) => ({
            Date: item?.date ? new Date(item.date).toISOString().slice(0, 10) : date,
            Group: item?.group?.name || "-",
            Course: item?.course?.code || "-",
            Present: item?.present ?? 0,
            Absent: item?.absent ?? 0,
            "Total Students": item?.totalStudents ?? 0,
            "Attendance %": item?.percentage ?? 0,
          }));
      }
      case "Student Master Report": {
        const res = await axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { noCache: "true" },
        });

        return (res.data?.students || [])
          .filter((student) => matchesDepartment(student?.department))
          .filter((student) =>
            matchesCourseProgram(student?.program, student?.course, student?.group?.name)
          )
          .filter((student) => matchesSemester(student?.semester))
          .filter((student) => matchesSection(student?.section, student?.group?.name))
          .map((student) => ({
            Name: student?.studentName || "-",
            "Roll No": student?.rollNo || "-",
            Department: student?.department || "-",
            Semester: student?.semester ?? "-",
            Status: student?.status || "-",
          }));
      }
      case "Faculty Master Report": {
        const res = await axios.get(`${apiBase}/admin/faculty`, {
          withCredentials: true,
          params: { noCache: "true" },
        });

        return (res.data?.faculty || [])
          .filter((faculty) => matchesDepartment(faculty?.department?.name))
          .map((faculty) => ({
            Name: faculty?.user?.name || "-",
            "Employee ID": faculty?.employeeId || "-",
            Department: faculty?.department?.name || "-",
            Designation: faculty?.designation || "-",
            Qualification: faculty?.qualification || "-",
            Status: faculty?.user?.status || "-",
          }));
      }
      case "Fees Summary Report": {
        const res = await axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { noCache: "true" },
        });

        const filtered = (res.data?.students || [])
          .filter((student) => matchesDepartment(student?.department))
          .filter((student) =>
            matchesCourseProgram(student?.program, student?.course, student?.group?.name)
          )
          .filter((student) => matchesSemester(student?.semester))
          .filter((student) => matchesSection(student?.section, student?.group?.name));

        const byDepartment = filtered.reduce((acc, student) => {
          const dept = student?.department || "Unknown";
          if (!acc[dept]) {
            acc[dept] = { count: 0, semesterTotal: 0 };
          }
          acc[dept].count += 1;
          acc[dept].semesterTotal += Number(student?.semester || 0);
          return acc;
        }, {});

        return Object.entries(byDepartment).map(([dept, stats]) => ({
          Department: dept,
          "Total Students": stats.count,
          "Avg Semester": stats.count
            ? Number((stats.semesterTotal / stats.count).toFixed(2))
            : 0,
        }));
      }
      case "Exam Schedule Report": {
        const res = await axios.get(`${apiBase}/admin/course`, {
          withCredentials: true,
          params: { noCache: "true" },
        });

        return (res.data?.courses || [])
          .filter((course) => matchesDepartment(course?.department))
          .filter((course) =>
            matchesCourseProgram(
              course?.code,
              course?.courseName,
              course?.branch,
              course?.program
            )
          )
          .filter((course) => matchesSemester(course?.semester))
          .map((course) => ({
            "Course Code": course?.code || "-",
            "Course Name": course?.courseName || "-",
            Department: course?.department || "-",
            Semester: course?.semester ?? "-",
            Coordinator: course?.coordinatorName || "-",
            "Exam Date": toDate || fromDate || "-",
          }));
      }
      case "Results Summary Report": {
        const [courseRes, studentRes] = await Promise.all([
          axios.get(`${apiBase}/admin/course`, {
            withCredentials: true,
            params: { noCache: "true" },
          }),
          axios.get(`${apiBase}/admin/student`, {
            withCredentials: true,
            params: { noCache: "true" },
          }),
        ]);

        const students = studentRes.data?.students || [];

        return (courseRes.data?.courses || [])
          .filter((course) => matchesDepartment(course?.department))
          .filter((course) =>
            matchesCourseProgram(
              course?.code,
              course?.courseName,
              course?.branch,
              course?.program
            )
          )
          .filter((course) => matchesSemester(course?.semester))
          .map((course) => ({
            "Course Code": course?.code || "-",
            "Course Name": course?.courseName || "-",
            Department: course?.department || "-",
            Semester: course?.semester ?? "-",
            "Students In Department": students.filter(
              (s) => String(s?.department || "") === String(course?.department || "")
            ).length,
          }));
      }
      default:
        return [];
    }
  };

  const handleGenerate = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${reportType.replace(/\s+/g, "_")}_${stamp}`;

    try {
      const data = await fetchReportRows();
      const hasDateFilter = Boolean(fromDate || toDate);

      if (!data.length) {
        const message =
          reportType === "Daily Attendance Report" && !hasDateFilter
            ? "No data for today. Please choose From/To date and try again."
            : "No data found for selected filters";
        toast.error(message);
        return;
      }

      if (format === "PDF") {
        await downloadPDF(dummyData, `${base}.pdf`);
      } else if (format === "CSV") {
        await downloadTabularFile(apiBase, {
          rows: dummyData,
          format: "csv",
          fileName: `${base}.csv`,
        });
      } else {
        await downloadTabularFile(apiBase, {
          rows: dummyData,
          format: "xlsx",
          fileName: `${base}.xlsx`,
          sheetName: "Report",
        });
      }

      setRecent((prev) => [
        {
          name: `${base}.${format === "PDF" ? "pdf" : format === "CSV" ? "csv" : "xlsx"}`,
        },
        ...prev,
      ]);
    } catch (error) {
      toast.error(error.message || "Failed to generate report");
    }
  };

  // =====================================
  // UI SECTION (UNCHANGED)
  // =====================================
  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="gs-state pending app-loader-state">
          <Oval height={64} width={64} color="#2563eb" visible />
          <p>Loading reports module...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="gs-state error">
          <img src={emptyStateImg} alt="Failed" className="gs-state-img" />
          <h3>Failed to load reports module</h3>
        </div>
      );
    }

    return (
      <>
        <h1 className="gs-title">Export Data</h1>

        <div className="gs-card">
          <div className="gs-card-head">
            <h2>Export Attendance Data</h2>
            <p>Generate reports in various formats</p>
          </div>

          <div className="gs-form">
            <label>
              Report Type
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {reportTypes.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>

            <label>
              Department
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setCourseProgram("All Courses");
                  setSemester("All Semesters");
                  setSection("All Sections");
                }}
              >
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>

            <label>
              Export Format
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                {["Excel", "CSV", "PDF"].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Course / Program
              <select
                value={courseProgram}
                onChange={(e) => setCourseProgram(e.target.value)}
              >
                {courseProgramOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Semester
              <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                {semesterOptions.map((option) => (
                  <option key={option} value={option}>
                    {typeof option === "number" ? `Semester ${option}` : option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Section
              <select value={section} onChange={(e) => setSection(e.target.value)}>
                {sectionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="gs-row">
              <label>
                From Date
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </label>

              <label>
                To Date
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </label>
            </div>

            <button className="gs-generate" type="button" onClick={handleGenerate}>
              Generate & Download Report
            </button>
          </div>
        </div>

        <div className="gs-card">
          <div className="gs-card-head">
            <h2>Recent Exports</h2>
            <p>Download previously generated reports</p>
          </div>
          <div className="gs-recent">
            {recent.length === 0 ? (
              <div className="gs-empty">No recent exports yet.</div>
            ) : (
              recent.map((r, i) => (
                <div key={`${r.name}-${i}`} className="gs-recent-item">
                  {r.name}
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  };

  return <div className="gs-page">{renderState()}</div>;
};

export default GeneralSupport;
