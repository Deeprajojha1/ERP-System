import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FiDownload } from "react-icons/fi";
import "./GeneralSupport.css";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import { downloadTabularFile } from "../utils/tabularDownload";
import axios from "../utils/axiosInstance";
import toast from "react-hot-toast";

const GeneralSupport = () => {
  const [reportType, setReportType] = useState("Attendance Report");
  const [department, setDepartment] = useState("All Departments");
  const [courseProgram, setCourseProgram] = useState("All Groups");
  const [semester, setSemester] = useState("All Semesters");
  const [section, setSection] = useState("All Sections");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState("Excel");
  const [recent, setRecent] = useState([]);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.PENDING);
  const [departments, setDepartments] = useState(["All Departments"]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const apiBase = useSelector((state) => state.config.apiBase);

  const reportTypes = [
    "Attendance Report",
    "Student Master Report",
    "Faculty Master Report",
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

  const toDepartmentName = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return String(value.name || value.departmentName || value.code || "").trim();
    }
    return String(value).trim();
  };

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

    const list = rows
      .map(
        (r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`,
      )
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            p { margin: 0 0 16px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${esc(reportType)}</h1>
          <p>Generated on: ${esc(new Date().toLocaleString())}</p>
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
      fallbackToPrint: true,
    });
  };

  const matchesDepartment = (deptName = "") => {
    if (!departmentFilter || departmentFilter === "all departments") return true;

    const normalized = toDepartmentName(deptName).toLowerCase();
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

  const courseProgramOptions = useMemo(() => {
    const options = new Set();
    groups
      .filter((group) => matchesDepartment(group?.department?.name || group?.department))
      .forEach((group) => {
        const label = String(group?.name || "").trim();
        if (label) options.add(label);
      });

    return ["All Groups", ...Array.from(options).sort((a, b) => a.localeCompare(b))];
  }, [groups, matchesDepartment]);

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
      setCourseProgram("All Groups");
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
    if (normalizedCourseProgramFilter === "all groups") return true;

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
      case "Attendance Report": {
        const date = fromDate || toDate || new Date().toISOString().slice(0, 10);
        const [dailyRes, studentsRes] = await Promise.all([
          axios.get(`${apiBase}/admin/attendance/daily`, {
            withCredentials: true,
            params: { date },
          }),
          axios.get(`${apiBase}/admin/student`, {
            withCredentials: true,
            params: { noCache: "true", full: "true" },
          }),
        ]);

        const summary = dailyRes.data?.summary || [];
        const students = studentsRes.data?.students || [];
        const studentById = new Map(
          students.map((student) => [String(student?._id || ""), student])
        );

        const groupIds = Array.from(
          new Set(summary.map((item) => String(item?.group?._id || item?.group || "")).filter(Boolean))
        );

        const detailResponses = await Promise.all(
          groupIds.map(async (groupId) => {
            try {
              const response = await axios.get(
                `${apiBase}/admin/attendance/group/${groupId}/date/${date}`,
                { withCredentials: true }
              );
              return { groupId, data: response.data };
            } catch {
              return { groupId, data: null };
            }
          })
        );

        const facultyByGroupCourse = new Map();
        groups.forEach((group) => {
          const gId = String(group?._id || "");
          (group?.courseFaculty || []).forEach((cf) => {
            const courseId = String(cf?.course?._id || cf?.course || "");
            if (!gId || !courseId) return;
            const facultyName =
              cf?.faculty?.user?.name ||
              cf?.faculty?.name ||
              cf?.faculty?.employeeId ||
              "-";
            facultyByGroupCourse.set(`${gId}:${courseId}`, facultyName);
          });
        });

        const rows = [];
        detailResponses.forEach((item) => {
          const groupData = item?.data;
          if (!groupData || !Array.isArray(groupData.students)) return;

          const groupName = groupData?.group?.name || "-";
          const groupId = String(groupData?.group?._id || item.groupId || "");

          groupData.students.forEach((entry) => {
            const studentId = String(entry?.studentId || "");
            const studentMaster = studentById.get(studentId) || {};
            const departmentName = toDepartmentName(studentMaster?.department) || "-";
            const studentProgram =
              studentMaster?.program ||
              studentMaster?.course ||
              "-";
            const studentSemester = studentMaster?.semester ?? "-";
            const studentSection = studentMaster?.section || groupName;
            const studentCode = entry?.enrollmentNumber || studentMaster?.rollNo || "-";
            const studentAttendancePct =
              entry?.summary?.totalSessions > 0
                ? Number(
                    ((entry.summary.presentCount / entry.summary.totalSessions) * 100).toFixed(2)
                  )
                : 0;

            if (!matchesDepartment(departmentName)) return;
            if (!matchesSemester(studentSemester)) return;
            if (!matchesSection(studentSection, groupName)) return;

            const attendanceEntries = entry?.attendanceEntries || [];
            attendanceEntries.forEach((attendance) => {
              const courseCode = attendance?.course?.code || "-";
              const courseName = attendance?.course?.courseName || "-";
              const subjectPeriod =
                courseCode !== "-" || courseName !== "-"
                  ? `${courseCode}${courseName !== "-" ? ` - ${courseName}` : ""}`
                  : "-";
              const facultyName =
                facultyByGroupCourse.get(
                  `${groupId}:${String(attendance?.course?._id || "")}`
                ) || "-";

              if (
                !matchesCourseProgram(
                  studentProgram,
                  courseCode,
                  courseName,
                  groupName
                )
              ) {
                return;
              }

              rows.push({
                "Student Name": entry?.name || "Unknown",
                Program: studentProgram,
                Department: departmentName,
                Semester: studentSemester,
                Group: groupName,
                "Student Code": studentCode,
                "Subject / Period": subjectPeriod,
                "Faculty Name": facultyName,
                Date: date,
                "Attendance Status":
                  attendance?.status === "present"
                    ? "Present"
                    : attendance?.status === "absent"
                    ? "Absent"
                    : "Not Marked",
                "Attendance Percentage": studentAttendancePct,
              });
            });
          });
        });

        return rows.map((row, index) => ({
          "SN.": index + 1,
          ...row,
        }));
      }
      case "Student Master Report": {
        const res = await axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { noCache: "true", full: "true" },
        });

        return (res.data?.students || [])
          .filter((student) => matchesDepartment(student?.department))
          .filter((student) =>
            matchesCourseProgram(student?.program, student?.course, student?.group?.name)
          )
          .filter((student) => matchesSemester(student?.semester))
          .filter((student) => matchesSection(student?.section, student?.group?.name))
          .map((student, index) => {
            const dob = student?.user?.DOB ? new Date(student.user.DOB) : null;
            const admissionDate = student?.createdAt ? new Date(student.createdAt) : null;

            return {
              "S.No": index + 1,
              "Student Roll No.": student?.rollNo || student?.enrollmentNumber || "-",
              "Student No.": student?.enrollmentNumber || student?.rollNo || "-",
              Name: student?.user?.name || student?.studentName || "-",
              "Date of Birth":
                dob && !Number.isNaN(dob.getTime()) ? dob.toISOString().slice(0, 10) : "-",
              "Father's Name": student?.fatherName || "-",
              "Father No.": student?.fatherPhoneNumber || "-",
              Address: student?.user?.address || student?.address || "-",
              "Aadhaar No.": student?.user?.aadharNumber || "-",
              Department: toDepartmentName(student?.department) || "-",
              AdmissionDate:
                admissionDate && !Number.isNaN(admissionDate.getTime())
                  ? admissionDate.toISOString().slice(0, 10)
                  : "-",
              Year: student?.academicYear || "-",
              Email: student?.collegeEmail || student?.user?.email || "-",
            };
          });
      }
      case "Faculty Master Report": {
        const res = await axios.get(`${apiBase}/admin/faculty`, {
          withCredentials: true,
          params: { noCache: "true" },
        });

        const designationLabelMap = {
          professor: "Professor",
          assistant_prof: "Assistant Professor",
          hod: "HOD",
          training: "Training",
          other: "Other",
        };

        const formatDate = (value) => {
          if (!value) return "-";
          const dateObj = new Date(value);
          if (Number.isNaN(dateObj.getTime())) return "-";
          return dateObj.toISOString().slice(0, 10);
        };

        const formatStatus = (value) => {
          const status = String(value || "").trim().toLowerCase();
          if (!status) return "-";
          return status
            .split(/\s+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
        };

        return (res.data?.faculty || [])
          .filter((faculty) => matchesDepartment(faculty?.department?.name))
          .map((faculty, index) => {
            const courseMap = new Map();
            const routine = faculty?.routine || {};
            Object.values(routine).forEach((daySlots) => {
              if (!daySlots || typeof daySlots !== "object") return;
              Object.values(daySlots).forEach((slot) => {
                const code = String(slot?.course?.code || "").trim();
                const name = String(slot?.course?.courseName || "").trim();
                if (!code) return;
                if (!courseMap.has(code)) {
                  courseMap.set(code, name || "-");
                }
              });
            });

            const subjectCodes = Array.from(courseMap.keys());
            const subjectNames = subjectCodes.map((code) => courseMap.get(code) || "-");

            const joiningDate = faculty?.joiningDate ? new Date(faculty.joiningDate) : null;
            const experienceYears =
              joiningDate && !Number.isNaN(joiningDate.getTime())
                ? Number(
                    Math.max(
                      0,
                      (Date.now() - joiningDate.getTime()) /
                        (1000 * 60 * 60 * 24 * 365.25),
                    ).toFixed(1),
                  )
                : "-";

            return {
              "S.No": index + 1,
              "Faculty ID": faculty?.employeeId || String(faculty?._id || "-"),
              Name: faculty?.user?.name || "-",
              Email: faculty?.user?.email || "-",
              Phone: faculty?.user?.phoneNumber || "-",
              Address: faculty?.user?.address || faculty?.address || "-",
              "Aadhaar No.": faculty?.user?.aadharNumber || "-",
              Department: toDepartmentName(faculty?.department) || "-",
              "Designation (Professor / Assistant Professor)":
                designationLabelMap[faculty?.designation] ||
                faculty?.designation ||
                "-",
              Qualification: faculty?.qualification || "-",
              "Experience (Years)": experienceYears,
              Salary: faculty?.salary ?? "-",
              "Subject Code": subjectCodes.length ? subjectCodes.join(", ") : "-",
              "Subjects Assigned": subjectNames.length ? subjectNames.join(", ") : "-",
              "Joining Date": formatDate(faculty?.joiningDate),
              "Status (Active / On Leave)": formatStatus(faculty?.user?.status),
            };
          });
      }
      case "Fees Summary Report": {
        const res = await axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { noCache: "true", full: "true" },
        });

        const filtered = (res.data?.students || [])
          .filter((student) => matchesDepartment(student?.department))
          .filter((student) =>
            matchesCourseProgram(student?.program, student?.course, student?.group?.name)
          )
          .filter((student) => matchesSemester(student?.semester))
          .filter((student) => matchesSection(student?.section, student?.group?.name));

        const byDepartment = filtered.reduce((acc, student) => {
          const dept = toDepartmentName(student?.department) || "Unknown";
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
          .map((course) => {
            const courseId = String(course?.id || course?._id || "");
            const linkedGroups = groups
              .filter((group) =>
                Array.isArray(group?.courseIds) &&
                group.courseIds.some(
                  (courseRef) =>
                    String(courseRef?._id || courseRef?.id || courseRef) === courseId
                )
              )
              .map((group) => String(group?.name || "").trim())
              .filter(Boolean);

            return {
              course,
              linkedGroups,
              groupLabel: linkedGroups.length ? linkedGroups.join(", ") : "-",
            };
          })
          .filter((course) =>
            matchesCourseProgram(
              course?.course?.code,
              course?.course?.courseName,
              course?.course?.branch,
              course?.course?.program,
              course?.groupLabel
            )
          )
          .filter((item) => matchesSemester(item?.course?.semester))
          .map((item, index) => {
            const course = item.course;
            const examDate = toDate || fromDate || "-";
            return {
              "S.No": index + 1,
              "Exam ID": String(course?.id || course?._id || `EXAM-${index + 1}`),
              "Course / Program": course?.branch || course?.program || "-",
              Semester: course?.semester ?? "-",
              Group: item.groupLabel,
              "Subject Code": course?.code || "-",
              "Subject Name": course?.courseName || "-",
              "Exam Date": examDate,
              "Exam Time (Start-End)": "-",
              Duration: "-",
              "Exam Type (Theory / Practical)": course?.examType || "-",
              "Room / Hall Number": "-",
              "Faculty / Invigilator Name": course?.coordinatorName || "-",
            };
          });
      }
      case "Results Summary Report": {
        const studentRes = await axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { noCache: "true", full: "true" },
        });

        const formatDate = (value) => {
          if (!value) return "-";
          const dateObj = new Date(value);
          if (Number.isNaN(dateObj.getTime())) return "-";
          return dateObj.toISOString().slice(0, 10);
        };

        const resultDate = toDate || fromDate || new Date().toISOString().slice(0, 10);

        return (studentRes.data?.students || [])
          .filter((student) => matchesDepartment(student?.department))
          .filter((student) => matchesSemester(student?.semester))
          .filter((student) =>
            matchesCourseProgram(
              student?.group?.name,
              student?.section,
              student?.program
            )
          )
          .filter((student) =>
            matchesSection(student?.section, student?.group?.name)
          )
          .map((student, index) => ({
            "S.No": index + 1,
            Name: student?.user?.name || student?.studentName || "-",
            Department: toDepartmentName(student?.department) || "-",
            Semester: student?.semester ?? "-",
            Group: student?.group?.name || "-",
            ResultDate: formatDate(student?.resultDate) !== "-" ? formatDate(student?.resultDate) : resultDate,
            CGPA:
              student?.cgpa ??
              student?.result?.cgpa ??
              student?.examResult?.cgpa ??
              "-",
            Result:
              student?.resultStatus ||
              student?.result ||
              student?.examResult?.status ||
              "-",
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
          reportType === "Attendance Report" && !hasDateFilter
            ? "No data for today. Please choose From/To date and try again."
            : "No data found for selected filters";
        toast.error(message);
        return;
      }

      if (format === "PDF") {
        await downloadPDF(data, `${base}.pdf`);
      } else if (format === "CSV") {
        await downloadTabularFile(apiBase, {
          rows: data,
          format: "csv",
          fileName: `${base}.csv`,
        });
      } else {
        await downloadTabularFile(apiBase, {
          rows: data,
          format: "xlsx",
          fileName: `${base}.xlsx`,
          sheetName: "Report",
        });
      }
    } catch (error) {
      toast.error(error.message || "Failed to generate report");
      return;
    }

    setRecent((prev) => [
      { name: `${base}.${format === "PDF" ? "pdf" : format === "CSV" ? "csv" : "xlsx"}` },
      ...prev,
    ]);
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="gs-state pending app-loader-state">
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
          <p>Loading reports module...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="gs-state error">
          <img src={emptyStateImg} alt="Failed" className="gs-state-img" />
          <h3>Failed to load reports module</h3>
          <p>Please try again in a moment.</p>
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
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label>
              Department
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setCourseProgram("All Groups");
                  setSemester("All Semesters");
                  setSection("All Sections");
                }}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
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
              Group
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
                  type="text"
                  placeholder="dd-mm-yyyy"
                  value={fromDate}
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </label>
              <label>
                To Date
                <input
                  type="text"
                  placeholder="dd-mm-yyyy"
                  value={toDate}
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </label>
            </div>

            <button className="gs-generate" type="button" onClick={handleGenerate}>
              <FiDownload />
              <span>Generate & Download Report</span>
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

  return (
    <div className="gs-page">
      {renderState()}
    </div>
  );
};

export default GeneralSupport;
