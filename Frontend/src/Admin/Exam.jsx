import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiChevronRight,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiPrinter,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { TailSpin, ThreeDots } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import { useSelector, useDispatch } from "react-redux";
import "./Exam.css";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "./constants/loadStates";
import { downloadPdfFromHtml, openPdfFromHtml } from "../utils/pdfDownload";
import axios from "../utils/axiosInstance";
import toast from "react-hot-toast";
import ClipLoader from "./components/ClipLoader";
import {
  fetchExams,
  fetchExamSupportData,
  createExam,
  updateExam,
  deleteExam,
  selectExams,
  selectExamCourses,
  selectExamGroups,
  selectExamFaculty,
  selectCreateLoading,
  selectUpdateLoading,
} from "../redux/examSlice";

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

const buildUniversityReportHtml = ({
  department = "Department of Computer Science & Engineering",
  courseLine = "Course - B.Tech.",
  reportTitle = "Report",
  infoRows = [],
  headers = [],
  rows = [],
}) => {
  const headerHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const rowsHtml = rows
    .map(
      (row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
    )
    .join("");
  const infoHtml = infoRows
    .map(
      (item) =>
        `<div class="info-row"><span class="info-label">${escapeHtml(item.label)}:</span> ${escapeHtml(item.value)}</div>`
    )
    .join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: "Times New Roman", serif; color: #111827; margin: 26px; }
          .title { text-align: center; font-weight: 800; font-size: 56px; letter-spacing: 0.5px; margin: 0; }
          .dept { text-align: center; font-size: 28px; font-weight: 700; margin: 2px 0 8px; }
          .course { text-align: center; font-size: 20px; font-weight: 800; background: #fff200; border: 1px solid #111; padding: 4px 8px; margin: 0 0 8px; }
          .sheet-title { text-align: center; font-size: 24px; font-weight: 800; margin: 4px 0 10px; }
          .info-block { margin-bottom: 12px; }
          .info-row { font-size: 17px; margin: 3px 0; }
          .info-label { font-weight: 800; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
          th, td { border: 1px solid #111; padding: 8px 7px; font-size: 16px; text-align: left; vertical-align: top; }
          th { text-align: center; font-weight: 800; }
          td.center { text-align: center; }
        </style>
      </head>
      <body>
        <p class="title">HARIDWAR UNIVERSITY, ROORKEE</p>
        <p class="dept">${escapeHtml(department)}</p>
        <p class="course">${escapeHtml(courseLine)}</p>
        <p class="sheet-title">${escapeHtml(reportTitle)}</p>
        <div class="info-block">${infoHtml}</div>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
};

const Exam = () => {
  const dispatch = useDispatch();
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
  const [admitSearch, setAdmitSearch] = useState("");
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [registrationRows, setRegistrationRows] = useState([]);
  const [admitCardRows, setAdmitCardRows] = useState([]);

  // Redux state (with safe fallbacks for initial render)
  const exams = useSelector(selectExams) || [];
  const courses = useSelector(selectExamCourses) || [];
  const groups = useSelector(selectExamGroups) || [];
  const faculty = useSelector(selectExamFaculty) || [];
  const createLoading = useSelector(selectCreateLoading);
  const updateLoading = useSelector(selectUpdateLoading);

  // Derived loading state for form submission
  const submitting = createLoading || updateLoading;

  const [bulkDownloadLoading, setBulkDownloadLoading] = useState(false);
  const [masterReportDownloadLoading, setMasterReportDownloadLoading] = useState(false);
  const [examActionLoading, setExamActionLoading] = useState({
    id: "",
    action: "",
  });
  const [registrationActionLoading, setRegistrationActionLoading] = useState({
    id: "",
    action: "",
  });
  const [admitCardActionLoading, setAdmitCardActionLoading] = useState({
    id: "",
    action: "",
  });
  const [selectedAdmitCard, setSelectedAdmitCard] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  const fetchExamRegistrations = useCallback(async () => {
    const response = await axios.get(`${apiBase}/admin/exam-registration`, {
      withCredentials: true,
      params: { noCache: "true" },
    });
    setRegistrationRows(response.data?.registrations || []);
  }, [apiBase]);

  const fetchAdmitCards = useCallback(async () => {
    const response = await axios.get(`${apiBase}/admin/admit-card`, {
      withCredentials: true,
      params: { noCache: "true" },
    });
    setAdmitCardRows(response.data?.admitCards || []);
  }, [apiBase]);

  const fetchAll = useCallback(async () => {
    if (!apiBase) return;
    try {
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      await Promise.all([
        dispatch(fetchExams({ apiBase })).unwrap(),
        dispatch(fetchExamSupportData({ apiBase })).unwrap(),
        fetchExamRegistrations(),
        fetchAdmitCards(),
      ]);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      toast.error(error || "Failed to load exams");
    }
  }, [apiBase, dispatch, fetchExamRegistrations, fetchAdmitCards]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  const getExamActionKey = (exam) =>
    String(exam?._id || `${exam?.name || ""}-${exam?.date || ""}`).trim();

  const isExamActionLoading = (exam, action) =>
    examActionLoading.id === getExamActionKey(exam) &&
    examActionLoading.action === action;

  const getRegistrationActionKey = (registration) =>
    String(registration?._id || "").trim();

  const isRegistrationActionLoading = (registration, action) =>
    registrationActionLoading.id === getRegistrationActionKey(registration) &&
    registrationActionLoading.action === action;

  const getAdmitCardActionKey = (card) =>
    String(card?._id || "").trim();

  const isAdmitCardActionLoading = (card, action) =>
    admitCardActionLoading.id === getAdmitCardActionKey(card) &&
    admitCardActionLoading.action === action;

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

  const admitCardByRegistrationId = useMemo(() => {
    const map = new Map();
    admitCardRows.forEach((card) => {
      const registrationId = String(card?.registration?._id || card?.registration || "");
      if (!registrationId) return;
      map.set(registrationId, card);
    });
    return map;
  }, [admitCardRows]);

  const normalizedRegistration = useMemo(
    () =>
      registrationRows.map((registration) => {
        const linkedCard = admitCardByRegistrationId.get(String(registration?._id || ""));
        const registrationStatus = String(registration?.registrationStatus || "DRAFT").toUpperCase();
        const admitCardStatus = String(linkedCard?.issueStatus || "NOT_ISSUED").toUpperCase();

        return {
          _id: registration?._id,
          examName: registration?.exam?.examName || registration?.courseName || "-",
          subject:
            registration?.subjects?.[0]?.subjectCode && registration?.subjects?.[0]?.subjectName
              ? `${registration.subjects[0].subjectCode} - ${registration.subjects[0].subjectName}`
              : registration?.exam?.subjectName ||
                registration?.courseName ||
                registration?.exam?.course?.courseName ||
                "-",
          session: registration?.exam?.session || registration?.academicSession || "-",
          semester: registration?.semester ?? registration?.exam?.semester ?? "-",
          date: formatDate(registration?.exam?.examDate || registration?.createdAt),
          status: registrationStatus,
          candidateName: registration?.candidateName || registration?.student?.user?.name || "-",
          rollNo: registration?.rollNo || "-",
          enrollmentNumber: registration?.enrollmentNumber || registration?.student?.enrollmentNumber || "-",
          rejectionReason: registration?.rejectionReason || "",
          admitCardStatus,
          hasIssuedAdmitCard: admitCardStatus === "ISSUED",
          raw: registration,
        };
      }),
    [registrationRows, admitCardByRegistrationId]
  );

  const filteredRegistrations = useMemo(() => {
    const query = String(registrationSearch || "").trim().toLowerCase();
    if (!query) return normalizedRegistration;
    return normalizedRegistration.filter((item) => {
      const haystack = `${item.examName} ${item.subject} ${item.session} ${item.semester} ${item.candidateName} ${item.rollNo} ${item.enrollmentNumber} ${item.status} ${item.admitCardStatus}`
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [registrationSearch, normalizedRegistration]);

  const normalizedAdmitCards = useMemo(
    () =>
      admitCardRows.map((card) => ({
        _id: card?._id,
        admitCardNo: card?.admitCardNo || "-",
        examName: card?.exam?.examName || "-",
        candidateName: card?.snapshot?.candidateName || card?.registration?.candidateName || "-",
        rollNo: card?.snapshot?.rollNo || card?.registration?.rollNo || "-",
        session: card?.exam?.session || "-",
        semester: card?.snapshot?.semester ?? card?.exam?.semester ?? "-",
        date: formatDate(card?.exam?.examDate),
        issueStatus: String(card?.issueStatus || "").toUpperCase() || "PENDING",
        raw: card,
      })),
    [admitCardRows]
  );

  const admitCardsLoadState = useMemo(() => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) return ADMIN_LOAD_STATES.PENDING;
    if (loadState === ADMIN_LOAD_STATES.FAILURE) return ADMIN_LOAD_STATES.FAILURE;
    return ADMIN_LOAD_STATES.SUCCESS;
  }, [loadState]);

  const admitCardsLoadStateText =
    ADMIN_LOAD_STATE_OPTIONS.find((option) => option.id === admitCardsLoadState)?.text || "Unknown";

  const filteredAdmitCards = useMemo(() => {
    const query = String(admitSearch || "")
      .trim()
      .toLowerCase();

    if (!query) return normalizedAdmitCards;

    return normalizedAdmitCards.filter((item) => {
      const haystack = `${item.admitCardNo} ${item.examName} ${item.candidateName} ${item.rollNo} ${item.session} ${item.semester} ${item.date} ${item.issueStatus}`
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [admitSearch, normalizedAdmitCards]);

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
      if (editingExamId) {
        await dispatch(updateExam({ apiBase, id: editingExamId, payload })).unwrap();
        toast.success("Exam updated successfully");
      } else {
        await dispatch(createExam({ apiBase, payload })).unwrap();
        toast.success("Exam created successfully");
      }
      closeModal();
    } catch (error) {
      toast.error(
        error || (editingExamId ? "Failed to update exam" : "Failed to create exam")
      );
    }
  };

  /* ================= DELETE EXAM ================= */
  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`Delete exam "${exam?.name || exam?.examName}"?`)) return;

    const id = exam?._id;
    if (!id) return;

    setDeletingId(id);
    try {
      await dispatch(deleteExam({ apiBase, id, hardDelete: true })).unwrap();
      toast.success("Exam deleted successfully");
    } catch (error) {
      toast.error(error || "Failed to delete exam");
    } finally {
      setDeletingId(null);
    }
  };

  const refreshRegistrationAndAdmit = useCallback(async () => {
    await Promise.all([fetchExamRegistrations(), fetchAdmitCards()]);
  }, [fetchExamRegistrations, fetchAdmitCards]);

  const withRegistrationAction = async (registration, action, runner) => {
    const actionKey = getRegistrationActionKey(registration);
    if (!actionKey) return;
    setRegistrationActionLoading({ id: actionKey, action });
    try {
      await runner();
      await refreshRegistrationAndAdmit();
    } finally {
      setRegistrationActionLoading({ id: "", action: "" });
    }
  };

  const handleVerifyRegistration = async (registration) => {
    if (!registration?._id) return;
    await withRegistrationAction(registration, "verify", async () => {
      await axios.put(
        `${apiBase}/admin/exam-registration/${registration._id}`,
        { registrationStatus: "VERIFIED", rejectionReason: "" },
        { withCredentials: true }
      );
      toast.success("Registration verified");
    }).catch((error) => {
      toast.error(error?.response?.data?.message || "Failed to verify registration");
    });
  };

  const handleRejectRegistration = async (registration) => {
    if (!registration?._id) return;
    const reason = window.prompt(
      "Enter rejection reason",
      registration?.rejectionReason || ""
    );
    if (reason === null) return;
    if (!String(reason).trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    await withRegistrationAction(registration, "reject", async () => {
      await axios.put(
        `${apiBase}/admin/exam-registration/${registration._id}`,
        { registrationStatus: "REJECTED", rejectionReason: String(reason).trim() },
        { withCredentials: true }
      );
      toast.success("Registration rejected");
    }).catch((error) => {
      toast.error(error?.response?.data?.message || "Failed to reject registration");
    });
  };

  const handleEditRegistration = async (registration) => {
    if (!registration?._id) return;
    const nextCandidateName = window.prompt(
      "Candidate name",
      registration?.candidateName || ""
    );
    if (nextCandidateName === null) return;

    const nextMobile = window.prompt(
      "Mobile number (10 digits)",
      registration?.raw?.mobileNumber || ""
    );
    if (nextMobile === null) return;

    const nextCentre = window.prompt(
      "Examination centre",
      registration?.raw?.examinationCentre || ""
    );
    if (nextCentre === null) return;

    await withRegistrationAction(registration, "edit", async () => {
      await axios.put(
        `${apiBase}/admin/exam-registration/${registration._id}`,
        {
          candidateName: String(nextCandidateName || "").trim(),
          mobileNumber: String(nextMobile || "").trim(),
          examinationCentre: String(nextCentre || "").trim(),
        },
        { withCredentials: true }
      );
      toast.success("Registration updated");
    }).catch((error) => {
      toast.error(error?.response?.data?.message || "Failed to update registration");
    });
  };

  const handleDeleteRegistration = async (registration) => {
    if (!registration?._id) return;
    const ok = window.confirm(
      `Delete registration for ${registration?.candidateName || "this student"}?`
    );
    if (!ok) return;
    await withRegistrationAction(registration, "delete", async () => {
      await axios.patch(
        `${apiBase}/admin/exam-registration/${registration._id}/delete`,
        {},
        { withCredentials: true }
      );
      toast.success("Registration deleted");
    }).catch((error) => {
      toast.error(error?.response?.data?.message || "Failed to delete registration");
    });
  };

  const handleIssueAdmitCard = async (registration) => {
    if (!registration?._id) return;
    if (registration?.status !== "VERIFIED") {
      toast.error("Only verified registrations can be issued admit cards");
      return;
    }
    await withRegistrationAction(registration, "issue", async () => {
      await axios.post(
        `${apiBase}/admin/admit-card/issue/${registration._id}`,
        {
          isEligible: true,
          paidPercent: 100,
          thresholdPercent: 75,
          source: "MANUAL",
        },
        { withCredentials: true }
      );
      toast.success("Admit card issued successfully");
    }).catch((error) => {
      toast.error(error?.response?.data?.message || "Failed to issue admit card");
    });
  };

  const refreshAdmitCardsOnly = useCallback(async () => {
    await fetchAdmitCards();
  }, [fetchAdmitCards]);

  const withAdmitCardAction = async (card, action, runner) => {
    const actionKey = getAdmitCardActionKey(card);
    if (!actionKey) return;
    setAdmitCardActionLoading({ id: actionKey, action });
    try {
      await runner();
      await refreshAdmitCardsOnly();
    } finally {
      setAdmitCardActionLoading({ id: "", action: "" });
    }
  };

  const handleViewAdmitCard = async (card) => {
    if (!card?._id) return;
    await withAdmitCardAction(card, "view", async () => {
      const response = await axios.get(`${apiBase}/admin/admit-card/${card._id}`, {
        withCredentials: true,
      });
      const admitCard = response.data?.admitCard || null;
      if (!admitCard) {
        throw new Error("Admit card not found");
      }

      const snapshot = admitCard?.snapshot || {};
      const exam = admitCard?.exam || {};
      const sessionLabel = String(snapshot?.examSession || exam?.session || "").trim();
      const semesterLabel = String(snapshot?.semester ?? "").trim();
      const semesterHeading = semesterLabel ? `${semesterLabel} SEMESTER` : "SEMESTER";
      const photoUrl = String(
        admitCard?.registration?.photoUrl || snapshot?.photoUrl || ""
      ).trim();
      const subjectRows = Array.isArray(snapshot?.subjects)
        ? snapshot.subjects
            .map(
              (subject) => `
                <tr>
                  <td>${escapeHtml(subject?.subjectName || "-")}</td>
                  <td>${escapeHtml(subject?.subjectCode || "-")}</td>
                </tr>
              `
            )
            .join("")
        : "";

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Admit Card</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 8px; }
              .admit-wrap { border: 2px solid #94a3b8; max-width: 1180px; margin: 0 auto; }
              .hu-title {
                font-size: 38px;
                line-height: 1;
                letter-spacing: 1px;
                text-align: center;
                color: #16a8d9;
                font-weight: 700;
                padding: 8px 8px 4px;
                border-bottom: 2px solid #94a3b8;
              }
              .hu-subtitle {
                text-align: center;
                padding: 4px 8px 6px;
                border-bottom: 2px solid #94a3b8;
              }
              .hu-subtitle .line1 { font-size: 24px; font-weight: 700; color: #f39c34; }
              .hu-subtitle .line2 { font-size: 16px; font-weight: 700; color: #9ca327; margin-top: 1px; }
              table { width: 100%; border-collapse: collapse; }
              .grid td, .grid th {
                border: 2px solid #94a3b8;
                padding: 4px 6px;
                vertical-align: top;
                font-size: 12px;
                color: #1e293b;
              }
              .lbl { color: #6b7280; font-weight: 700; margin-right: 4px; }
              .val { color: #0e7490; font-weight: 700; }
              .photo-box {
                width: 100%;
                min-height: 180px;
                border: 2px solid #6b7280;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background: #ffffff;
              }
              .photo-box img { width: 100%; height: 180px; object-fit: cover; }
              .photo-placeholder { font-size: 11px; color: #64748b; text-align: center; }
              .subject-head { font-weight: 700; color: #0e7490; text-align: center; }
              .subject-table td, .subject-table th { border: 2px solid #94a3b8; padding: 4px 6px; font-size: 11px; }
              .subject-table th { color: #0e7490; font-weight: 700; background: #f8fafc; }
              .signature-area {
                min-height: 70px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #64748b;
                font-size: 11px;
                border-bottom: 2px solid #94a3b8;
              }
              .controller { text-align: center; font-size: 12px; color: #0e7490; font-weight: 700; padding: 6px; }
              .small { font-size: 11px; color: #64748b; line-height: 1.3; }
            </style>
          </head>
          <body>
            <div class="admit-wrap">
              <div class="hu-title">HARIDWAR UNIVERSITY, ROORKEE</div>
              <div class="hu-subtitle">
                <div class="line1">ADMIT CARD</div>
                <div class="line2">${escapeHtml(`${semesterHeading} EXAMINATION (SESSION - ${sessionLabel || "-"})`)}</div>
              </div>

              <table class="grid">
                <tr>
                  <td style="width:43%;">
                    <span class="lbl">Name of the Candidate :</span>
                    <span class="val">${escapeHtml(snapshot?.candidateName || "-")}</span>
                  </td>
                  <td style="width:37%;">
                    <span class="lbl">Father's Name :</span>
                    <span class="val">${escapeHtml(snapshot?.fatherName || "-")}</span>
                  </td>
                  <td rowspan="5" style="width:21%;">
                    <div class="photo-box">
                      ${
                        photoUrl
                          ? `<img src="${escapeHtml(photoUrl)}" alt="Student" />`
                          : `<div class="photo-placeholder">Photo not available</div>`
                      }
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="lbl">Course :</span>
                    <span class="val">${escapeHtml(`${snapshot?.courseName || "-"} (Semester ${snapshot?.semester ?? "-"})`)}</span>
                  </td>
                  <td>
                    <span class="lbl">Roll No:</span>
                    <span class="val">${escapeHtml(snapshot?.rollNo || "-")}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="lbl">Branch :</span>
                    <span class="val">${escapeHtml(snapshot?.branchName || "-")}</span>
                  </td>
                  <td>
                    <span class="lbl">Year:</span>
                    <span class="val">${escapeHtml(String(snapshot?.year ?? "-"))}</span>
                    <span class="lbl" style="margin-left:14px;">Semester:</span>
                    <span class="val">${escapeHtml(String(snapshot?.semester ?? "-"))}</span>
                    <span class="lbl" style="margin-left:14px;">Group:</span>
                    <span class="val">${escapeHtml(snapshot?.groupName || "-")}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="lbl">Batch :</span>
                    <span class="val">${escapeHtml(snapshot?.batchLabel || "-")}</span>
                  </td>
                  <td rowspan="2">
                    <span class="lbl">Examination Centre :</span><br />
                    <span class="val">${escapeHtml(snapshot?.examinationCentre || "-")}</span>
                    <div style="height:8px;"></div>
                    <span class="lbl">Admit Card No :</span>
                    <span class="val">${escapeHtml(admitCard?.admitCardNo || "-")}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <table class="subject-table" style="width:100%; border-collapse: collapse;">
                      <thead>
                        <tr>
                          <th colspan="2" class="subject-head">Subjects</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${subjectRows || '<tr><td colspan="2">No subjects found</td></tr>'}
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:0;">
                    <div class="signature-area"></div>
                    <div class="controller">Controller of Examination</div>
                  </td>
                  <td>
                    <div class="small"><strong>Issue Status:</strong> ${escapeHtml(String(admitCard?.issueStatus || "-").toUpperCase())}</div>
                    <div class="small"><strong>Exam Date:</strong> ${escapeHtml(formatDate(exam?.examDate))}</div>
                    <div class="small"><strong>Timing:</strong> ${escapeHtml(
                      exam?.startTime && exam?.endTime
                        ? `${formatTime12(exam.startTime)} - ${formatTime12(exam.endTime)}`
                        : formatTime12(exam?.startTime || "")
                    )}</div>
                  </td>
                </tr>
              </table>
            </div>
          </body>
        </html>
      `;

      await openPdfFromHtml(apiBase, {
        html,
        fileName: `${admitCard?.admitCardNo || "admit-card"}.pdf`,
      });
      setSelectedAdmitCard(admitCard);
    }).catch((error) => {
      toast.error(error?.response?.data?.message || error?.message || "Failed to open admit card");
    });
  };

  const handleHoldAdmitCard = async (card) => {
    if (!card?._id) return;
    const reason = window.prompt("Enter hold reason (optional)", "");
    if (reason === null) return;
    await withAdmitCardAction(card, "hold", async () => {
      await axios.patch(
        `${apiBase}/admin/admit-card/${card._id}/hold`,
        { holdReason: String(reason || "").trim() },
        { withCredentials: true }
      );
      toast.success("Admit card moved to hold");
    }).catch((error) => {
      toast.error(error?.response?.data?.message || "Failed to hold admit card");
    });
  };

  const handleCancelAdmitCard = async (card) => {
    if (!card?._id) return;
    const ok = window.confirm(`Cancel admit card ${card?.admitCardNo || ""}?`);
    if (!ok) return;
    await withAdmitCardAction(card, "cancel", async () => {
      await axios.patch(
        `${apiBase}/admin/admit-card/${card._id}/cancel`,
        {},
        { withCredentials: true }
      );
      toast.success("Admit card cancelled");
    }).catch((error) => {
      toast.error(error?.response?.data?.message || "Failed to cancel admit card");
    });
  };

  const handleDeleteAdmitCard = async (card) => {
    if (!card?._id) return;
    const ok = window.confirm(`Delete admit card ${card?.admitCardNo || ""}?`);
    if (!ok) return;
    await withAdmitCardAction(card, "delete", async () => {
      await axios.patch(
        `${apiBase}/admin/admit-card/${card._id}/delete`,
        {},
        { withCredentials: true }
      );
      toast.success("Admit card deleted");
    }).catch((error) => {
      toast.error(error?.response?.data?.message || "Failed to delete admit card");
    });
  };

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

    frameWindow.onafterprint = cleanup;
    frameWindow.document.open();
    frameWindow.document.write(htmlContent);
    frameWindow.document.close();

    fallbackTimer = window.setTimeout(cleanup, 1500);

    window.setTimeout(() => {
      try {
        if (title) frameWindow.document.title = title;
        frameWindow.focus();
        frameWindow.print();
      } catch {
        cleanup();
      }
    }, 120);
  };

  const handlePrint = (exam) => {
    const actionKey = getExamActionKey(exam);
    if (!actionKey || isExamActionLoading(exam, "print")) return;

    setExamActionLoading({ id: actionKey, action: "print" });
    const html = `
      <html>
        <head>
          <title>Exam Sheet</title>
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

    printWithHiddenFrame({
      title: `Exam Sheet - ${exam.name || "Exam"}`,
      htmlContent: html,
      onComplete: () => setExamActionLoading({ id: "", action: "" }),
    });
  };

  const handleDownload = async (exam) => {
    const actionKey = getExamActionKey(exam);
    if (!actionKey || isExamActionLoading(exam, "download")) return;

    setExamActionLoading({ id: actionKey, action: "download" });
    const html = buildUniversityReportHtml({
      courseLine: `Course - ${exam.subject || "-"}`,
      reportTitle: "Unit Test Award Sheet",
      infoRows: [
        { label: "Subject Name with Code", value: exam.subjectCode !== "-" ? `${exam.subjectCode} - ${exam.subject}` : exam.subject },
        { label: "Exam", value: exam.name || "-" },
        { label: "Faculty Name", value: "-" },
        { label: "Total Marks", value: "-" },
      ],
      headers: ["S. No", "Exam Name", "Subject", "Date", "Time", "Duration", "Status"],
      rows: [[
        "1",
        exam.name || "-",
        exam.subjectCode !== "-" ? `${exam.subjectCode} - ${exam.subject}` : exam.subject,
        exam.date || "-",
        exam.timeLabel || "-",
        exam.duration || "-",
        exam.status || "-",
      ]],
    });

    try {
      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: `${exam.name.replace(/\s+/g, "_")}.pdf`,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    } finally {
      setExamActionLoading({ id: "", action: "" });
    }
  };

  const handleDownloadAll = async () => {
    if (bulkDownloadLoading) return;
    if (!filtered.length) {
      toast.error("No exams available to download");
      return;
    }

    const rows = filtered.map((exam, index) => [
      String(index + 1),
      exam.name || "-",
      exam.subjectCode !== "-" ? `${exam.subjectCode} - ${exam.subject}` : exam.subject,
      exam.date || "-",
      exam.timeLabel || "-",
      exam.duration || "-",
      exam.status || "-",
    ]);

    const html = buildUniversityReportHtml({
      courseLine: "Course - All Scheduled Exams",
      reportTitle: "Unit Test Award Sheet",
      infoRows: [
        { label: "Subject Name with Code", value: "Multiple Subjects" },
        { label: "Exam", value: "Cumulative Exam Schedule" },
        { label: "Faculty Name", value: "N/A" },
        { label: "Total Marks", value: "N/A" },
      ],
      headers: ["S. No", "Exam Name", "Subject", "Date", "Time", "Duration", "Status"],
      rows,
    });

    try {
      setBulkDownloadLoading(true);
      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: "All_Exams_Cumulative.pdf",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    } finally {
      setBulkDownloadLoading(false);
    }
  };

  const handleDownloadMasterReport = async () => {
    if (masterReportDownloadLoading) return;
    if (!normalizedMasterReport.length) {
      toast.error("No exam master records available to download");
      return;
    }

    const rows = normalizedMasterReport.map((item, index) => [
      String(index + 1),
      item.examName || "-",
      item.subject || "-",
      item.examType || "-",
      item.session || "-",
      item.semester || "-",
      item.block || "-",
      item.invigilatorName || "-",
      item.roomNo || "-",
      item.strength || "-",
      item.date || "-",
      item.time || "-",
      item.duration || "-",
      item.status || "-",
    ]);

    const html = buildUniversityReportHtml({
      courseLine: "Course - Exam Master Report",
      reportTitle: "Unit Test Award Sheet",
      infoRows: [
        { label: "Subject Name with Code", value: "Multiple Subjects" },
        { label: "Subject Faculty Name", value: "Multiple Invigilators" },
        { label: "Exam", value: "Master Report" },
        { label: "Total Marks", value: "N/A" },
      ],
      headers: [
        "S. No",
        "Exam Name",
        "Subject",
        "Type",
        "Session",
        "Semester",
        "Block",
        "Invigilator Name",
        "Room No",
        "Strength",
        "Date",
        "Time",
        "Duration",
        "Status",
      ],
      rows,
    });

    try {
      setMasterReportDownloadLoading(true);
      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: "Exam_Master_Report.pdf",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    } finally {
      setMasterReportDownloadLoading(false);
    }
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="exam-state pending app-loader-state">
          <ThreeDots
            visible
            height={52}
            width={84}
            color="#2563eb"
            radius={8}
            ariaLabel="exam-loading"
          />
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
                  <button
                    className="exam-download-all-btn admin-btn-with-loader"
                    type="button"
                    onClick={handleDownloadAll}
                    disabled={bulkDownloadLoading || !filtered.length}
                  >
                    {bulkDownloadLoading ? (
                      <>
                        <ClipLoader
                          size={15}
                          color="#1d4ed8"
                          trackColor="rgba(29, 78, 216, 0.25)"
                        />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <FiDownload />
                        <span>Download All</span>
                      </>
                    )}
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
                            <button
                              className="exam-action-btn admin-btn-with-loader"
                              type="button"
                              onClick={() => handlePrint(item)}
                              disabled={isExamActionLoading(item, "print")}
                            >
                              {isExamActionLoading(item, "print") ? (
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
                              className="exam-action-btn"
                              type="button"
                              onClick={() => openEditModal(exams.find((e) => e?._id === item._id) || {})}
                            >
                              <FiEdit2 />
                              Edit
                            </button>
                            <button
                              className="exam-action-btn export admin-btn-with-loader"
                              type="button"
                              onClick={() => handleDownload(item)}
                              disabled={isExamActionLoading(item, "download")}
                            >
                              {isExamActionLoading(item, "download") ? (
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
                            <button
                              className="exam-action-btn delete admin-btn-with-loader"
                              type="button"
                              onClick={() => handleDeleteExam(item)}
                              disabled={deletingId === item._id}
                            >
                              {deletingId === item._id ? (
                                <>
                                  <TailSpin
                                    height="14"
                                    width="14"
                                    color="#dc2626"
                                    ariaLabel="deleting"
                                  />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <FiTrash2 />
                                  <span>Delete</span>
                                </>
                              )}
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
                    className="exam-download-all-btn admin-btn-with-loader"
                    type="button"
                    onClick={handleDownloadMasterReport}
                    disabled={masterReportLoading || masterReportDownloadLoading}
                  >
                    {masterReportDownloadLoading ? (
                      <>
                        <ClipLoader
                          size={15}
                          color="#1d4ed8"
                          trackColor="rgba(29, 78, 216, 0.25)"
                        />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <FiDownload />
                        <span>Download Master Report</span>
                      </>
                    )}
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
              <div className="exam-card-head exam-card-head-left exam-admit-head exam-registration-head">
                <button
                  type="button"
                  className="exam-back-btn"
                  onClick={() => setActiveSection("")}
                >
                  <FiArrowLeft />
                  Back
                </button>
                <h2 className="exam-card-title exam-card-title-box">Exam Registration</h2>
                <div className="exam-admit-meta">
                  <span className={`exam-load-chip ${admitCardsLoadState}`}>
                    {admitCardsLoadStateText}
                  </span>
                  <span>{filteredRegistrations.length} request(s)</span>
                </div>
              </div>
              <div className="exam-admit-toolbar" style={{ marginBottom: 12 }}>
                <label className="exam-search">
                  <span className="exam-search-icon" aria-hidden="true">
                    <FiSearch />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by student, roll no, enrollment, exam..."
                    value={registrationSearch}
                    onChange={(event) => setRegistrationSearch(event.target.value)}
                  />
                </label>

                <button
                  className="exam-download-all-btn admin-btn-with-loader exam-admit-refresh-btn"
                  type="button"
                  onClick={refreshRegistrationAndAdmit}
                  disabled={admitCardsLoadState === ADMIN_LOAD_STATES.PENDING}
                >
                  Refresh
                </button>
              </div>
              <div className="exam-table-wrap">
                <table className="exam-table">
                  <thead>
                    <tr>
                      <th className="exam-cell-serial">S. No</th>
                      <th>STUDENT</th>
                      <th>ROLL NO</th>
                      <th>ENROLLMENT</th>
                      <th>EXAM NAME</th>
                      <th>SUBJECT</th>
                      <th>SESSION</th>
                      <th>SEM</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                      <th>ADMIT CARD</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((item, index) => (
                      <tr key={`${item._id || item.examName}-${index}`}>
                        <td className="exam-serial-cell">{index + 1}</td>
                        <td className="exam-name">{item.candidateName}</td>
                        <td>{item.rollNo}</td>
                        <td>{item.enrollmentNumber}</td>
                        <td className="exam-name">{item.examName}</td>
                        <td>{item.subject}</td>
                        <td>{item.session}</td>
                        <td>{item.semester}</td>
                        <td>{item.date}</td>
                        <td>{item.status}</td>
                        <td>{item.admitCardStatus}</td>
                        <td>
                          <div className="exam-actions">
                            <button
                              type="button"
                              className="exam-action-btn export"
                              onClick={() => handleVerifyRegistration(item)}
                              disabled={
                                isRegistrationActionLoading(item, "verify") || item.status === "VERIFIED"
                              }
                            >
                              {isRegistrationActionLoading(item, "verify") ? "Verifying..." : "Verify"}
                            </button>
                            <button
                              type="button"
                              className="exam-action-btn delete"
                              onClick={() => handleRejectRegistration(item)}
                              disabled={isRegistrationActionLoading(item, "reject")}
                            >
                              {isRegistrationActionLoading(item, "reject") ? "Rejecting..." : "Reject"}
                            </button>
                            <button
                              type="button"
                              className="exam-action-btn"
                              onClick={() => handleEditRegistration(item)}
                              disabled={isRegistrationActionLoading(item, "edit")}
                            >
                              {isRegistrationActionLoading(item, "edit") ? "Updating..." : "Edit"}
                            </button>
                            <button
                              type="button"
                              className="exam-action-btn export"
                              onClick={() => handleIssueAdmitCard(item)}
                              disabled={
                                isRegistrationActionLoading(item, "issue") ||
                                item.status !== "VERIFIED" ||
                                item.hasIssuedAdmitCard
                              }
                            >
                              {isRegistrationActionLoading(item, "issue")
                                ? "Issuing..."
                                : item.hasIssuedAdmitCard
                                  ? "Issued"
                                  : "Issue Admit"}
                            </button>
                            <button
                              type="button"
                              className="exam-action-btn delete"
                              onClick={() => handleDeleteRegistration(item)}
                              disabled={isRegistrationActionLoading(item, "delete")}
                            >
                              {isRegistrationActionLoading(item, "delete") ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRegistrations.length === 0 && (
                      <tr>
                        <td colSpan={12} className="exam-empty">
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
            <section className="exam-card exam-card-admit">
              <div className="exam-admit-sticky-top">
                <div className="exam-card-head exam-card-head-left exam-admit-head">
                  <button
                    type="button"
                    className="exam-back-btn"
                    onClick={() => setActiveSection("")}
                  >
                    <FiArrowLeft />
                    Back
                  </button>
                  <h2 className="exam-card-title exam-card-title-box">Issued Admit Card</h2>
                  <div className="exam-admit-meta">
                    <span className={`exam-load-chip ${admitCardsLoadState}`}>
                      {admitCardsLoadStateText}
                    </span>
                    <span>{filteredAdmitCards.length} record(s)</span>
                  </div>
                </div>

                <div className="exam-admit-toolbar">
                  <label className="exam-search">
                    <span className="exam-search-icon" aria-hidden="true">
                      <FiSearch />
                    </span>
                    <input
                      type="text"
                      placeholder="Search by exam name, session, semester, date..."
                      value={admitSearch}
                      onChange={(event) => setAdmitSearch(event.target.value)}
                    />
                  </label>

                  <button
                    className="exam-download-all-btn admin-btn-with-loader exam-admit-refresh-btn"
                    type="button"
                    onClick={refreshAdmitCardsOnly}
                    disabled={admitCardsLoadState === ADMIN_LOAD_STATES.PENDING}
                  >
                    {admitCardsLoadState === ADMIN_LOAD_STATES.PENDING ? (
                      <ClipLoader
                        size={15}
                        color="#1d4ed8"
                        trackColor="rgba(29, 78, 216, 0.25)"
                      />
                    ) : (
                      "Refresh"
                    )}
                  </button>
                </div>
              </div>

              <div className="exam-table-wrap exam-admit-table-wrap">
                {admitCardsLoadState === ADMIN_LOAD_STATES.PENDING ? (
                  <div className="exam-master-state exam-admit-loading">
                    <ThreeDots
                      visible
                      height={44}
                      width={74}
                      color="#2563eb"
                      radius={8}
                      ariaLabel="admit-cards-loading"
                    />
                  </div>
                ) : admitCardsLoadState === ADMIN_LOAD_STATES.FAILURE ? (
                  <div className="exam-master-state">Failed to load admit card records.</div>
                ) : (
                  <table className="exam-table">
                    <thead>
                      <tr>
                        <th className="exam-cell-serial">S. No</th>
                        <th>ADMIT CARD NO</th>
                        <th>STUDENT</th>
                        <th>ROLL NO</th>
                        <th>EXAM NAME</th>
                        <th>SESSION</th>
                        <th>SEM</th>
                        <th>DATE</th>
                        <th>ISSUE STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdmitCards.map((item, index) => (
                        <tr key={`${item._id || item.examName}-${index}`}>
                          <td className="exam-serial-cell">{index + 1}</td>
                          <td>{item.admitCardNo}</td>
                          <td className="exam-name">{item.candidateName}</td>
                          <td>{item.rollNo}</td>
                          <td className="exam-name">{item.examName}</td>
                          <td>{item.session}</td>
                          <td>{item.semester}</td>
                          <td>{item.date}</td>
                          <td>{item.issueStatus}</td>
                          <td>
                            <div className="exam-actions">
                              <button
                                type="button"
                                className="exam-action-btn"
                                onClick={() => handleViewAdmitCard(item)}
                                disabled={isAdmitCardActionLoading(item, "view")}
                              >
                                {isAdmitCardActionLoading(item, "view") ? "Loading..." : "View"}
                              </button>
                              <button
                                type="button"
                                className="exam-action-btn export"
                                onClick={() => handleHoldAdmitCard(item)}
                                disabled={
                                  isAdmitCardActionLoading(item, "hold") ||
                                  item.issueStatus === "CANCELLED"
                                }
                              >
                                {isAdmitCardActionLoading(item, "hold") ? "Holding..." : "Hold"}
                              </button>
                              <button
                                type="button"
                                className="exam-action-btn delete"
                                onClick={() => handleCancelAdmitCard(item)}
                                disabled={
                                  isAdmitCardActionLoading(item, "cancel") ||
                                  item.issueStatus === "CANCELLED"
                                }
                              >
                                {isAdmitCardActionLoading(item, "cancel") ? "Cancelling..." : "Cancel"}
                              </button>
                              <button
                                type="button"
                                className="exam-action-btn delete"
                                onClick={() => handleDeleteAdmitCard(item)}
                                disabled={isAdmitCardActionLoading(item, "delete")}
                              >
                                {isAdmitCardActionLoading(item, "delete") ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredAdmitCards.length === 0 && (
                        <tr>
                          <td colSpan={10} className="exam-empty">
                            No admit card records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              {selectedAdmitCard && (
                <div className="exam-master-state" style={{ marginTop: 12 }}>
                  <strong>Selected Admit Card:</strong>{" "}
                  {selectedAdmitCard?.admitCardNo || "-"} |{" "}
                  {selectedAdmitCard?.snapshot?.candidateName || "-"} |{" "}
                  {selectedAdmitCard?.snapshot?.rollNo || "-"} |{" "}
                  {String(selectedAdmitCard?.issueStatus || "").toUpperCase()}
                </div>
              )}
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
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary admin-btn-with-loader"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <ClipLoader size={15} />
                      <span>{editingExamId ? "Updating..." : "Creating..."}</span>
                    </>
                  ) : (
                    <span>{editingExamId ? "Update Exam" : "Create Exam"}</span>
                  )}
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
