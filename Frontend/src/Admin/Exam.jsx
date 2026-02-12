import React, { useMemo, useState } from "react";
import { FiDownload, FiPrinter, FiSearch } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import jsPDF from "jspdf";
import "./Exam.css";

const Exam = () => {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All Subjects");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState("success");

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

  const exams = [
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
  ];

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
  }, [search, subject, fromDate, toDate]);

  const handlePrint = (exam) => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Exam Sheet</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h2 { margin: 0 0 12px; }
            .meta { margin-top: 10px; }
            .meta div { margin: 6px 0; }
            .label { font-weight: bold; display: inline-block; width: 90px; }
          </style>
        </head>
        <body>
          <h2>Exam Sheet</h2>
          <div class="meta">
            <div><span class="label">Name:</span> ${exam.name}</div>
            <div><span class="label">Subject:</span> ${exam.subject}</div>
            <div><span class="label">Date:</span> ${exam.date}</div>
            <div><span class="label">Time:</span> ${exam.time}</div>
            <div><span class="label">Duration:</span> ${exam.duration}</div>
            <div><span class="label">Status:</span> ${exam.status.toUpperCase()}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownload = (exam) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Exam Sheet", 14, 18);
    doc.setFontSize(11);
    const lines = [
      `Name: ${exam.name}`,
      `Subject: ${exam.subject}`,
      `Date: ${exam.date}`,
      `Time: ${exam.time}`,
      `Duration: ${exam.duration}`,
      `Status: ${exam.status.toUpperCase()}`,
    ];
    let y = 30;
    lines.forEach((line) => {
      doc.text(line, 14, y);
      y += 8;
    });
    doc.save(`${exam.name.replace(/\s+/g, "_")}.pdf`);
  };


  const renderState = () => {
    if (loadState === "pending") {
      return (
        <div className="exam-state pending">
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
    if (loadState === "failure") {
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
        </div>

        <div className="exam-table-wrap">
          <table className="exam-table">
            <thead>
              <tr>
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
              {filtered.map((e) => (
                <tr key={`${e.name}-${e.date}`}>
                  <td className="exam-name">{e.name}</td>
                  <td>{e.subject}</td>
                  <td>{e.date}</td>
                  <td>{e.time}</td>
                  <td>{e.duration}</td>
                  <td>{e.status.toUpperCase()}</td>
                  <td>
                    <div className="exam-actions">
                      <button
                        className="exam-action-btn"
                        type="button"
                        onClick={() => handlePrint(e)}
                      >
                        <FiPrinter />
                        Print
                      </button>
                      <button
                        className="exam-action-btn export"
                        type="button"
                        onClick={() => handleDownload(e)}
                      >
                        <FiDownload />
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="exam-empty">
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
