import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import "./GeneralSupport.css";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import { downloadTabularFile } from "../utils/tabularDownload";
import toast from "react-hot-toast";

const GeneralSupport = () => {
  const [reportType, setReportType] = useState("Daily Attendance Report");
  const [department, setDepartment] = useState("All Departments");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState("Excel");
  const [recent, setRecent] = useState([]);
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);
  const apiBase = useSelector((state) => state.config.apiBase);

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

  const downloadPDF = async (rows, filename) => {
    const esc = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const list = rows
      .map(
        (r) => `<tr><td>${esc(r.Name)}</td><td>${esc(r.Department)}</td><td>${esc(
          r.Status,
        )}</td><td>${esc(r.Date)}</td></tr>`,
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
            <thead><tr><th>Name</th><th>Department</th><th>Status</th><th>Date</th></tr></thead>
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

  const handleGenerate = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${reportType.replace(/\s+/g, "_")}_${stamp}`;

    try {
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

