import React, { useEffect, useState, useMemo } from "react";
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Oval } from "react-loader-spinner";
import { FiPrinter } from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import ModernDatePicker from "../components/common/ModernDatePicker";
import "./FacultyLectureReport.css";

const FacultyLectureReport = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [reportData, setReportData] = useState(null);

  const batchOptions = ["2023-27", "2024-28", "2022-26", "2021-25", "2020-24"];
  const lectureSlots = [
    { id: 1, time: "09:00-10:00" },
    { id: 2, time: "10:00-11:00" },
    { id: 3, time: "11:00-12:00" },
    { id: 4, time: "12:00-01:00" },
    { id: 5, time: "01:00-02:00" },
    { id: 6, time: "02:00-03:00" },
    { id: 7, time: "03:00-04:00" },
    { id: 8, time: "04:00-05:00" },
  ];

  useEffect(() => {
    fetchDepartments();
    // Set today's date as default
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

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

  const fetchLectureReport = async () => {
    if (!selectedDepartment || !selectedDate) {
      toast.error("Please select Department and Date");
      return;
    }

    try {
      setLoading(true);

      // Fetch faculty + groups + courses so routine IDs can be resolved to names.
      const [facultyRes, groupRes, courseRes] = await Promise.all([
        axios.get(`${apiBase}/admin/faculty`, {
          withCredentials: true,
        }),
        axios.get(`${apiBase}/admin/group`, {
          withCredentials: true,
        }),
        axios.get(`${apiBase}/admin/course`, {
          withCredentials: true,
        }),
      ]);

      const allFaculty = facultyRes.data?.faculty || [];
      const allGroups = groupRes.data?.groups || [];
      const allCourses = courseRes.data?.courses || [];

      const groupById = new Map(
        allGroups.map((g) => [String(g?._id || g?.id), g])
      );
      const courseById = new Map(
        allCourses.map((c) => [String(c?._id || c?.id), c])
      );

      const deptFaculty = allFaculty.filter(
        (f) => f.department?._id === selectedDepartment || f.department === selectedDepartment
      );

      // Get day of week from selected date
      const date = new Date(selectedDate);
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayOfWeek = dayNames[date.getDay()];

      // Build report data
      const facultyReportData = deptFaculty.map((faculty) => {
        const lectures = {};
        
        // Check routine for the selected day
        if (faculty.routine && faculty.routine[dayOfWeek]) {
          const daySchedule = faculty.routine[dayOfWeek];
          
          Object.keys(daySchedule).forEach((slotNum) => {
            const lecture = daySchedule[slotNum];
            if (lecture && lecture.course) {
              const courseId = String(lecture.course?._id || lecture.course);
              const groupId = String(lecture.group?._id || lecture.group);
              const resolvedCourse = courseById.get(courseId);
              const resolvedGroup = groupById.get(groupId);

              lectures[slotNum] = {
                course: resolvedCourse || lecture.course,
                group: resolvedGroup || lecture.group,
                status: "taken", // Default to taken for now (can be enhanced with actual attendance data)
              };
            }
          });
        }

        return {
          _id: faculty._id,
          name: faculty.user?.name || "Unknown",
          employeeId: faculty.employeeId || "N/A",
          designation: faculty.designation || "Faculty",
          lectures,
        };
      });

      // Calculate statistics
      const totalLectures = facultyReportData.reduce((sum, f) => sum + Object.keys(f.lectures).length, 0);
      const takenLectures = totalLectures; // For now, all scheduled are considered taken
      const notTakenLectures = 0;

      setReportData({
        faculty: facultyReportData,
        statistics: {
          total: totalLectures,
          taken: takenLectures,
          notTaken: notTakenLectures,
        },
      });
    } catch (error) {
      console.error("Fetch lecture report failed:", error);
      toast.error("Failed to load lecture report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!reportData?.faculty?.length) {
      toast.error("No report data to print");
      return;
    }

    const esc = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const tableRows = reportData.faculty
      .map((faculty, index) => {
        const totalLectures = Object.keys(faculty.lectures || {}).length;
        const takenLectures = Object.values(faculty.lectures || {}).filter(
          (l) => l.status === "taken"
        ).length;
        const notTakenLectures = totalLectures - takenLectures;

        const lectureCells = lectureSlots
          .map((slot) => {
            const lecture = faculty.lectures?.[slot.id];
            if (!lecture) return "<td>-</td>";
            const courseLabel =
              lecture.course?.code || lecture.course?.courseName || "Course";
            const groupLabel = lecture.group?.name || "N/A";
            return `<td>${esc(courseLabel)}<br/>Group: ${esc(groupLabel)}</td>`;
          })
          .join("");

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${esc(faculty.name)}<br/>ID: ${esc(faculty.employeeId || "N/A")}</td>
            ${lectureCells}
            <td>${totalLectures}</td>
            <td>${takenLectures}</td>
            <td>${notTakenLectures}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h1, h2, h3, p { margin: 0 0 8px; }
            .meta { margin-bottom: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #d1d5db; padding: 6px; vertical-align: top; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h2>HARIDWAR UNIVERSITY</h2>
          <h3>Department Teacher Lectures Report</h3>
          <div class="meta">
            <p><strong>Department:</strong> ${esc(selectedDeptName || "N/A")}</p>
            <p><strong>Batch:</strong> ${esc(selectedBatch || "N/A")}</p>
            <p><strong>Date:</strong> ${esc(formatDate(selectedDate) || "N/A")}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>SR NO.</th>
                <th>FACULTY NAME</th>
                ${lectureSlots.map((slot) => `<th>LECTURE ${slot.id}</th>`).join("")}
                <th>TOTAL</th>
                <th>TAKEN</th>
                <th>NOT TAKEN</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      // Open print dialog using hidden iframe
      const printFrame = document.createElement("iframe");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      printFrame.setAttribute("aria-hidden", "true");
      document.body.appendChild(printFrame);

      const frameWindow = printFrame.contentWindow;
      if (!frameWindow) {
        if (document.body.contains(printFrame)) document.body.removeChild(printFrame);
        return;
      }

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      };

      frameWindow.onafterprint = cleanup;
      frameWindow.document.open();
      frameWindow.document.write(html);
      frameWindow.document.close();

      setTimeout(cleanup, 1500);

      setTimeout(() => {
        try {
          frameWindow.document.title = `Faculty_Lecture_Report_${selectedDeptName || "Department"}_${selectedDate || "Date"}`;
          frameWindow.focus();
          frameWindow.print();
        } catch {
          cleanup();
        }
      }, 120);
    } catch (error) {
      toast.error(error?.message || "Failed to print report");
    }
  };

  const selectedDeptName = useMemo(() => {
    const dept = departments.find((d) => d._id === selectedDepartment);
    return dept?.name || "";
  }, [departments, selectedDepartment]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="faculty-lecture-report-page">
      <div className="faculty-lecture-report-header no-print">
        <div>
          <h1 className="faculty-lecture-report-title">Department Teacher Lectures Report</h1>
          <p className="faculty-lecture-report-subtitle">
            View daily faculty lecture schedule and attendance
          </p>
        </div>
      </div>

      <div className="faculty-lecture-report-panel">
        <div className="faculty-lecture-report-filters no-print">
          <div className="filter-row">
            <div className="faculty-lecture-report-filter-group">
              <label htmlFor="department-select">Select Department</label>
              <select
                id="department-select"
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setReportData(null);
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

            <div className="faculty-lecture-report-filter-group">
              <label htmlFor="batch-select">Batch</label>
              <select
                id="batch-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">Select Batch</option>
                {batchOptions.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>

            <div className="faculty-lecture-report-filter-group">
              <label htmlFor="date-select">Select Date</label>
              <ModernDatePicker
                id="date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="Select date"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <button
              className="faculty-lecture-report-show-btn"
              onClick={fetchLectureReport}
              disabled={!selectedDepartment || !selectedDate}
            >
              Show Report
            </button>

            <button
              className="faculty-lecture-report-print-btn"
              onClick={handlePrint}
              disabled={!reportData}
            >
              <FiPrinter />
              Print
            </button>
          </div>
        </div>

        {loading ? (
          <div className="faculty-lecture-report-loading">
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
            <p>Loading lecture report...</p>
          </div>
        ) : !reportData ? (
          <div className="faculty-lecture-report-empty">
            <img src={emptyStateImg} alt="Select filters" />
            <h3>Select Filters to View Report</h3>
            <p>Choose department and date to generate lecture report</p>
          </div>
        ) : (
          <>
            <div className="print-header">
              <h2>HARIDWAR UNIVERSITY</h2>
              <h3>Department Teacher Lectures Report</h3>
              <h4>Department: {selectedDeptName} - Date: {formatDate(selectedDate)}</h4>
            </div>

            <div className="faculty-lecture-report-stats no-print">
              <div className="stat-card stat-total">
                <div className="stat-label">Total Lectures</div>
                <div className="stat-value">{reportData.statistics.total}</div>
              </div>
              <div className="stat-card stat-taken">
                <div className="stat-label">Taken</div>
                <div className="stat-value">{reportData.statistics.taken}</div>
              </div>
              <div className="stat-card stat-not-taken">
                <div className="stat-label">Not Taken</div>
                <div className="stat-value">{reportData.statistics.notTaken}</div>
              </div>
            </div>

            <div className="faculty-lecture-report-table-wrapper">
              <table className="faculty-lecture-report-table">
                <thead>
                  <tr>
                    <th className="sr-col">SR NO.</th>
                    <th className="faculty-col">FACULTY NAME</th>
                    {lectureSlots.map((slot) => (
                      <th key={slot.id} className="lecture-col">
                        LECTURE {slot.id}<br />
                        <span className="time-slot">{slot.time}</span>
                      </th>
                    ))}
                    <th className="total-col">TOTAL</th>
                    <th className="taken-col">TAKEN</th>
                    <th className="not-taken-col">NOT TAKEN</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.faculty.map((faculty, index) => {
                    const totalLectures = Object.keys(faculty.lectures).length;
                    const takenLectures = Object.values(faculty.lectures).filter(
                      (l) => l.status === "taken"
                    ).length;
                    const notTakenLectures = totalLectures - takenLectures;

                    return (
                      <tr key={faculty._id || index}>
                        <td className="sr-cell">{index + 1}</td>
                        <td className="faculty-cell">
                          <div className="faculty-name">{faculty.name}</div>
                          <div className="faculty-info">ID: {faculty.employeeId}</div>
                        </td>
                        {lectureSlots.map((slot) => {
                          const lecture = faculty.lectures[slot.id];
                          if (lecture) {
                            return (
                              <td
                                key={slot.id}
                                className={`lecture-cell ${
                                  lecture.status === "taken" ? "taken" : "not-taken"
                                }`}
                              >
                                <div className="lecture-course">
                                  {lecture.course?.courseName || lecture.course?.code || "Course"}
                                </div>
                                <div className="lecture-group">
                                  Group: {lecture.group?.name || "N/A"}
                                </div>
                                <div className="lecture-code">
                                  {lecture.course?.code || ""}
                                </div>
                              </td>
                            );
                          }
                          return <td key={slot.id} className="lecture-cell empty">-</td>;
                        })}
                        <td className="total-cell">{totalLectures}</td>
                        <td className="taken-cell">{takenLectures}</td>
                        <td className="not-taken-cell">{notTakenLectures}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FacultyLectureReport;
