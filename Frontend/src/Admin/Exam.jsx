import React, { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiChevronRight,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiPrinter,
  FiSearch,
} from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import { useSelector } from "react-redux";
import "./Exam.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import axios from "../utils/axiosInstance";
import toast from "react-hot-toast";

const pad2 = (value) => String(value).padStart(2, "0");
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value) => {
  if (!value) return "-";
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return "-";
  return dateObj.toISOString().slice(0, 10);
};

const formatTime12 = (time24 = "") => {
  const value = String(time24 || "").trim();
  if (!/^\d{2}:\d{2}$/.test(value)) return value || "-";
  const [h, m] = value.split(":").map(Number);
  const hour12 = h % 12 || 12;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${hour12}:${pad2(m)} ${suffix}`;
};

const addMinutesToTime = (time24 = "", durationMinutes = 0) => {
  if (!/^\d{2}:\d{2}$/.test(String(time24 || ""))) return "";
  const [h, m] = String(time24).split(":").map(Number);
  const total = h * 60 + m + Number(durationMinutes || 0);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const endH = Math.floor(wrapped / 60);
  const endM = wrapped % 60;
  return `${pad2(endH)}:${pad2(endM)}`;
};

const toStrengthValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const Exam = () => {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All Subjects");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [masterReportRows, setMasterReportRows] = useState([]);
  const [masterReportLoading, setMasterReportLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.PENDING);

  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    examName: "",
    block: "Academic Block",
    examType: "MIDTERM",
    session: "",
    department: "",
    course: "",
    semester: "",
    group: "",
    examDate: "",
    startTime: "",
    durationMinutes: "120",
    roomNo: "",
    invigilators: [],
    status: "SCHEDULED",
    maxMarks: "100",
    passMarks: "40",
    strength: "0",
  });

  const apiBase = useSelector((state) => state.config.apiBase);

  const fetchAll = async () => {
    try {
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      const [examRes, courseRes, groupRes, facultyRes] = await Promise.all([
        axios.get(`${apiBase}/admin/exam`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/course`, { withCredentials: true, params: { noCache: "true" } }),
        axios.get(`${apiBase}/admin/group`, { withCredentials: true, params: { noCache: "true" } }),
        axios.get(`${apiBase}/admin/faculty`, { withCredentials: true, params: { noCache: "true" } }),
      ]);

      setExams(examRes.data?.exams || []);
      setCourses(courseRes.data?.courses || []);
      setGroups(groupRes.data?.groups || []);
      setFaculty(facultyRes.data?.faculty || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      toast.error(error.response?.data?.message || "Failed to load exams");
    }
  };

  useEffect(() => {
    if (!apiBase) return;
    fetchAll();
  }, [apiBase]);

  const fetchExamMasterReport = async () => {
    try {
      setMasterReportLoading(true);
      const response = await axios.get(`${apiBase}/admin/exam`, {
        withCredentials: true,
        params: { noCache: "true" },
      });
      setMasterReportRows(response.data?.exams || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load exam master report");
    } finally {
      setMasterReportLoading(false);
    }
  };

  const normalizedExams = useMemo(
    () =>
      exams.map((exam) => ({
        _id: exam?._id,
        name: exam?.examName || "-",
        subject: exam?.subjectName || exam?.course?.courseName || "-",
        subjectCode: exam?.subjectCode || exam?.course?.code || "-",
        date: formatDate(exam?.examDate),
        startTime: exam?.startTime || "",
        endTime: exam?.endTime || "",
        timeLabel:
          exam?.startTime && exam?.endTime
            ? `${formatTime12(exam.startTime)} - ${formatTime12(exam.endTime)}`
            : formatTime12(exam?.startTime),
        duration: exam?.durationMinutes ? `${exam.durationMinutes} mins` : "-",
        status: String(exam?.status || "SCHEDULED").toUpperCase(),
        roomNo: exam?.roomNo || "-",
      })),
    [exams]
  );

  const subjects = useMemo(() => {
    const list = new Set(["All Subjects"]);
    normalizedExams.forEach((item) => {
      if (item.subject && item.subject !== "-") list.add(item.subject);
    });
    return Array.from(list);
  }, [normalizedExams]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return normalizedExams.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(term) ||
        e.subject.toLowerCase().includes(term) ||
        e.subjectCode.toLowerCase().includes(term);
      const matchSubject = subject === "All Subjects" || e.subject === subject;
      const matchFrom = fromDate ? e.date >= fromDate : true;
      const matchTo = toDate ? e.date <= toDate : true;
      return matchSearch && matchSubject && matchFrom && matchTo;
    });
  }, [search, subject, fromDate, toDate, normalizedExams]);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course?.id || course?._id || "") === formData.course),
    [courses, formData.course]
  );

  const filteredGroups = useMemo(() => {
    if (!formData.department) return groups;
    return groups.filter(
      (group) =>
        String(group?.department?._id || group?.department || "") === String(formData.department)
    );
  }, [groups, formData.department]);

  const groupStrengthMap = useMemo(() => {
    const map = new Map();
    groups.forEach((group) => {
      const id = String(group?._id || "");
      if (!id) return;
      const strength =
        Number(group?.studentCount) ||
        Number(group?.strength) ||
        (Array.isArray(group?.studentIds) ? group.studentIds.length : 0) ||
        0;
      map.set(id, strength);
    });
    return map;
  }, [groups]);

  const normalizedMasterReport = useMemo(
    () =>
      masterReportRows.map((exam) => ({
        _id: exam?._id,
        examName: exam?.examName || "-",
        subject:
          exam?.subjectCode && exam?.subjectName
            ? `${exam.subjectCode} - ${exam.subjectName}`
            : exam?.subjectName || exam?.course?.courseName || "-",
        examType: String(exam?.examType || "-").replace("ENDSEM", "END SEM"),
        session: exam?.session || "-",
        semester: exam?.semester ?? "-",
        block: exam?.block || "-",
        invigilatorName: Array.isArray(exam?.invigilators) && exam.invigilators.length
          ? exam.invigilators
              .map((item) => item?.user?.name || item?.employeeId || "")
              .filter(Boolean)
              .join(", ")
          : "-",
        roomNo: exam?.roomNo || "-",
        strength: (() => {
          const dbStrength = toStrengthValue(exam?.strength);
          if (dbStrength !== null) return dbStrength;
          const fallbackStrength = toStrengthValue(
            groupStrengthMap.get(String(exam?.group?._id || exam?.group || ""))
          );
          return fallbackStrength !== null ? fallbackStrength : "-";
        })(),
        date: formatDate(exam?.examDate),
        time:
          exam?.startTime && exam?.endTime
            ? `${formatTime12(exam.startTime)} - ${formatTime12(exam.endTime)}`
            : formatTime12(exam?.startTime),
        duration: exam?.durationMinutes ? `${exam.durationMinutes} mins` : "-",
        status: String(exam?.status || "SCHEDULED").toUpperCase(),
      })),
    [masterReportRows, groupStrengthMap]
  );

  const normalizedRegistration = useMemo(
    () =>
      exams.map((exam) => ({
        _id: exam?._id,
        examName: exam?.examName || "-",
        subject:
          exam?.subjectCode && exam?.subjectName
            ? `${exam.subjectCode} - ${exam.subjectName}`
            : exam?.subjectName || exam?.course?.courseName || "-",
        session: exam?.session || "-",
        semester: exam?.semester ?? "-",
        date: formatDate(exam?.examDate),
        status: String(exam?.status || "SCHEDULED").toUpperCase(),
      })),
    [exams]
  );

  const normalizedAdmitCards = useMemo(
    () =>
      exams.map((exam) => ({
        _id: exam?._id,
        examName: exam?.examName || "-",
        session: exam?.session || "-",
        semester: exam?.semester ?? "-",
        date: formatDate(exam?.examDate),
        issued: String(exam?.status || "").toUpperCase() === "CANCELLED" ? "NO" : "YES",
      })),
    [exams]
  );

  const resetForm = () => {
    setFormData({
      examName: "",
      block: "Academic Block",
      examType: "MIDTERM",
      session: "",
      department: "",
      course: "",
      semester: "",
      group: "",
      examDate: "",
      startTime: "",
      durationMinutes: "120",
      roomNo: "",
      invigilators: [],
      status: "SCHEDULED",
      maxMarks: "100",
      passMarks: "40",
      strength: "0",
    });
    setEditingExamId(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    resetForm();
  };

  const openModal = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEditModal = (exam) => {
    setEditingExamId(exam?._id || null);
    setFormData({
      examName: exam?.examName || "",
      block: String(exam?.block || "Academic Block"),
      examType:
        String(exam?.examType || "MIDTERM").toUpperCase() === "ENDTERM"
          ? "ENDSEM"
          : String(exam?.examType || "MIDTERM").toUpperCase(),
      session: exam?.session || "",
      department: String(exam?.department?._id || exam?.department || ""),
      course: String(exam?.course?._id || exam?.course || ""),
      semester: String(exam?.semester || ""),
      group: String(exam?.group?._id || exam?.group || ""),
      examDate: formatDate(exam?.examDate) !== "-" ? formatDate(exam?.examDate) : "",
      startTime: exam?.startTime || "",
      durationMinutes: String(exam?.durationMinutes || "120"),
      roomNo: exam?.roomNo || "",
      invigilators: Array.isArray(exam?.invigilators)
        ? exam.invigilators
            .map((item) => String(item?._id || item || ""))
            .filter(Boolean)
        : [],
      status: exam?.status || "SCHEDULED",
      maxMarks: String(exam?.maxMarks || "100"),
      passMarks: String(exam?.passMarks || "40"),
      strength: String(exam?.strength || "0"),
    });
    setIsOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    if (name === "course") {
      const course = courses.find(
        (item) => String(item?.id || item?._id || "") === String(value)
      );

      setFormData((prev) => ({
        ...prev,
        course: value,
        department: String(course?.departmentId || ""),
        semester: String(course?.semester || ""),
      }));
      return;
    }

    if (name === "group") {
      const selectedStrength = value
        ? Number(groupStrengthMap.get(String(value))) || 0
        : Number(formData.strength || 0);

      setFormData((prev) => ({
        ...prev,
        group: value,
        strength: String(selectedStrength),
      }));
      return;
    }

    if (name === "invigilators") {
      const selected = Array.from(event.target.selectedOptions || []).map((option) => option.value);
      setFormData((prev) => ({ ...prev, invigilators: selected }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdateExam = async (event) => {
    event.preventDefault();

    if (
      !formData.examName ||
      !formData.session ||
      !formData.department ||
      !formData.course ||
      !formData.semester ||
      !formData.examDate ||
      !formData.startTime
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const duration = Number(formData.durationMinutes || 0);
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error("Duration must be a positive number");
      return;
    }

    if (!selectedCourse) {
      toast.error("Invalid course selected");
      return;
    }

    const payload = {
      examName: formData.examName.trim(),
      block: formData.block,
      examType: formData.examType,
      session: formData.session.trim(),
      department: formData.department,
      program: selectedCourse?.branch || selectedCourse?.program || "GENERAL",
      semester: Number(formData.semester),
      group: formData.group || null,
      course: formData.course,
      subjectCode: selectedCourse?.code || "",
      subjectName: selectedCourse?.courseName || "",
      examDate: formData.examDate,
      startTime: formData.startTime,
      endTime: addMinutesToTime(formData.startTime, duration),
      durationMinutes: duration,
      roomNo: formData.roomNo.trim(),
      invigilators: Array.isArray(formData.invigilators) ? formData.invigilators : [],
      maxMarks: Number(formData.maxMarks || 100),
      passMarks: Number(formData.passMarks || 40),
      strength: Number(formData.strength || 0),
      status: formData.status,
    };

    try {
      setSubmitting(true);
      if (editingExamId) {
        await axios.put(`${apiBase}/admin/exam/${editingExamId}`, payload, { withCredentials: true });
        toast.success("Exam updated successfully");
      } else {
        await axios.post(`${apiBase}/admin/exam`, payload, { withCredentials: true });
        toast.success("Exam created successfully");
      }
      closeModal();
      await fetchAll();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editingExamId ? "Failed to update exam" : "Failed to create exam")
      );
    } finally {
      setSubmitting(false);
    }
  };

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
            .label { font-weight: bold; display: inline-block; width: 100px; }
          </style>
        </head>
        <body>
          <h2>Exam Sheet</h2>
          <div class="meta">
            <div><span class="label">Name:</span> ${exam.name}</div>
            <div><span class="label">Subject:</span> ${exam.subject}</div>
            <div><span class="label">Date:</span> ${exam.date}</div>
            <div><span class="label">Time:</span> ${exam.timeLabel}</div>
            <div><span class="label">Duration:</span> ${exam.duration}</div>
            <div><span class="label">Room:</span> ${exam.roomNo}</div>
            <div><span class="label">Status:</span> ${exam.status}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownload = (exam) => {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 12px; font-size: 24px; }
            .row { margin: 8px 0; }
            .label { font-weight: 700; width: 100px; display: inline-block; }
          </style>
        </head>
        <body>
          <h1>Exam Sheet</h1>
          <div class="row"><span class="label">Name:</span> ${escapeHtml(exam.name)}</div>
          <div class="row"><span class="label">Subject:</span> ${escapeHtml(exam.subject)}</div>
          <div class="row"><span class="label">Date:</span> ${escapeHtml(exam.date)}</div>
          <div class="row"><span class="label">Time:</span> ${escapeHtml(exam.timeLabel)}</div>
          <div class="row"><span class="label">Duration:</span> ${escapeHtml(exam.duration)}</div>
          <div class="row"><span class="label">Room:</span> ${escapeHtml(exam.roomNo)}</div>
          <div class="row"><span class="label">Status:</span> ${escapeHtml(exam.status)}</div>
        </body>
      </html>
    `;

    downloadPdfFromHtml(apiBase, {
      html,
      fileName: `${exam.name.replace(/\s+/g, "_")}.pdf`,
    }).catch((error) => {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    });
  };

  const handleDownloadAll = () => {
    if (!filtered.length) {
      toast.error("No exams available to download");
      return;
    }

    const rows = filtered
      .map(
        (exam, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(exam.name)}</td>
            <td>${escapeHtml(exam.subjectCode !== "-" ? `${exam.subjectCode} - ${exam.subject}` : exam.subject)}</td>
            <td>${escapeHtml(exam.date)}</td>
            <td>${escapeHtml(exam.timeLabel || "-")}</td>
            <td>${escapeHtml(exam.duration)}</td>
            <td>${escapeHtml(exam.status)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .meta { margin: 0 0 14px; color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Exam Schedule (Cumulative)</h1>
          <p class="meta">Total Exams: ${filtered.length}</p>
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
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    downloadPdfFromHtml(apiBase, {
      html,
      fileName: "All_Exams_Cumulative.pdf",
    }).catch((error) => {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    });
  };

  const handleDownloadMasterReport = () => {
    if (!normalizedMasterReport.length) {
      toast.error("No exam master records available to download");
      return;
    }

    const rows = normalizedMasterReport
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.examName)}</td>
            <td>${escapeHtml(item.subject)}</td>
            <td>${escapeHtml(item.examType)}</td>
            <td>${escapeHtml(item.session)}</td>
            <td>${escapeHtml(item.semester)}</td>
            <td>${escapeHtml(item.block)}</td>
            <td>${escapeHtml(item.invigilatorName)}</td>
            <td>${escapeHtml(item.roomNo)}</td>
            <td>${escapeHtml(item.strength)}</td>
            <td>${escapeHtml(item.date)}</td>
            <td>${escapeHtml(item.time)}</td>
            <td>${escapeHtml(item.duration)}</td>
            <td>${escapeHtml(item.status)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .meta { margin: 0 0 14px; color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Exam Master Report</h1>
          <p class="meta">Total Records: ${normalizedMasterReport.length}</p>
          <table>
            <thead>
              <tr>
                <th>S. No</th>
                <th>Exam Name</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Session</th>
                <th>Semester</th>
                <th>Block</th>
                <th>Invigilator Name</th>
                <th>Room No</th>
                <th>Strength</th>
                <th>Date</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    downloadPdfFromHtml(apiBase, {
      html,
      fileName: "Exam_Master_Report.pdf",
    }).catch((error) => {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    });
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

    const renderSectionHeader = (title) => (
      <div className="exam-card-head exam-card-head-right">
        <button
          type="button"
          className="exam-back-btn exam-back-btn-floating"
          onClick={() => setActiveSection("")}
        >
          <FiArrowLeft />
          Back
        </button>
        <h2 className="exam-card-title exam-card-title-box">{title}</h2>
      </div>
    );

    const showCards = !activeSection;

    return (
      <>
        <div className="exam-cards-grid">
          {showCards && (
            <div className="exam-section-cards">
            <button
              type="button"
              className={`exam-section-card ${activeSection === "scheduling" ? "active" : ""}`}
              onClick={() => setActiveSection("scheduling")}
            >
              <span className="exam-section-card-top">
                <strong className="exam-section-card-title">Examination Scheduling</strong>
                <span className="exam-section-card-icon">
                  <FiCalendar />
                </span>
              </span>
              <span className="exam-section-card-value">{exams.length}</span>
              <span className="exam-section-card-subtitle">Total Exams</span>
              <span className="exam-section-card-arrow" aria-hidden="true">
                <FiChevronRight />
              </span>
            </button>

            <button
              type="button"
              className={`exam-section-card ${activeSection === "masterReport" ? "active" : ""}`}
              onClick={() => {
                setActiveSection("masterReport");
                fetchExamMasterReport();
              }}
            >
              <span className="exam-section-card-top">
                <strong className="exam-section-card-title">Exam Master Report</strong>
                <span className="exam-section-card-icon">
                  <FiFileText />
                </span>
              </span>
              <span className="exam-section-card-value">{masterReportRows.length || exams.length}</span>
              <span className="exam-section-card-subtitle">All Documents</span>
              <span className="exam-section-card-arrow" aria-hidden="true">
                <FiChevronRight />
              </span>
            </button>

            <button
              type="button"
              className={`exam-section-card ${activeSection === "registration" ? "active" : ""}`}
              onClick={() => setActiveSection("registration")}
            >
              <span className="exam-section-card-top">
                <strong className="exam-section-card-title">Exam Registration</strong>
                <span className="exam-section-card-icon">
                  <FiFileText />
                </span>
              </span>
              <span className="exam-section-card-value">{normalizedRegistration.length}</span>
              <span className="exam-section-card-subtitle">Registered Exams</span>
              <span className="exam-section-card-arrow" aria-hidden="true">
                <FiChevronRight />
              </span>
            </button>

            <button
              type="button"
              className={`exam-section-card ${activeSection === "admitCards" ? "active" : ""}`}
              onClick={() => setActiveSection("admitCards")}
            >
              <span className="exam-section-card-top">
                <strong className="exam-section-card-title">Issued Admit Card</strong>
                <span className="exam-section-card-icon">
                  <FiDownload />
                </span>
              </span>
              <span className="exam-section-card-value">{normalizedAdmitCards.length}</span>
              <span className="exam-section-card-subtitle">Issued Records</span>
              <span className="exam-section-card-arrow" aria-hidden="true">
                <FiChevronRight />
              </span>
            </button>
            </div>
          )}

          {activeSection === "scheduling" && (
            <section className="exam-card">
              {renderSectionHeader("Examination Scheduling")}
              <div className="exam-card-head">
                <div className="exam-header-actions">
                  <button className="exam-download-all-btn" type="button" onClick={handleDownloadAll}>
                    Download All
                  </button>
                  <button className="exam-add-btn" type="button" onClick={openModal}>
                    + Create Exam
                  </button>
                </div>
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
                  <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                    {subjects.map((item) => (
                      <option key={item} value={item}>
                        {item}
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
                    {filtered.map((item, index) => (
                      <tr key={`${item._id || item.name}-${index}`}>
                        <td className="exam-serial-cell">{index + 1}</td>
                        <td className="exam-name">{item.name}</td>
                        <td>{`${item.subjectCode !== "-" ? `${item.subjectCode} - ` : ""}${item.subject}`}</td>
                        <td>{item.date}</td>
                        <td>{item.timeLabel || "-"}</td>
                        <td>{item.duration}</td>
                        <td>{item.status}</td>
                        <td>
                          <div className="exam-actions">
                            <button className="exam-action-btn" type="button" onClick={() => handlePrint(item)}>
                              <FiPrinter />
                              Print
                            </button>
                            <button className="exam-action-btn" type="button" onClick={() => openEditModal(exams.find((e) => e?._id === item._id) || {})}>
                              <FiEdit2 />
                              Edit
                            </button>
                            <button
                              className="exam-action-btn export"
                              type="button"
                              onClick={() => handleDownload(item)}
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
                        <td colSpan={8} className="exam-empty">
                          No exams found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === "masterReport" && (
            <section className="exam-card">
              {renderSectionHeader("Exam Master Report")}
              <div className="exam-card-head">
                <div className="exam-header-actions">
                  <button
                    className="exam-download-all-btn"
                    type="button"
                    onClick={handleDownloadMasterReport}
                    disabled={masterReportLoading}
                  >
                    Download Master Report
                  </button>
                </div>
              </div>

              {masterReportLoading ? (
                <div className="exam-master-state">Fetching exam documents...</div>
              ) : (
                <div className="exam-table-wrap">
                  <table className="exam-table">
                    <thead>
                      <tr>
                        <th className="exam-cell-serial">S. No</th>
                        <th>EXAM NAME</th>
                        <th>SUBJECT</th>
                        <th>TYPE</th>
                        <th>SESSION</th>
                        <th>SEM</th>
                        <th>BLOCK</th>
                        <th>INVIGILATOR</th>
                        <th>ROOM NO</th>
                        <th>STRENGTH</th>
                        <th>DATE</th>
                        <th>TIME</th>
                        <th>DURATION</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedMasterReport.map((item, index) => (
                        <tr key={`${item._id || item.examName}-${index}`}>
                          <td className="exam-serial-cell">{index + 1}</td>
                          <td className="exam-name">{item.examName}</td>
                          <td>{item.subject}</td>
                          <td>{item.examType}</td>
                          <td>{item.session}</td>
                          <td>{item.semester}</td>
                          <td>{item.block}</td>
                          <td>{item.invigilatorName}</td>
                          <td>{item.roomNo}</td>
                          <td>{item.strength}</td>
                          <td>{item.date}</td>
                          <td>{item.time}</td>
                          <td>{item.duration}</td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                      {normalizedMasterReport.length === 0 && (
                        <tr>
                          <td colSpan={14} className="exam-empty">
                            No exam documents found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeSection === "registration" && (
            <section className="exam-card">
              {renderSectionHeader("Exam Registration")}
              <div className="exam-table-wrap">
                <table className="exam-table">
                  <thead>
                    <tr>
                      <th className="exam-cell-serial">S. No</th>
                      <th>EXAM NAME</th>
                      <th>SUBJECT</th>
                      <th>SESSION</th>
                      <th>SEM</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedRegistration.map((item, index) => (
                      <tr key={`${item._id || item.examName}-${index}`}>
                        <td className="exam-serial-cell">{index + 1}</td>
                        <td className="exam-name">{item.examName}</td>
                        <td>{item.subject}</td>
                        <td>{item.session}</td>
                        <td>{item.semester}</td>
                        <td>{item.date}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                    {normalizedRegistration.length === 0 && (
                      <tr>
                        <td colSpan={7} className="exam-empty">
                          No exam registrations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === "admitCards" && (
            <section className="exam-card">
              {renderSectionHeader("Issued Admit Card")}
              <div className="exam-table-wrap">
                <table className="exam-table">
                  <thead>
                    <tr>
                      <th className="exam-cell-serial">S. No</th>
                      <th>EXAM NAME</th>
                      <th>SESSION</th>
                      <th>SEM</th>
                      <th>DATE</th>
                      <th>ADMIT CARD ISSUED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedAdmitCards.map((item, index) => (
                      <tr key={`${item._id || item.examName}-${index}`}>
                        <td className="exam-serial-cell">{index + 1}</td>
                        <td className="exam-name">{item.examName}</td>
                        <td>{item.session}</td>
                        <td>{item.semester}</td>
                        <td>{item.date}</td>
                        <td>{item.issued}</td>
                      </tr>
                    ))}
                    {normalizedAdmitCards.length === 0 && (
                      <tr>
                        <td colSpan={6} className="exam-empty">
                          No admit card records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {showCards &&
            activeSection !== "scheduling" &&
            activeSection !== "masterReport" &&
            activeSection !== "registration" &&
            activeSection !== "admitCards" && (
            <div className="exam-section-placeholder">
              Click on <strong>Examination Scheduling</strong>, <strong>Exam Master Report</strong>, <strong>Exam Registration</strong> or <strong>Issued Admit Card</strong> to open details.
            </div>
          )}
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
            onClick={closeModal}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="exam-modal-card">
            <div className="exam-modal-head">
              <h2>{editingExamId ? "Edit Exam" : "Create Exam"}</h2>
              <p>{editingExamId ? "Update examination details" : "Schedule a new examination"}</p>
            </div>
            <form className="exam-form" onSubmit={handleCreateOrUpdateExam}>
              <label>
                Exam Name *
                <input
                  name="examName"
                  placeholder="e.g., Data Structures - Midterm"
                  value={formData.examName}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <div className="exam-form-row">
                <label>
                  Course *
                  <select name="course" value={formData.course} onChange={handleFormChange} required>
                    <option value="" disabled>
                      Select Course
                    </option>
                    {courses.map((course) => {
                      const id = String(course?.id || course?._id || "");
                      return (
                        <option key={id} value={id}>
                          {`${course?.code || "-"} - ${course?.courseName || "Course"}`}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label>
                  Group
                  <select name="group" value={formData.group} onChange={handleFormChange}>
                    <option value="">No Group</option>
                    {filteredGroups.map((group) => (
                      <option key={group?._id} value={group?._id}>
                        {group?.name || "Group"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="exam-form-row">
                <label>
                  Session *
                  <input
                    name="session"
                    placeholder="e.g., 2025-26 ODD"
                    value={formData.session}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Semester *
                  <input
                    type="number"
                    min="1"
                    max="12"
                    name="semester"
                    value={formData.semester}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>

              <div className="exam-form-row">
                <label>
                  Date *
                  <input type="date" name="examDate" value={formData.examDate} onChange={handleFormChange} required />
                </label>
                <label>
                  Start Time *
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>

              <div className="exam-form-row">
                <label>
                  Block
                  <select name="block" value={formData.block} onChange={handleFormChange}>
                    <option value="Academic Block">Academic Block</option>
                    <option value="Pharmacy Block">Pharmacy Block</option>
                  </select>
                </label>

                <label>
                  Exam Type
                  <select name="examType" value={formData.examType} onChange={handleFormChange}>
                    {[
                      "MIDTERM",
                      "ENDSEM",
                      "PRACTICAL",
                      "BACK",
                    ].map((item) => (
                      <option key={item} value={item}>
                        {item === "ENDSEM" ? "END SEM" : item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="exam-form-row">
                <label>
                  Duration (Minutes) *
                  <input
                    type="number"
                    min="1"
                    name="durationMinutes"
                    value={formData.durationMinutes}
                    onChange={handleFormChange}
                    required
                  />
                </label>
                <label>
                  Strength
                  <input
                    type="number"
                    min="0"
                    name="strength"
                    value={formData.strength}
                    onChange={handleFormChange}
                  />
                </label>
              </div>

              <div className="exam-form-row">
                <label>
                  Room No
                  <input name="roomNo" value={formData.roomNo} onChange={handleFormChange} />
                </label>
                <label>
                  Invigilators
                  <select
                    multiple
                    name="invigilators"
                    value={formData.invigilators}
                    onChange={handleFormChange}
                  >
                    {faculty.map((item) => (
                      <option key={item?._id} value={item?._id}>
                        {item?.user?.name || item?.employeeId || "Faculty"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="exam-form-row">
                <label>
                  Max Marks
                  <input
                    type="number"
                    min="1"
                    name="maxMarks"
                    value={formData.maxMarks}
                    onChange={handleFormChange}
                  />
                </label>
                <label>
                  Pass Marks
                  <input
                    type="number"
                    min="0"
                    name="passMarks"
                    value={formData.passMarks}
                    onChange={handleFormChange}
                  />
                </label>
              </div>

              <label>
                Status
                <select name="status" value={formData.status} onChange={handleFormChange}>
                  {[
                    "SCHEDULED",
                    "ONGOING",
                    "COMPLETED",
                    "CANCELLED",
                  ].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="exam-modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting
                    ? editingExamId
                      ? "Updating..."
                      : "Creating..."
                    : editingExamId
                      ? "Update Exam"
                      : "Create Exam"}
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