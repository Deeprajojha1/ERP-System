import React, { useEffect, useMemo, useState } from "react";
import {
  FiUsers,
  FiDollarSign,
  FiPercent,
  FiCheckCircle,
  FiAlertTriangle,
  FiDownload,
  FiEye,
  FiEdit2,
} from "react-icons/fi";
import ClipLoader from "./components/ClipLoader";
import "./StudentFeeMapping.css";

const STUDENT_ROWS = [
  {
    id: "2021CS001",
    name: "Kunal Raman",
    program: "B.Tech - Computer Science",
    department: "Computer Science",
    semester: "Sem 7",
    baseFee: 125000,
    discount: 0,
    finalFee: 125000,
    paid: 0,
    pending: 125000,
    status: "Pending",
  },
  {
    id: "2022CS002",
    name: "Anjali Rao",
    program: "B.Tech - Computer Science",
    department: "Computer Science",
    semester: "Sem 6",
    baseFee: 125000,
    discount: 15000,
    finalFee: 110000,
    paid: 110000,
    pending: 0,
    status: "Paid",
  },
  {
    id: "2023CS003",
    name: "Advik Mehta",
    program: "B.Tech - Computer Science",
    department: "Computer Science",
    semester: "Sem 3",
    baseFee: 170000,
    discount: 0,
    finalFee: 170000,
    paid: 170000,
    pending: 0,
    status: "Paid",
  },
  {
    id: "2022CS004",
    name: "Vivaan Iyer",
    program: "B.Tech - Computer Science",
    department: "Computer Science",
    semester: "Sem 5",
    baseFee: 125000,
    discount: 18750,
    finalFee: 106250,
    paid: 106250,
    pending: 0,
    status: "Paid",
  },
  {
    id: "2021CS005",
    name: "Vikram Chopra",
    program: "B.Tech - Computer Science",
    department: "Computer Science",
    semester: "Sem 8",
    baseFee: 170000,
    discount: 37500,
    finalFee: 132500,
    paid: 132500,
    pending: 0,
    status: "Paid",
  },
];

const SUMMARY_CARDS = [
  {
    label: "Total Students",
    value: "320",
    icon: FiUsers,
    accent: "students",
    helper: "Currently mapped",
  },
  {
    label: "Base Fee Amount",
    value: "₹420.65L",
    icon: FiDollarSign,
    accent: "base",
  },
  {
    label: "Total Discounts",
    value: "₹56.78L",
    icon: FiPercent,
    accent: "discount",
  },
  {
    label: "Final Fee Amount",
    value: "₹363.87L",
    icon: FiCheckCircle,
    accent: "final",
  },
];

const STUDENT_BREAKDOWNS = {
  "2021CS001": {
    academicFee: {
      amount: 95000,
      description: "Tuition + advanced lab access for AI & ML tracks.",
    },
    examFee: {
      amount: 8200,
      description: "Mid-term + finals, includes practical evaluation.",
    },
    housing: {
      label: "Hostel Fee",
      amount: 21500,
      description: "Block C, twin sharing with meal plan.",
    },
    fine: {
      amount: 1200,
      description: "Library book submission delayed by 6 days.",
    },
    scholarship: {
      label: "Merit Scholarship",
      amount: 15000,
      description: "Secured for CGPA 9.0+ in AY 24.",
    },
    discount: {
      label: "Sibling Discount",
      amount: 5000,
      description: "Sibling currently enrolled in BBA program.",
    },
  },
  "2022CS002": {
    academicFee: {
      amount: 88000,
      description: "Core tuition + elective cloud computing credits.",
    },
    examFee: {
      amount: 7600,
      description: "End-sem assessments and practical viva.",
    },
    housing: {
      label: "Transportation Fee",
      amount: 18000,
      description: "AC bus pass Zone 2 (25 km radius).",
    },
    fine: {
      amount: 0,
      description: "No penalties recorded for this term.",
    },
    scholarship: {
      label: "Women In Tech Grant",
      amount: 20000,
      description: "National outreach initiative (Phase 2).",
    },
    discount: {
      label: "Early Payment Rebate",
      amount: 5000,
      description: "Paid first installment before 10 June.",
    },
  },
  "2023CS003": {
    academicFee: {
      amount: 105000,
      description: "Foundation tuition + innovation lab subscription.",
    },
    examFee: {
      amount: 5400,
      description: "Mid + end term theory papers.",
    },
    housing: {
      label: "Hostel Fee",
      amount: 24000,
      description: "Block A, triple sharing, veg mess plan.",
    },
    fine: {
      amount: 0,
      description: "Clean record. No fines applicable.",
    },
    scholarship: {
      label: "Innovation Bursary",
      amount: 12000,
      description: "Granted for prototype submission in iHub.",
    },
    discount: {
      label: "Sports Quota Fee-Off",
      amount: 8000,
      description: "State-level badminton athlete.",
    },
  },
  "2022CS004": {
    academicFee: {
      amount: 94000,
      description: "Advanced electives combo (AI Ethics + FinTech).",
    },
    examFee: {
      amount: 6900,
      description: "Assessment kit & viva scheduling.",
    },
    housing: {
      label: "Transportation Fee",
      amount: 15500,
      description: "Hybrid shuttle plan (12 km, evening drop).",
    },
    fine: {
      amount: 600,
      description: "Late hostel gate entry recorded in Aug.",
    },
    scholarship: {
      label: "Research Assistantship",
      amount: 18000,
      description: "Supported Prof. Sen's edge-computing project.",
    },
    discount: {
      label: "Alumni Child Benefit",
      amount: 3500,
      description: "Parent from 2002 ECE cohort.",
    },
  },
  "2021CS005": {
    academicFee: {
      amount: 99000,
      description: "Final year tuition + capstone evaluation fees.",
    },
    examFee: {
      amount: 8800,
      description: "Project jury + thesis printing allowance.",
    },
    housing: {
      label: "Hostel Fee",
      amount: 26000,
      description: "Block D single occupancy, premium mess plan.",
    },
    fine: {
      amount: 2500,
      description: "Lab equipment damage (IoT kit) in July.",
    },
    scholarship: {
      label: "Academic Excellence",
      amount: 25000,
      description: "Consistent top 3 performer across semesters.",
    },
    discount: {
      label: "Mentor Teaching Credit",
      amount: 7500,
      description: "TA hours contributed to Coding 101 batch.",
    },
  },
};

const StudentFeeMapping = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(
    STUDENT_ROWS[0]?.id ?? ""
  );

  const programOptions = useMemo(
    () => Array.from(new Set(STUDENT_ROWS.map((row) => row.program))),
    []
  );
  const departmentOptions = useMemo(
    () => Array.from(new Set(STUDENT_ROWS.map((row) => row.department))),
    []
  );
  const semesterOptions = useMemo(
    () => Array.from(new Set(STUDENT_ROWS.map((row) => row.semester))),
    []
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(STUDENT_ROWS.map((row) => row.status))),
    []
  );

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return STUDENT_ROWS.filter((row) => {
      const matchesSearch = normalizedSearch
        ? row.name.toLowerCase().includes(normalizedSearch) ||
          row.id.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesProgram =
        programFilter === "all" || row.program === programFilter;
      const matchesDepartment =
        departmentFilter === "all" || row.department === departmentFilter;
      const matchesSemester =
        semesterFilter === "all" || row.semester === semesterFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;

      return (
        matchesSearch &&
        matchesProgram &&
        matchesDepartment &&
        matchesSemester &&
        matchesStatus
      );
    });
  }, [searchTerm, programFilter, departmentFilter, semesterFilter, statusFilter]);

  useEffect(() => {
    if (!filteredStudents.length) {
      return;
    }
    const isStillVisible = filteredStudents.some(
      (row) => row.id === selectedStudentId
    );
    if (!isStillVisible) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    if (!filteredStudents.length) {
      return null;
    }
    return (
      filteredStudents.find((row) => row.id === selectedStudentId) ||
      filteredStudents[0]
    );
  }, [filteredStudents, selectedStudentId]);

  const detailBreakdown = selectedStudent
    ? STUDENT_BREAKDOWNS[selectedStudent.id]
    : null;

  const detailCards = detailBreakdown
    ? [
        {
          key: "academic",
          title: "Academic Fee",
          amount: detailBreakdown.academicFee.amount,
          helper: detailBreakdown.academicFee.description,
        },
        {
          key: "exam",
          title: "Exam Fee",
          amount: detailBreakdown.examFee.amount,
          helper: detailBreakdown.examFee.description,
        },
        {
          key: "housing",
          title: detailBreakdown.housing.label,
          amount: detailBreakdown.housing.amount,
          helper: detailBreakdown.housing.description,
        },
        {
          key: "fine",
          title: "Fine",
          amount: detailBreakdown.fine.amount,
          helper: detailBreakdown.fine.description,
          tone: detailBreakdown.fine.amount ? "warning" : "muted",
        },
        {
          key: "scholarship",
          title: detailBreakdown.scholarship.label,
          amount: detailBreakdown.scholarship.amount,
          helper: detailBreakdown.scholarship.description,
          tone: "positive",
          isDeduction: true,
        },
        {
          key: "discount",
          title: detailBreakdown.discount.label,
          amount: detailBreakdown.discount.amount,
          helper: detailBreakdown.discount.description,
          tone: "accent",
          isDeduction: true,
        },
      ]
    : [];

  const formatCurrency = (amount) => {
    const formatted = amount.toLocaleString("en-IN");
    return `₹${formatted}`;
  };

  const formatDiscount = (amount) => {
    if (!amount) return "No discount";
    return `-₹${amount.toLocaleString("en-IN")}`;
  };

  const buildCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const normalized = String(value).replace(/"/g, '""');
    return `"${normalized}"`;
  };

  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const headers = [
      "Enrollment ID",
      "Student Name",
      "Program",
      "Department",
      "Semester",
      "Base Fee",
      "Discount Applied",
      "Final Fee",
      "Paid",
      "Pending",
      "Status",
    ];

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      const csvRows = filteredStudents.map((row) => [
        buildCsvValue(row.id),
        buildCsvValue(row.name),
        buildCsvValue(row.program),
        buildCsvValue(row.department),
        buildCsvValue(row.semester),
        buildCsvValue(row.baseFee),
        buildCsvValue(row.discount),
        buildCsvValue(row.finalFee),
        buildCsvValue(row.paid),
        buildCsvValue(row.pending),
        buildCsvValue(row.status),
      ].join(","));

      const csvContent = [headers.map(buildCsvValue).join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      const dateSuffix = new Date().toISOString().split("T")[0];
      downloadLink.href = url;
      downloadLink.download = `student-fee-mapping-${dateSuffix}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="student-fee-mapping-page">
      <header className="sfm-hero">
        <div>
          <p className="sfm-eyebrow">Student Fee Mapping</p>
          <h1>Automatic fee assignment with discount application</h1>
          <p className="sfm-supporting">
            Track how discounts, scholarships, and payments influence final invoicing across cohorts.
          </p>
        </div>
        <button
          type="button"
          className="sfm-export-btn admin-btn-with-loader"
          onClick={handleExportData}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <ClipLoader size={15} color="#0f172a" trackColor="rgba(15, 23, 42, 0.2)" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <FiDownload />
              <span>Export Data</span>
            </>
          )}
        </button>
      </header>

      <section className="sfm-stats-grid">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={`sfm-stat-card sfm-stat-card--${card.accent}`}>
              <span className="sfm-stat-icon" aria-hidden="true">
                <Icon />
              </span>
              <div>
                <p className="sfm-stat-label">{card.label}</p>
                <p className="sfm-stat-value">{card.value}</p>
                {card.helper && <p className="sfm-stat-helper">{card.helper}</p>}
              </div>
            </article>
          );
        })}
      </section>

      <section className="sfm-controls">
        <div className="sfm-search">
          <input
            type="search"
            placeholder="Search by name or enrollment..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="sfm-filters">
          <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}>
            <option value="all">All Programs</option>
            {programOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="all">All Departments</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
            <option value="all">All Semesters</option>
            {semesterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All Status</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="sfm-table-card">
        <div className="sfm-table-head">
          <p>Student Details</p>
          <p>Program</p>
          <p>Base Fee</p>
          <p>Discounts</p>
          <p>Final Fee</p>
          <p>Paid</p>
          <p>Pending</p>
          <p>Status</p>
          <p>Actions</p>
        </div>
        <div className="sfm-table-body">
          {filteredStudents.map((row) => (
            <article
              key={row.id}
              className={`sfm-table-row ${
                row.id === (selectedStudent && selectedStudent.id)
                  ? "is-selected"
                  : ""
              }`}
              onClick={() => setSelectedStudentId(row.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedStudentId(row.id);
                }
              }}
              tabIndex={0}
            >
              <div className="sfm-student-cell">
                <p className="sfm-student-name">{row.name}</p>
                <span className="sfm-student-id">{row.id}</span>
              </div>
              <div className="sfm-program-cell">
                <p>{row.program}</p>
                <span className="sfm-sem-tag">{row.semester}</span>
              </div>
              <div className="sfm-currency-cell">{formatCurrency(row.baseFee)}</div>
              <div className={`sfm-discount-cell ${row.discount ? "" : "sfm-discount-none"}`}>
                {formatDiscount(row.discount)}
              </div>
              <div className="sfm-currency-cell sfm-final-fee">
                {formatCurrency(row.finalFee)}
              </div>
              <div className="sfm-currency-cell sfm-paid">{formatCurrency(row.paid)}</div>
              <div className={`sfm-currency-cell sfm-pending ${row.pending ? "is-pending" : ""}`}>
                {formatCurrency(row.pending)}
              </div>
              <div className="sfm-status-cell">
                <span className={`sfm-status-badge sfm-status-${row.status.toLowerCase()}`}>
                  {row.status === "Paid" ? <FiCheckCircle /> : <FiAlertTriangle />}
                  {row.status}
                </span>
              </div>
              <div className="sfm-actions">
                <button
                  type="button"
                  className="sfm-action-btn"
                  aria-label={`View ${row.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedStudentId(row.id);
                  }}
                >
                  <FiEye />
                </button>
                <button type="button" className="sfm-action-btn" aria-label={`Edit ${row.name}`}>
                  <FiEdit2 />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sfm-detail-panel">
        {selectedStudent ? (
          <>
            <div className="sfm-detail-top">
              <div>
                <p className="sfm-detail-eyebrow">Focused Student Mapping</p>
                <h2>{selectedStudent.name}</h2>
                <div className="sfm-detail-tags">
                  <span className="sfm-detail-tag">{selectedStudent.id}</span>
                  <span className="sfm-detail-tag">{selectedStudent.program}</span>
                  <span className="sfm-detail-tag">{selectedStudent.semester}</span>
                </div>
              </div>
              <div className="sfm-detail-amounts">
                <div>
                  <p>Final Fee</p>
                  <strong>{formatCurrency(selectedStudent.finalFee)}</strong>
                </div>
                <div>
                  <p>Pending</p>
                  <strong className={selectedStudent.pending ? "is-due" : "is-cleared"}>
                    {formatCurrency(selectedStudent.pending)}
                  </strong>
                </div>
              </div>
            </div>

            {detailCards.length ? (
              <div className="sfm-detail-grid">
                {detailCards.map((card) => {
                  const classes = ["sfm-detail-card"];
                  if (card.tone) {
                    classes.push(`sfm-detail-${card.tone}`);
                  }
                  return (
                    <article key={card.key} className={classes.join(" ")}>
                      <p className="sfm-detail-label">{card.title}</p>
                      <h3>
                        {card.isDeduction
                          ? `-${formatCurrency(card.amount)}`
                          : formatCurrency(card.amount)}
                      </h3>
                      <p className="sfm-detail-desc">{card.helper}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="sfm-detail-empty">No detailed mapping data recorded for this student.</p>
            )}
          </>
        ) : (
          <p className="sfm-detail-empty">No student records match the applied filters.</p>
        )}
      </section>
    </div>
  );
};

export default StudentFeeMapping;
