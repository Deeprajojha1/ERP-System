import React, { useMemo, useState } from "react";
import { FiDownload, FiPrinter, FiSearch } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import { useSelector } from "react-redux";
import "./Exam.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import toast from "react-hot-toast";
import ClipLoader from "./components/ClipLoader";

const Exam = () => {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All Subjects");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loadState] = useState(ADMIN_LOAD_STATES.SUCCESS);
  const [actionLoading, setActionLoading] = useState({});
  const [isSchedulePrinting, setIsSchedulePrinting] = useState(false);
  const apiBase = useSelector((state) => state.config.apiBase);

  const getExamActionKey = (exam, action) => `${exam.name}-${exam.date}-${action}`;
  const setExamActionLoading = (exam, action, isLoading) => {
    const key = getExamActionKey(exam, action);
    setActionLoading((prev) => ({
      ...prev,
      [key]: isLoading,
    }));
  };
  const isExamActionLoading = (exam, action) =>
    Boolean(actionLoading[getExamActionKey(exam, action)]);

  const subjects = [
    "All Subjects",
    "Microprocessors",
    "Farm Management",
    "Structural Analysis",
    "Soil Science",
    "Machine Learning",
    "Communication Skills",
    "Transportation",
    "Mobile Apps",
  ];

  const exams = useMemo(() => [
    {
      name: "Microprocessors - Midterm",
      subject: "Microprocessors",
      date: "2024-02-15",
      time: "10:00 AM",
      duration: "2 hours",
      status: "Scheduled",
    },
    {
      name: "Farm Management - Midterm",
      subject: "Farm Management",
      date: "2024-02-16",
      time: "11:00 AM",
      duration: "2 hours",
      status: "Scheduled",
    },
    {
      name: "Structural Analysis - Midterm",
      subject: "Structural Analysis",
      date: "2024-02-17",
      time: "12:00 AM",
      duration: "2 hours",
      status: "Scheduled",
    },
    {
      name: "Soil Science - Midterm",
      subject: "Soil Science",
      date: "2024-02-18",
      time: "13:00 AM",
      duration: "2 hours",
      status: "Scheduled",
    },
    {
      name: "Machine Learning - Midterm",
      subject: "Machine Learning",
      date: "2024-02-19",
      time: "10:00 AM",
      duration: "2 hours",
      status: "Scheduled",
    },
    {
      name: "Communication Skills - Midterm",
      subject: "Communication Skills",
      date: "2024-02-20",
      time: "11:00 AM",
      duration: "2 hours",
      status: "Scheduled",
    },
  ], []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return exams.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(term) ||
        e.subject.toLowerCase().includes(term);
      const matchSubject =
        subject === "All Subjects" || e.subject === subject;
      const matchFrom = fromDate ? e.date >= fromDate : true;
      const matchTo = toDate ? e.date <= toDate : true;
      return matchSearch && matchSubject && matchFrom && matchTo;
    });
  }, [search, subject, fromDate, toDate, exams]);

  const printWithHiddenFrame = ({ title, htmlContent, onComplete }) => {
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
      if (typeof onComplete === "function") onComplete();
      return;
    }

    let cleaned = false;
    let fallbackTimer = null;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (document.body.contains(printFrame)) {
        document.body.removeChild(printFrame);
      }
      if (typeof onComplete === "function") onComplete();
    };

    frameWindow.document.open();
    frameWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1, h2 { margin: 0 0 12px; }
            .meta { margin: 8px 0 14px; color: #334155; font-size: 13px; }
            .meta div { margin: 4px 0; }
            .label { font-weight: 700; display: inline-block; width: 92px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 13px; }
            th { background: #f8fafc; font-weight: 700; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    frameWindow.document.close();

    const startPrint = () => {
      const handleAfterPrint = () => {
        frameWindow.removeEventListener("afterprint", handleAfterPrint);
        cleanup();
      };
      frameWindow.addEventListener("afterprint", handleAfterPrint);
      frameWindow.focus();
      frameWindow.print();
      fallbackTimer = window.setTimeout(cleanup, 60000);
    };

    if (frameWindow.document.readyState === "complete") {
      startPrint();
    } else {
      printFrame.onload = startPrint;
    }
  };

  const handlePrint = (exam) => {
    if (isExamActionLoading(exam, "print")) return;
    setExamActionLoading(exam, "print", true);
    const html = `
      <h2>Exam Sheet</h2>
      <div class="meta">
        <div><span class="label">Name:</span> ${exam.name}</div>
        <div><span class="label">Subject:</span> ${exam.subject}</div>
        <div><span class="label">Date:</span> ${exam.date}</div>
        <div><span class="label">Time:</span> ${exam.time}</div>
        <div><span class="label">Duration:</span> ${exam.duration}</div>
        <div><span class="label">Status:</span> ${exam.status.toUpperCase()}</div>
      </div>
    `;
    printWithHiddenFrame({
      title: "Exam Sheet",
      htmlContent: html,
      onComplete: () => setExamActionLoading(exam, "print", false),
    });
  };

  const handlePrintSchedule = () => {
    if (isSchedulePrinting) return;
    if (!fromDate || !toDate) {
      toast.error("Please select both start and end date.");
      return;
    }
    if (fromDate > toDate) {
      toast.error("Start date cannot be after end date.");
      return;
    }
    if (!filtered.length) {
      toast.error("No exams found for selected date range.");
      return;
    }

    setIsSchedulePrinting(true);
    const rowsHtml = filtered
      .map(
        (exam, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${exam.name}</td>
            <td>${exam.subject}</td>
            <td>${exam.date}</td>
            <td>${exam.time}</td>
            <td>${exam.duration}</td>
            <td>${exam.status.toUpperCase()}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <h1>Exam Schedule</h1>
      <div class="meta">
        <div><span class="label">From:</span> ${fromDate}</div>
        <div><span class="label">To:</span> ${toDate}</div>
        <div><span class="label">Total:</span> ${filtered.length} exam(s)</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>S. No</th>
            <th>Exam Name</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Time</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    printWithHiddenFrame({
      title: "Exam Schedule",
      htmlContent: html,
      onComplete: () => setIsSchedulePrinting(false),
    });
  };

  const handleDownload = async (exam) => {
    if (isExamActionLoading(exam, "download")) return;
    setExamActionLoading(exam, "download", true);
    const esc = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 12px; font-size: 24px; }
            .row { margin: 8px 0; }
            .label { font-weight: 700; width: 90px; display: inline-block; }
          </style>
        </head>
        <body>
          <h1>Exam Sheet</h1>
          <div class="row"><span class="label">Name:</span> ${esc(exam.name)}</div>
          <div class="row"><span class="label">Subject:</span> ${esc(exam.subject)}</div>
          <div class="row"><span class="label">Date:</span> ${esc(exam.date)}</div>
          <div class="row"><span class="label">Time:</span> ${esc(exam.time)}</div>
          <div class="row"><span class="label">Duration:</span> ${esc(exam.duration)}</div>
          <div class="row"><span class="label">Status:</span> ${esc(exam.status.toUpperCase())}</div>
        </body>
      </html>
    `;

    try {
      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: `${exam.name.replace(/\s+/g, "_")}.pdf`,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    } finally {
      setExamActionLoading(exam, "download", false);
    }
  };


  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="exam-state pending app-loader-state">
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
          <p>Loading exams...</p>
        </div>
      );
    }
    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="exam-state error">
          <img src={emptyStateImg} alt="Failed" className="exam-state-img" />
          <h3>Failed to load exams</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="exam-header">
          <h1 className="exam-title">Examinations</h1>
          <button
            className="exam-add-btn"
            type="button"
            onClick={() => setIsOpen(true)}
          >
            + Create Exam
          </button>
        </div>

        <div className="exam-filters">
          <div className="exam-search">
            <span className="exam-search-icon" aria-hidden="true">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search by exam name or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="exam-select">
            <label>Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="exam-date">
            <label>From</label>
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
          </div>

          <div className="exam-date">
            <label>To</label>
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
          </div>

          <div className="exam-filter-actions">
            <button
              type="button"
              className="exam-print-schedule-btn admin-btn-with-loader"
              onClick={handlePrintSchedule}
              disabled={isSchedulePrinting}
            >
              {isSchedulePrinting ? (
                <>
                  <ClipLoader
                    size={15}
                    color="#0f172a"
                    trackColor="rgba(15, 23, 42, 0.2)"
                  />
                  <span>Printing...</span>
                </>
              ) : (
                <>
                  <FiPrinter />
                  <span>Print Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="exam-table-wrap">
          <table className="exam-table">
            <thead>
              <tr>
                <th className="exam-cell-serial">S. No</th>
                <th>EXAM NAME</th>
                <th>SUBJECT</th>
                <th>DATE</th>
                <th>TIME</th>
                <th>DURATION</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, index) => {
                const numericId =
                  (e.date || "").replace(/\D/g, "") || `${index + 1}`;
                return (
                  <tr key={`${e.name}-${e.date}-${numericId}`}>
                    <td className="exam-serial-cell">{index + 1}</td>
                    <td className="exam-name">{e.name}</td>
                    <td>{e.subject}</td>
                    <td>{e.date}</td>
                    <td>{e.time}</td>
                    <td>{e.duration}</td>
                    <td>{e.status.toUpperCase()}</td>
                    <td>
                      <div className="exam-actions">
                        <button
                          className="exam-action-btn admin-btn-with-loader"
                          type="button"
                          onClick={() => handlePrint(e)}
                          disabled={isExamActionLoading(e, "print")}
                        >
                          {isExamActionLoading(e, "print") ? (
                            <>
                              <ClipLoader
                                size={14}
                                color="#0f172a"
                                trackColor="rgba(15, 23, 42, 0.2)"
                              />
                              <span>Printing...</span>
                            </>
                          ) : (
                            <>
                              <FiPrinter />
                              <span>Print</span>
                            </>
                          )}
                        </button>
                        <button
                          className="exam-action-btn export admin-btn-with-loader"
                          type="button"
                          onClick={() => handleDownload(e)}
                          disabled={isExamActionLoading(e, "download")}
                        >
                          {isExamActionLoading(e, "download") ? (
                            <>
                              <ClipLoader
                                size={14}
                                color="#1d4ed8"
                                trackColor="rgba(29, 78, 216, 0.25)"
                              />
                              <span>Downloading...</span>
                            </>
                          ) : (
                            <>
                              <FiDownload />
                              <span>Download</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="exam-empty">
                    No exams found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="exam-page">
      {renderState()}
{isOpen && (
        <div className="exam-modal">
          <div
            className="exam-modal-backdrop"
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="exam-modal-card">
            <div className="exam-modal-head">
              <h2>Create Exam</h2>
              <p>Schedule a new examination</p>
            </div>
            <form className="exam-form">
              <label>
                Exam Name *
                <input placeholder="e.g., Data Structures - Midterm" />
              </label>
              <label>
                Subject *
                <input placeholder="e.g., Data Structures" />
              </label>
              <div className="exam-form-row">
                <label>
                  Date *
                  <input type="date" placeholder="dd-mm-yyyy" />
                </label>
                <label>
                  Time *
                  <input type="time" placeholder="--:--" />
                </label>
              </div>
              <label>
                Duration
                <input placeholder="2 hours" />
              </label>
              <div className="exam-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="button" className="btn-primary">
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exam;


