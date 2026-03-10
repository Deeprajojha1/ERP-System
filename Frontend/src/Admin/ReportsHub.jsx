import React, { useMemo, useState } from "react";
import { FiFilter, FiDownloadCloud, FiShare2 } from "react-icons/fi";
import { MdOutlineAssessment } from "react-icons/md";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import ClipLoader from "./components/ClipLoader";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import "./ReportsHub.css";

const RANGE_OPTIONS = ["This Month", "Quarter to Date", "Academic Year"];
const DATASETS = ["Collections", "Scholarships", "Transport", "Hostel"];

const HISTORY = [
{
id: "RPT-9821",
title: "Monthly Fee Ledger",
range: "Jan 2026",
size: "3.4 MB",
status: "Completed",
},
{
id: "RPT-9815",
title: "Scholarship Impact",
range: "Q3 2025",
size: "2.1 MB",
status: "Processing",
},
{
id: "RPT-9809",
title: "Hostel Recovery",
range: "FY 24-25",
size: "1.9 MB",
status: "Failed",
},
{
id: "RPT-9832",
title: "Transport Fee Collection",
range: "Feb 2026",
size: "2.7 MB",
status: "Completed",
},
{
id: "RPT-9840",
title: "Outstanding Dues Report",
range: "Mar 2026",
size: "4.1 MB",
status: "Completed",
},
{
id: "RPT-9845",
title: "Fee Waiver Analysis",
range: "Q4 2025",
size: "2.3 MB",
status: "Completed",
},
{
id: "RPT-9850",
title: "Late Payment Penalties",
range: "FY 25-26",
size: "1.2 MB",
status: "Processing",
},
{
id: "RPT-9855",
title: "Departmental Fee Summary",
range: "Jan 2026",
size: "3.0 MB",
status: "Completed",
},
{
id: "RPT-9860",
title: "Refund Transactions",
range: "Feb 2026",
size: "1.5 MB",
status: "Completed",
},
{
id: "RPT-9865",
title: "Annual Audit Export",
range: "FY 25-26",
size: "5.2 MB",
status: "Completed",
},
];

const REPORT_DETAIL_ROWS = [
  {
    studentId: "HU25CS001",
    studentName: "Aarav Sharma",
    department: "Computer Science",
    feeHead: "Tuition Fee",
    billedAmount: 125000,
    paidAmount: 125000,
    balanceAmount: 0,
    dueDate: "2026-03-05",
    paymentMode: "UPI",
    receiptNo: "RCPT-10391",
    status: "Paid",
  },
  {
    studentId: "HU25BA014",
    studentName: "Riya Verma",
    department: "Business Administration",
    feeHead: "Hostel Fee",
    billedAmount: 78000,
    paidAmount: 48000,
    balanceAmount: 30000,
    dueDate: "2026-03-10",
    paymentMode: "Bank Transfer",
    receiptNo: "RCPT-10402",
    status: "Partially Paid",
  },
  {
    studentId: "HU24ME022",
    studentName: "Kabir Singh",
    department: "Mechanical Engineering",
    feeHead: "Transport Fee",
    billedAmount: 22000,
    paidAmount: 22000,
    balanceAmount: 0,
    dueDate: "2026-03-02",
    paymentMode: "Card",
    receiptNo: "RCPT-10348",
    status: "Paid",
  },
  {
    studentId: "HU25CE017",
    studentName: "Neha Gupta",
    department: "Civil Engineering",
    feeHead: "Scholarship Adjustment",
    billedAmount: 98000,
    paidAmount: 65000,
    balanceAmount: 33000,
    dueDate: "2026-03-14",
    paymentMode: "NEFT",
    receiptNo: "RCPT-10418",
    status: "Pending",
  },
  {
    studentId: "HU23PH009",
    studentName: "Ishaan Jain",
    department: "Pharmacy",
    feeHead: "Exam Fee",
    billedAmount: 12000,
    paidAmount: 12000,
    balanceAmount: 0,
    dueDate: "2026-02-27",
    paymentMode: "Cash",
    receiptNo: "RCPT-10297",
    status: "Paid",
  },
  {
    studentId: "HU24LA006",
    studentName: "Meera Arora",
    department: "Law",
    feeHead: "Library Fee",
    billedAmount: 8500,
    paidAmount: 5000,
    balanceAmount: 3500,
    dueDate: "2026-03-16",
    paymentMode: "UPI",
    receiptNo: "RCPT-10431",
    status: "Partially Paid",
  },
];

const INR_FORMATTER = new Intl.NumberFormat("en-IN");
const formatCurrency = (value) => `INR ${INR_FORMATTER.format(Number(value || 0))}`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const ReportsHub = () => {
const [range, setRange] = useState(RANGE_OPTIONS[0]);
const [dataset, setDataset] = useState(DATASETS[0]);
const [keyword, setKeyword] = useState("");
const [isGeneratingExport, setIsGeneratingExport] = useState(false);
const apiBase = useSelector((state) => state.config.apiBase);

const filteredHistory = useMemo(() => {
const needle = keyword.trim().toLowerCase();
if (!needle) return HISTORY;
return HISTORY.filter((record) =>
record.title.toLowerCase().includes(needle)
);
}, [keyword]);

const buildReportHubPdfHtml = ({
  generatedAt,
  selectedRange,
  selectedDataset,
  selectedKeyword,
  historyRows,
  detailRows,
}) => {
  const totalBilled = detailRows.reduce((sum, row) => sum + Number(row.billedAmount || 0), 0);
  const totalPaid = detailRows.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
  const totalBalance = detailRows.reduce((sum, row) => sum + Number(row.balanceAmount || 0), 0);

  const historyHtml = historyRows
    .map(
      (record, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(record.id)}</td>
        <td>${escapeHtml(record.title)}</td>
        <td>${escapeHtml(record.range)}</td>
        <td>${escapeHtml(record.size)}</td>
        <td>${escapeHtml(record.status)}</td>
      </tr>
    `
    )
    .join("");

  const detailHtml = detailRows
    .map(
      (row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.studentId)}</td>
        <td>${escapeHtml(row.studentName)}</td>
        <td>${escapeHtml(row.department)}</td>
        <td>${escapeHtml(row.feeHead)}</td>
        <td>${escapeHtml(formatCurrency(row.billedAmount))}</td>
        <td>${escapeHtml(formatCurrency(row.paidAmount))}</td>
        <td>${escapeHtml(formatCurrency(row.balanceAmount))}</td>
        <td>${escapeHtml(row.dueDate)}</td>
        <td>${escapeHtml(row.paymentMode)}</td>
        <td>${escapeHtml(row.receiptNo)}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>
    `
    )
    .join("");

  return `
    <html>
      <head>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: Arial, sans-serif; color: #111827; font-size: 12px; }
          .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 10px; }
          .title { margin: 0; font-size: 24px; letter-spacing: 0.5px; color: #1e3a8a; }
          .subtitle { margin: 4px 0 0; color: #475569; font-size: 13px; }
          .meta-grid {
            margin: 10px 0;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px 12px;
          }
          .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; }
          .meta-item b { display: block; color: #1f2937; margin-bottom: 3px; }
          .summary {
            margin: 10px 0 14px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }
          .summary-card {
            border: 1px solid #dbeafe;
            background: #eff6ff;
            padding: 10px;
            border-radius: 8px;
          }
          .summary-card .label { color: #1e3a8a; font-size: 11px; margin-bottom: 4px; }
          .summary-card .value { font-size: 18px; font-weight: 700; color: #0f172a; }
          h2 { margin: 14px 0 8px; color: #0f172a; font-size: 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; color: #1e293b; font-size: 11px; }
          .note { margin-top: 8px; color: #64748b; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">HARIDWAR UNIVERSITY - FEES REPORTS HUB</h1>
          <p class="subtitle">Administrative Financial Export (Dummy Dataset for UI Demonstration)</p>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><b>Generated At</b>${escapeHtml(generatedAt.toLocaleString())}</div>
          <div class="meta-item"><b>Reporting Range</b>${escapeHtml(selectedRange)}</div>
          <div class="meta-item"><b>Dataset</b>${escapeHtml(selectedDataset)}</div>
          <div class="meta-item"><b>Keyword Filter</b>${escapeHtml(selectedKeyword || "All Records")}</div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="label">Total Billed</div>
            <div class="value">${escapeHtml(formatCurrency(totalBilled))}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Collected</div>
            <div class="value">${escapeHtml(formatCurrency(totalPaid))}</div>
          </div>
          <div class="summary-card">
            <div class="label">Outstanding</div>
            <div class="value">${escapeHtml(formatCurrency(totalBalance))}</div>
          </div>
        </div>

        <h2>Recent Export History</h2>
        <table>
          <thead>
            <tr>
              <th>S. No.</th>
              <th>Report ID</th>
              <th>Title</th>
              <th>Range</th>
              <th>File Size</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${historyHtml || "<tr><td colspan='6'>No history matched the current filter.</td></tr>"}</tbody>
        </table>

        <h2>Detailed Fee Snapshot (Dummy)</h2>
        <table>
          <thead>
            <tr>
              <th>S. No.</th>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Department</th>
              <th>Fee Head</th>
              <th>Billed</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Payment Mode</th>
              <th>Receipt No.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${detailHtml}</tbody>
        </table>

        <p class="note">This export is generated from static dummy data for the admin analytics workflow.</p>
      </body>
    </html>
  `;
};

const handleGenerateExport = async () => {
if (isGeneratingExport) return;
setIsGeneratingExport(true);
try {
  await new Promise((resolve) => window.setTimeout(resolve, 300));

  const generatedAt = new Date();
  const dateSuffix = generatedAt.toISOString().split("T")[0];
  const datasetKey = dataset.toLowerCase().replace(/\s+/g, "-");
  const pdfHtml = buildReportHubPdfHtml({
    generatedAt,
    selectedRange: range,
    selectedDataset: dataset,
    selectedKeyword: keyword,
    historyRows: filteredHistory,
    detailRows: REPORT_DETAIL_ROWS,
  });

  await downloadPdfFromHtml(apiBase, {
    html: pdfHtml,
    fileName: `reports-hub-${datasetKey}-${dateSuffix}.pdf`,
    fallbackToPrint: true,
  });
  toast.success("Report export generated");
} catch (error) {
  toast.error(error?.message || "Failed to generate export");
} finally {
  setIsGeneratingExport(false);
}
};

return ( <div className="reports-hub-page"> <header className="reports-hero"> <div> <p className="reports-eyebrow">Analytics & Reports</p> <h1>Reports Hub</h1> <p className="reports-supporting">
Generate curated exports, rerun saved recipes, and share datasets
with finance and audit teams. </p> </div>
    <button
      type="button"
      className="reports-primary-btn admin-btn-with-loader"
      onClick={handleGenerateExport}
      disabled={isGeneratingExport}
    >
      {isGeneratingExport ? (
        <>
          <ClipLoader size={15} />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <FiDownloadCloud />
          <span>Generate Export</span>
        </>
      )}
    </button>
  </header>

  {/* filters */}
  <section className="reports-filters">
    <div className="reports-filter-group">
      <label>Reporting Range</label>

      <div className="reports-pill-group">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`reports-pill ${
              option === range ? "is-active" : ""
            }`}
            onClick={() => setRange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>

    <label className="reports-select">
      <span>Dataset</span>

      <select
        value={dataset}
        onChange={(event) => setDataset(event.target.value)}
      >
        {DATASETS.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>

    <label className="reports-search">
      <span>Search History</span>

      <input
        type="search"
        placeholder="Search by recipe name"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
    </label>
  </section>

  {/* summary */}
  <section className="reports-summary-grid">
    <article className="reports-summary-card">
      <span className="reports-summary-icon">
        <MdOutlineAssessment />
      </span>

      <div>
        <p>Total exports this month</p>
        <strong>26 packages</strong>
        <small>Avg ready time 42s</small>
      </div>
    </article>

    <article className="reports-summary-card">
      <span className="reports-summary-icon">
        <FiShare2 />
      </span>

      <div>
        <p>Shared recipes</p>
        <strong>12 active</strong>
        <small>4 scheduled weekly</small>
      </div>
    </article>
  </section>

  {/* history */}
  <section className="reports-history">
    <div className="reports-history-head">
      <div>
        <h2>Recent exports</h2>
        <p>Track delivery status across your latest datasets.</p>
      </div>

      <button type="button" className="reports-outlined-btn">
        <FiFilter />
        <span>Automation Rules</span>
      </button>
    </div>

    <div className="reports-history-list">
      {filteredHistory.map((record) => (
        <article key={record.id} className="reports-history-row">
          <div>
            <p className="reports-history-title">{record.title}</p>
            <small>{record.range}</small>
          </div>

          <p>{record.size}</p>

          <span
            className={`reports-status status-${record.status.toLowerCase()}`}
          >
            {record.status}
          </span>
        </article>
      ))}
    </div>
  </section>
</div>

);
};

export default ReportsHub;
