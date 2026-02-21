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
  const [course, setCourse] = useState("All Courses");
  const [semester, setSemester] = useState("All Semesters");
  const [section, setSection] = useState("All Sections");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState("Excel");
  const [recent, setRecent] = useState([]);
  const [groupCards, setGroupCards] = useState([]);
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);
  const apiBase = useSelector((state) => state.config.apiBase);

  const reportTypes = [
    "Daily Attendance Report",
    "Student Master Report",
    "Faculty Master Report",
    // "Fees Summary Report",
    "Exam Schedule Report",
    "Results Summary Report",
  ];

  const departments = [
    "All Departments",
    "CSE",
    "ECE",
    "MECH",
    "CIVIL",
    "HUMANITIES",
    "AGRICULTURE",
  ];

  const courseOptions = [
    "All Courses",
    "B.Tech",
    "BCA",
    "BBA",
    "M.Tech",
    "MBA",
  ];

  const semesterOptions = useMemo(
    () => ["All Semesters", "1", "2", "3", "4", "5", "6", "7", "8"],
    []
  );

  useEffect(() => {
    if (!apiBase) return;

    let active = true;

    const fetchGroups = async () => {
      try {
        const params = {};
        if (semester !== "All Semesters") params.semester = semester;

        const res = await axios.get(`${apiBase}/admin/timetable/group`, {
          withCredentials: true,
          params,
        });

        const normalized = (res.data?.groups || [])
          .map((g) => ({
            id: g?.id || g?._id || g?.groupCode || g?.name || "",
            name: g?.groupCode || g?.name || g?.groupName || "",
            semester: String(g?.semester ?? "").trim(),
          }))
          .filter((g) => g.name);

        if (active) {
          setGroupCards(normalized);
        }
      } catch (error) {
        if (active) {
          setGroupCards([]);
        }
      }
    };

    fetchGroups();

    return () => {
      active = false;
    };
  }, [apiBase, semester]);

  const sectionOptions = useMemo(() => {
    const filteredGroups =
      semester === "All Semesters"
        ? groupCards
        : groupCards.filter((g) => String(g.semester) === String(semester));

    const names = Array.from(new Set(filteredGroups.map((g) => g.name)));
    return ["All Sections", ...names];
  }, [groupCards, semester]);

  useEffect(() => {
    if (!semesterOptions.includes(semester)) {
      setSemester("All Semesters");
    }
  }, [semesterOptions, semester]);

  useEffect(() => {
    if (!sectionOptions.includes(section)) {
      setSection("All Sections");
    }
  }, [sectionOptions, section]);

  // =====================================
  // 🔥 Dynamic Dummy Data Generator
  // =====================================
  const generateDummyData = () => {
    const count = 60;

    const names = [
      "Priya", "Aditya", "Karan", "Riya", "Aman",
      "Sneha", "Rahul", "Anjali", "Vikas", "Neha",
    ];

    const attendanceStatuses = ["Present", "Absent", "Late"];
    const feeStatus = ["Paid", "Pending"];
    const courses = courseOptions.filter((c) => c !== "All Courses");
    const subjectCatalog = [
      { code: "CS201", name: "Data Structures" },
      { code: "CS202", name: "DBMS" },
      { code: "CS203", name: "Operating Systems" },
      { code: "CS204", name: "Computer Networks" },
      { code: "MA101", name: "Mathematics" },
      { code: "CS205", name: "Software Engineering" },
    ];
    const qualifications = ["B.Tech", "M.Tech", "Ph.D", "MCA", "M.Sc"];
    const employmentTypes = ["Permanent", "Contract"];
    const facultyStatuses = ["Active", "On Leave"];
    const facultyNames = [
      "Dr. Sharma",
      "Prof. Verma",
      "Dr. Gupta",
      "Prof. Singh",
      "Dr. Mehta",
    ];
    const examTimeSlots = [
      "09:00 AM - 12:00 PM",
      "10:00 AM - 01:00 PM",
      "01:00 PM - 04:00 PM",
      "02:00 PM - 05:00 PM",
    ];
    const examDurations = ["2 Hours", "2.5 Hours", "3 Hours"];
    const examModes = ["Theory", "Practical"];
    const hallNumbers = ["A-101", "A-204", "B-110", "C-305", "Lab-2", "Lab-4"];

    const rows = [];

    const start = fromDate ? new Date(fromDate) : new Date("2024-01-01");
    const end = toDate ? new Date(toDate) : new Date();

    const getRandomDate = () => {
      const randomTime =
        start.getTime() +
        Math.random() * (end.getTime() - start.getTime());
      return new Date(randomTime).toISOString().slice(0, 10);
    };

    const allSemesterValues = semesterOptions.filter((s) => s !== "All Semesters");
    const groupPoolBySemester =
      semester === "All Semesters"
        ? groupCards
        : groupCards.filter((g) => String(g.semester) === String(semester));

    for (let i = 1; i <= count; i++) {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomAttendanceStatus =
        attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];

      const dept =
        department === "All Departments"
          ? departments[Math.floor(Math.random() * (departments.length - 1)) + 1]
          : department;
      const availableCourses = courses;
      const selectedCourse =
        course === "All Courses"
          ? (availableCourses[Math.floor(Math.random() * availableCourses.length)] || "N/A")
          : course;

      let selectedSemester = semester;
      let selectedSection = section;

      if (section === "All Sections" && semester === "All Semesters") {
        const groupPick =
          groupPoolBySemester[Math.floor(Math.random() * groupPoolBySemester.length)];
        if (groupPick) {
          selectedSemester = groupPick.semester || "N/A";
          selectedSection = groupPick.name || "N/A";
        } else {
          selectedSemester =
            allSemesterValues[Math.floor(Math.random() * allSemesterValues.length)] || "N/A";
          selectedSection = "N/A";
        }
      } else if (section === "All Sections" && semester !== "All Semesters") {
        const sectionPool = groupPoolBySemester.map((g) => g.name).filter(Boolean);
        selectedSemester = semester;
        selectedSection =
          sectionPool[Math.floor(Math.random() * sectionPool.length)] || "N/A";
      } else if (section !== "All Sections" && semester === "All Semesters") {
        const matchedGroup = groupCards.find((g) => g.name === section);
        selectedSemester = matchedGroup?.semester || "N/A";
        selectedSection = section;
      } else {
        selectedSemester = semester;
        selectedSection = section;
      }

      const randomDate = getRandomDate();
      const randomSubject =
        subjectCatalog[Math.floor(Math.random() * subjectCatalog.length)];

      if (reportType === "Daily Attendance Report") {
        rows.push({
          "S.No": i,
          "Student Name": randomName,
          "Course / Program": selectedCourse,
          Department: dept,
          Semester: selectedSemester,
          Section: selectedSection,
          "Subject Code": randomSubject.code,
          "Subject / Period": randomSubject.name,
          "Faculty Name": facultyNames[Math.floor(Math.random() * facultyNames.length)],
          Date: randomDate,
          "Attendance Status (Present / Absent / Late)": randomAttendanceStatus,
          "Attendance Percentage (till date)": `${(65 + Math.random() * 35).toFixed(1)}%`,
        });
      }

      if (reportType === "Student Master Report") {
        rows.push({
          "S.No": i,
          "Student Roll No.": `ROLL${1000 + i}`,
          "Student No.": `98${String(20000000 + i).slice(-8)}`,
          Name: randomName,
          "Date of Birth": getRandomDate(),
          "Father's Name": `${names[Math.floor(Math.random() * names.length)]} Kumar`,
          "Father No.": `97${String(10000000 + i).slice(-8)}`,
          Address: `House ${i}, ${dept} Block, Haridwar`,
          "Aadhaar No.": `${1000 + i} ${2000 + i} ${3000 + i}`,
          Department: dept,
          AdmissionDate: randomDate,
          Year: Math.ceil(Math.random() * 4),
          Email: `student${i}@erp.edu`,
        });
      }

      if (reportType === "Faculty Master Report") {
        const assignedSubjects = [
          subjectCatalog[Math.floor(Math.random() * subjectCatalog.length)],
          subjectCatalog[Math.floor(Math.random() * subjectCatalog.length)],
        ];

        rows.push({
          "S.No": i,
          "Faculty ID": `FAC${500 + i}`,
          Name: `${randomName} Kumar`,
          Email: `faculty${i}@erp.edu`,
          Phone: `98${String(10000000 + i).slice(-8)}`,
          Address: `Quarter ${i}, Faculty Colony, Haridwar`,
          "Aadhaar No.": `${4000 + i} ${5000 + i} ${6000 + i}`,
          Department: dept,
          "Designation (Professor / Assistant Professor)":
            Math.random() > 0.5 ? "Professor" : "Assistant Professor",
          Qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
          "Experience (Years)": Math.floor(Math.random() * 21),
          Salary: 35000 + Math.floor(Math.random() * 90000),
          "Subject Code": assignedSubjects.map((s) => s.code).join(", "),
          "Subjects Assigned": assignedSubjects.map((s) => s.name).join(", "),
          "Joining Date": randomDate,
          "Employment Type (Permanent / Contract)":
            employmentTypes[Math.floor(Math.random() * employmentTypes.length)],
          "Status (Active / On Leave)":
            facultyStatuses[Math.floor(Math.random() * facultyStatuses.length)],
        });
      }

      if (reportType === "Fees Summary Report") {
        rows.push({
          "S.No": i,
          Name: randomName,
          Department: dept,
          PaymentDate: randomDate,
          Amount: 50000 + Math.floor(Math.random() * 20000),
          Status: feeStatus[Math.floor(Math.random() * feeStatus.length)],
        });
      }

      if (reportType === "Exam Schedule Report") {
        rows.push({
          "S.No": i,
          "Exam ID": `EXM${2000 + i}`,
          "Course / Program": selectedCourse,
          Semester: selectedSemester,
          Group: selectedSection,
          "Subject Code": randomSubject.code,
          "Subject Name": randomSubject.name,
          "Exam Date": randomDate,
          "Exam Time (Start-End)": examTimeSlots[Math.floor(Math.random() * examTimeSlots.length)],
          Duration: examDurations[Math.floor(Math.random() * examDurations.length)],
          "Exam Type (Theory / Practical)": examModes[Math.floor(Math.random() * examModes.length)],
          "Room / Hall Number": hallNumbers[Math.floor(Math.random() * hallNumbers.length)],
          "Faculty / Invigilator Name":
            facultyNames[Math.floor(Math.random() * facultyNames.length)],
        });
      }

      if (reportType === "Results Summary Report") {
        rows.push({
          "S.No": i,
          Name: randomName,
          Department: dept,
          Semester: selectedSemester,
          Group: selectedSection,
          ResultDate: randomDate,
          CGPA: (6 + Math.random() * 4).toFixed(2),
          Result: Math.random() > 0.2 ? "Pass" : "Fail",
        });
      }
    }

    return rows;
  };

  // =====================================
  // 📄 Dynamic PDF Generator
  // =====================================
  const downloadPDF = async (rows, filename) => {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);

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
        (row) =>
          `<tr>${headers
            .map((h) => `<td>${esc(row[h])}</td>`)
            .join("")}</tr>`
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
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    await downloadPdfFromHtml(apiBase, {
      html,
      fileName: filename,
    });
  };

  // =====================================
  // 🚀 Generate Button Handler
  // =====================================
  const handleGenerate = async () => {
    if (!apiBase) {
      toast.error("Server configuration missing. Please refresh and try again.");
      return;
    }

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    if (fromDate && Number.isNaN(from?.getTime())) {
      toast.error("Invalid From Date");
      return;
    }

    if (toDate && Number.isNaN(to?.getTime())) {
      toast.error("Invalid To Date");
      return;
    }

    if (from && to && from > to) {
      toast.error("From Date cannot be greater than To Date");
      return;
    }

    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const base = `${reportType.replace(/\s+/g, "_")}_${stamp}`;
      const dummyData = generateDummyData();

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
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>

            <label>
              Export Format
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                {["Excel", "CSV", "PDF"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>

            <label>
              Course / Program
              <select value={course} onChange={(e) => setCourse(e.target.value)}>
                {courseOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>

            <label>
              Semester
              <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                {semesterOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>

            <label>
              Section
              <select value={section} onChange={(e) => setSection(e.target.value)}>
                {sectionOptions.map((s) => (
                  <option key={s}>{s}</option>
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
