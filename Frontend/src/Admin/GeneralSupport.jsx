import React, { useMemo, useState } from "react";
import "./GeneralSupport.css";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const GeneralSupport = () => {
  const [reportType, setReportType] = useState("Daily Attendance Report");
  const [department, setDepartment] = useState("All Departments");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState("Excel");
  const [recent, setRecent] = useState([]);

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

  return (
    <div className="gs-page">
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

          <div className="gs-row">
            <label>
              From Date
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>
              To Date
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
          </div>

          <div className="gs-format">
            <span>Export Format</span>
            {"Excel,CSV,PDF".split(",").map((f) => (
              <button
                key={f}
                type="button"
                className={`gs-pill ${format === f ? "active" : ""}`}
                onClick={() => setFormat(f)}
              >
                {f}
              </button>
            ))}
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
    </div>
  );
};

export default GeneralSupport;
