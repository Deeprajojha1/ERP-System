import React, { useMemo, useState } from "react";
import "./GeneralSupport.css";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";

const GeneralSupport = () => {
  const [reportType, setReportType] = useState("Daily Attendance Report");
  const [department, setDepartment] = useState("All Departments");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState("Excel");
  const [recent, setRecent] = useState([]);
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);

  const reportTypes = [
    "Daily Attendance Report",
    "Student Master Report",
    "Faculty Master Report",
    "Fees Summary Report",
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

  const data = useMemo(() => {
    return [
      {
        Name: "Priya Joshi",
        Department: "CSE",
        Status: "Present",
        Date: "2024-02-15",
      },
      {
        Name: "Aditya Rao",
        Department: "ECE",
        Status: "Absent",
        Date: "2024-02-15",
      },
      {
        Name: "Karan Joshi",
        Department: "MECH",
        Status: "Present",
        Date: "2024-02-15",
      },
    ];
  }, []);

  const downloadCSV = (rows, filename) => {
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => r[h]).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (rows, filename) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Export Data", 14, 18);
    doc.setFontSize(10);
    let y = 28;
    rows.forEach((r) => {
      doc.text(`${r.Name} | ${r.Department} | ${r.Status} | ${r.Date}`, 14, y);
      y += 6;
    });
    doc.save(filename);
  };

  const handleGenerate = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${reportType.replace(/\s+/g, "_")}_${stamp}`;

    if (format === "PDF") {
      downloadPDF(data, `${base}.pdf`);
    } else if (format === "CSV") {
      downloadCSV(data, `${base}.csv`);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      XLSX.writeFile(workbook, `${base}.xlsx`);
    }

    setRecent((prev) => [
      { name: `${base}.${format === "PDF" ? "pdf" : format === "CSV" ? "csv" : "xlsx"}` },
      ...prev,
    ]);
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="gs-state pending">
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
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
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

  return (
    <div className="gs-page">
      {renderState()}
    </div>
  );
};

export default GeneralSupport;
