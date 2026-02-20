import React, { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiDownload, FiEdit2, FiSearch, FiXCircle } from "react-icons/fi";
import React, { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiDownload, FiEdit2, FiSearch, FiXCircle } from "react-icons/fi";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import "./Result.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import ClipLoader from "./components/ClipLoader";

const round2 = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};

const formatDate = (value) => {
  if (!value) return "-";
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return "-";
  return dateObj.toISOString().slice(0, 10);
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const emptySubjectRow = {
  course: "",
  examType: "MIDTERM",
  marksObtained: "",
  maxMarks: "100",
  grade: "",
  gradePoint: "",
  status: "PASS",
  attemptNo: "1",
  isBackPaper: false,
  isClearedBack: false,
};

const toExamTypeLabel = (value = "MIDTERM") => {
  const upper = String(value || "MIDTERM").toUpperCase();
  if (upper === "ENDSEM" || upper === "ENDTERM") return "END SEM";
  return upper;
};
import axios from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { downloadPdfFromHtml } from "../utils/pdfDownload";

const round2 = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};

const formatDate = (value) => {
  if (!value) return "-";
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return "-";
  return dateObj.toISOString().slice(0, 10);
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const emptySubjectRow = {
  course: "",
  examType: "MIDTERM",
  marksObtained: "",
  maxMarks: "100",
  grade: "",
  gradePoint: "",
  status: "PASS",
  attemptNo: "1",
  isBackPaper: false,
  isClearedBack: false,
};

const toExamTypeLabel = (value = "MIDTERM") => {
  const upper = String(value || "MIDTERM").toUpperCase();
  if (upper === "ENDSEM" || upper === "ENDTERM") return "END SEM";
  return upper;
};

const Result = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [department, setDepartment] = useState("All");
  const [group, setGroup] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.PENDING);
  const [results, setResults] = useState([]);

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingResultId, setEditingResultId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingResultId, setDownloadingResultId] = useState(null);
  const [formData, setFormData] = useState({
    student: "",
    academicYear: "",
    semester: "",
    resultDate: "",
    publishStatus: "DRAFT",
    subjects: [{ ...emptySubjectRow }],
  });

  const apiBase = useSelector((state) => state.config.apiBase);

  const fetchAll = async () => {
    try {
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      const [resultRes, studentRes, courseRes] = await Promise.all([
        axios.get(`${apiBase}/admin/result`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { full: "true", noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/course`, { withCredentials: true, params: { noCache: "true" } }),
      ]);

      setResults(resultRes.data?.results || []);
      setStudents(studentRes.data?.students || []);
      setCourses(courseRes.data?.courses || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      toast.error(error.response?.data?.message || "Failed to load results");
    }
  };

  useEffect(() => {
    if (!apiBase) return;
    fetchAll();
  }, [apiBase]);

  const normalized = useMemo(
    () =>
      results.map((item) => ({
        _id: item?._id,
        studentName: item?.student?.user?.name || "-",
        enrollmentNumber: item?.student?.enrollmentNumber || "-",
        semester: item?.semester ?? "-",
        semesterValue: String(item?.semester ?? ""),
        academicYear: item?.academicYear || "-",
        departmentId: String(item?.department?._id || item?.department || ""),
        departmentName: item?.department?.name || "-",
        groupId: String(item?.group?._id || item?.group || ""),
        groupName: item?.group?.name || "-",
        sgpa: round2(item?.semesterSummary?.sgpa),
        cgpa: round2(item?.cumulative?.cgpa),
        totalBack: Number(item?.cumulative?.totalBack ?? item?.semesterSummary?.totalBack ?? 0),
        activeBack: Number(item?.cumulative?.activeBack ?? item?.semesterSummary?.activeBack ?? 0),
        clearedBack: Number(item?.cumulative?.clearedBack ?? item?.semesterSummary?.clearedBack ?? 0),
        status: String(item?.overallStatus || "FAIL").toUpperCase(),
        publishStatus: String(item?.publishStatus || "DRAFT").toUpperCase(),
      })),
    [results]
  );

  const departmentOptions = useMemo(() => {
    const map = new Map();
    normalized.forEach((item) => {
      if (!item.departmentId) return;
      map.set(item.departmentId, item.departmentName || "Department");
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [normalized]);

  const groupOptions = useMemo(() => {
    const map = new Map();
    normalized.forEach((item) => {
      if (!item.groupId) return;
      map.set(item.groupId, item.groupName || "Group");
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [normalized]);

  const semesterOptions = useMemo(() => {
    const set = new Set();
    normalized.forEach((item) => {
      if (!item.semesterValue) return;
      set.add(item.semesterValue);
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [normalized]);
  const [department, setDepartment] = useState("All");
  const [group, setGroup] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.PENDING);
  const [results, setResults] = useState([]);

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingResultId, setEditingResultId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student: "",
    academicYear: "",
    semester: "",
    resultDate: "",
    publishStatus: "DRAFT",
    subjects: [{ ...emptySubjectRow }],
  });

  const apiBase = useSelector((state) => state.config.apiBase);

  const fetchAll = async () => {
    try {
      setLoadState(ADMIN_LOAD_STATES.PENDING);
      const [resultRes, studentRes, courseRes] = await Promise.all([
        axios.get(`${apiBase}/admin/result`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/student`, {
          withCredentials: true,
          params: { full: "true", noCache: "true" },
        }),
        axios.get(`${apiBase}/admin/course`, { withCredentials: true, params: { noCache: "true" } }),
      ]);

      setResults(resultRes.data?.results || []);
      setStudents(studentRes.data?.students || []);
      setCourses(courseRes.data?.courses || []);
      setLoadState(ADMIN_LOAD_STATES.SUCCESS);
    } catch (error) {
      setLoadState(ADMIN_LOAD_STATES.FAILURE);
      toast.error(error.response?.data?.message || "Failed to load results");
    }
  };

  useEffect(() => {
    if (!apiBase) return;
    fetchAll();
  }, [apiBase]);

  const normalized = useMemo(
    () =>
      results.map((item) => ({
        _id: item?._id,
        studentName: item?.student?.user?.name || "-",
        enrollmentNumber: item?.student?.enrollmentNumber || "-",
        semester: item?.semester ?? "-",
        semesterValue: String(item?.semester ?? ""),
        academicYear: item?.academicYear || "-",
        departmentId: String(item?.department?._id || item?.department || ""),
        departmentName: item?.department?.name || "-",
        groupId: String(item?.group?._id || item?.group || ""),
        groupName: item?.group?.name || "-",
        sgpa: round2(item?.semesterSummary?.sgpa),
        cgpa: round2(item?.cumulative?.cgpa),
        totalBack: Number(item?.cumulative?.totalBack ?? item?.semesterSummary?.totalBack ?? 0),
        activeBack: Number(item?.cumulative?.activeBack ?? item?.semesterSummary?.activeBack ?? 0),
        clearedBack: Number(item?.cumulative?.clearedBack ?? item?.semesterSummary?.clearedBack ?? 0),
        status: String(item?.overallStatus || "FAIL").toUpperCase(),
        publishStatus: String(item?.publishStatus || "DRAFT").toUpperCase(),
      })),
    [results]
  );

  const departmentOptions = useMemo(() => {
    const map = new Map();
    normalized.forEach((item) => {
      if (!item.departmentId) return;
      map.set(item.departmentId, item.departmentName || "Department");
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [normalized]);

  const groupOptions = useMemo(() => {
    const map = new Map();
    normalized.forEach((item) => {
      if (!item.groupId) return;
      map.set(item.groupId, item.groupName || "Group");
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [normalized]);

  const semesterOptions = useMemo(() => {
    const set = new Set();
    normalized.forEach((item) => {
      if (!item.semesterValue) return;
      set.add(item.semesterValue);
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [normalized]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return normalized.filter((item) => {
    return normalized.filter((item) => {
      const matchSearch =
        item.studentName.toLowerCase().includes(term) ||
        item.enrollmentNumber.toLowerCase().includes(term) ||
        String(item.semester).toLowerCase().includes(term) ||
        item.academicYear.toLowerCase().includes(term);

      const matchStatus = status === "All" || item.status === status;
      const matchDepartment = department === "All" || item.departmentId === department;
      const matchGroup = group === "All" || item.groupId === group;
      const matchSemester = semesterFilter === "All" || item.semesterValue === semesterFilter;
      return matchSearch && matchStatus && matchDepartment && matchGroup && matchSemester;
        item.studentName.toLowerCase().includes(term) ||
        item.enrollmentNumber.toLowerCase().includes(term) ||
        String(item.semester).toLowerCase().includes(term) ||
        item.academicYear.toLowerCase().includes(term);

      const matchStatus = status === "All" || item.status === status;
      const matchDepartment = department === "All" || item.departmentId === department;
      const matchGroup = group === "All" || item.groupId === group;
      const matchSemester = semesterFilter === "All" || item.semesterValue === semesterFilter;
      return matchSearch && matchStatus && matchDepartment && matchGroup && matchSemester;
    });
  }, [normalized, search, status, department, group, semesterFilter]);

  const resultsById = useMemo(
    () => new Map(results.map((item) => [String(item?._id || ""), item])),
    [results]
  );

  const filteredResultDocs = useMemo(
    () =>
      filtered
        .map((item) => resultsById.get(String(item?._id || "")))
        .filter(Boolean),
    [filtered, resultsById]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => String(student?._id || "") === String(formData.student || "")),
    [students, formData.student]
  );

  const handleSubjectChange = (index, key, value) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      ),
    }));
  };

  const addSubjectRow = () => {
    setFormData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { ...emptySubjectRow }],
    }));
  };

  const removeSubjectRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const resetForm = () => {
    setFormData({
      student: "",
      academicYear: "",
      semester: "",
      resultDate: "",
      publishStatus: "DRAFT",
      subjects: [{ ...emptySubjectRow }],
    });
    setEditingResultId(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEditModal = (result) => {
    const mappedSubjects = Array.isArray(result?.subjects)
      ? result.subjects.map((subject) => ({
          ...emptySubjectRow,
          course: String(subject?.course?._id || subject?.course || ""),
          marksObtained: String(subject?.marksObtained ?? ""),
          maxMarks: String(subject?.maxMarks ?? "100"),
          grade: String(subject?.grade || ""),
          gradePoint: String(subject?.gradePoint ?? ""),
          examType:
            String(subject?.examType || "MIDTERM").toUpperCase() === "ENDTERM"
              ? "ENDSEM"
              : String(subject?.examType || "MIDTERM").toUpperCase(),
          status: String(subject?.status || "PASS").toUpperCase(),
          attemptNo: String(subject?.attemptNo ?? "1"),
          isBackPaper: Boolean(subject?.isBackPaper),
          isClearedBack: Boolean(subject?.isClearedBack),
        }))
      : [];

    setEditingResultId(result?._id || null);
    setFormData({
      student: String(result?.student?._id || result?.student || ""),
      academicYear: String(result?.academicYear || ""),
      semester: String(result?.semester || ""),
      resultDate: result?.resultDate
        ? new Date(result.resultDate).toISOString().slice(0, 10)
        : "",
      publishStatus: String(result?.publishStatus || "DRAFT").toUpperCase(),
      subjects: mappedSubjects.length ? mappedSubjects : [{ ...emptySubjectRow }],
    });
    setIsOpen(true);
  };

  const handleCreateOrUpdateResult = async (event) => {
    event.preventDefault();

    if (!formData.student || !formData.academicYear || !formData.semester) {
      toast.error("Please fill student, academic year and semester");
      return;
    }

    if (!selectedStudent) {
      toast.error("Invalid student selected");
      return;
    }

    const preparedSubjects = formData.subjects
      .map((row) => {
        const course = courses.find(
          (item) => String(item?.id || item?._id || "") === String(row.course || "")
        );

        if (!course) return null;

        return {
          course: String(course?.id || course?._id || ""),
          subjectCode: course?.code || "",
          subjectName: course?.courseName || "",
          credits: Number(course?.credit || 0),
          marksObtained: Number(row.marksObtained || 0),
          maxMarks: Number(row.maxMarks || 100),
          grade: row.grade,
          gradePoint: Number(row.gradePoint || 0),
          examType: String(row.examType || "MIDTERM").toUpperCase(),
          status: String(row.status || "PASS").toUpperCase(),
          attemptNo: Number(row.attemptNo || 1),
          isBackPaper: Boolean(row.isBackPaper),
          isClearedBack: Boolean(row.isClearedBack),
        };
      })
      .filter(Boolean);

    if (!preparedSubjects.length) {
      toast.error("Please select at least one valid subject");
      return;
    }

    const payload = {
      student: formData.student,
      department: selectedStudent?.department?._id || selectedStudent?.department,
      group: selectedStudent?.group?._id || selectedStudent?.group || null,
      academicYear: formData.academicYear,
      semester: Number(formData.semester),
      resultDate: formData.resultDate || new Date().toISOString().slice(0, 10),
      publishStatus: formData.publishStatus,
      subjects: preparedSubjects,
    };

    try {
      setSubmitting(true);
      if (editingResultId) {
        await axios.put(`${apiBase}/admin/result/${editingResultId}`, payload, { withCredentials: true });
        toast.success("Result updated successfully");
      } else {
        await axios.post(`${apiBase}/admin/result`, payload, { withCredentials: true });
        toast.success("Result created successfully");
      }
      closeModal();
      await fetchAll();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editingResultId ? "Failed to update result" : "Failed to create result")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getResultSheetHtml = (resultDoc) => {
    const subjects = Array.isArray(resultDoc?.subjects) ? resultDoc.subjects : [];
    const totalObtained = subjects.reduce(
      (sum, subject) => sum + Number(subject?.marksObtained || 0),
      0
    );
    const totalMax = subjects.reduce((sum, subject) => sum + Number(subject?.maxMarks || 0), 0);
    const totalCredits = subjects.reduce((sum, subject) => sum + Number(subject?.credits || 0), 0);
    const totalGradePoints = subjects.reduce(
      (sum, subject) =>
        sum + Number(subject?.gradePoint || 0) * Number(subject?.credits || 0),
      0
    );
    const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;
    const subjectRows = subjects
      .map((subject, index) => {
        const examType = toExamTypeLabel(subject?.examType);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(subject?.subjectCode || "-")}</td>
            <td>${escapeHtml(subject?.subjectName || "-")}</td>
            <td>${escapeHtml(subject?.marksObtained ?? "-")}</td>
            <td>${escapeHtml(subject?.maxMarks ?? "-")}</td>
            <td>${escapeHtml(subject?.maxMarks ?? "-")}</td>
            <td>${escapeHtml(subject?.grade || "-")}</td>
            <td>${escapeHtml(subject?.gradePoint ?? "-")}</td>
            <td>${escapeHtml(subject?.credits ?? "-")}</td>
            <td>${escapeHtml(
              Number(subject?.gradePoint || 0) * Number(subject?.credits || 0) || 0
            )}</td>
            <td>${escapeHtml(examType)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="sheet">
        <div class="title">
          <h2>STATEMENT OF MARKS / GRADE</h2>
          <h3>STUDENT RESULT</h3>
          <h3>SEMESTER ${escapeHtml(resultDoc?.semester ?? "-")} EXAM ${escapeHtml(
            String(resultDoc?.academicYear || "-")
          )}</h3>
        </div>

        <div class="meta-grid">
          <div class="meta-row"><span class="meta-label">Roll No.</span><span>${escapeHtml(
            resultDoc?.student?.enrollmentNumber || "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Enrollment</span><span>${escapeHtml(
            resultDoc?.student?.enrollmentNumber || "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Category</span><span>REGULAR</span></div>
          <div class="meta-row"><span class="meta-label">Result Date</span><span>${escapeHtml(
            formatDate(resultDoc?.resultDate)
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Name</span><span>${escapeHtml(
            resultDoc?.student?.user?.name || "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Semester</span><span>${escapeHtml(
            resultDoc?.semester ?? "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Academic Year</span><span>${escapeHtml(
            resultDoc?.academicYear || "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Publish</span><span>${escapeHtml(
            String(resultDoc?.publishStatus || "DRAFT").toUpperCase()
          )}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Sub Code</th>
              <th>Subject/Papers</th>
              <th>Marks Obtained</th>
              <th>Max Marks</th>
              <th>Total</th>
              <th>Grade</th>
              <th>Grade Points</th>
              <th>Credit</th>
              <th>Credit Points</th>
              <th>Exam Type</th>
            </tr>
          </thead>
          <tbody>${subjectRows || "<tr><td colspan='11'>No subject data</td></tr>"}</tbody>
          <tfoot>
            <tr class="totals">
              <td colspan="3">TOTAL</td>
              <td>${escapeHtml(totalObtained)}</td>
              <td>${escapeHtml(totalMax)}</td>
              <td>${escapeHtml(totalMax)}</td>
              <td>-</td>
              <td>${escapeHtml(round2(totalGradePoints / (totalCredits || 1)))}</td>
              <td>${escapeHtml(totalCredits)}</td>
              <td>${escapeHtml(totalGradePoints)}</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>

        <div class="summary">
          <div class="item"><span class="label">Total Marks</span><span>${escapeHtml(
            `${totalObtained}/${totalMax}`
          )}</span></div>
          <div class="item"><span class="label">Percentage</span><span>${escapeHtml(
            percentage
          )}</span></div>
          <div class="item"><span class="label">SGPA</span><span>${escapeHtml(
            round2(resultDoc?.semesterSummary?.sgpa)
          )}</span></div>
          <div class="item"><span class="label">CGPA</span><span>${escapeHtml(
            round2(resultDoc?.cumulative?.cgpa)
          )}</span></div>
        </div>

        <div class="footer">
          <span>RESULT : ${escapeHtml(String(resultDoc?.overallStatus || "FAIL").toUpperCase())}</span>
          <span>Dated : ${escapeHtml(formatDate(resultDoc?.resultDate))}</span>
        </div>
      </div>
    `;
  };

  const getResultPdfHtmlDocument = ({
    sheetsHtml = "",
    includeReportTitle = false,
    reportTitle = "RESULT REPORT",
  } = {}) => `
    <html>
      <head>
        <style>
          body { font-family: "Times New Roman", serif; padding: 12px; color: #111827; }
          .report-title {
            margin: 0 0 14px;
            text-align: center;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .sheet { border: 1px solid #111; padding: 10px; margin-bottom: 12px; }
          .sheet.page-break { page-break-after: always; }
          .title { text-align: center; line-height: 1.25; margin-bottom: 10px; }
          .title h1 { font-size: 24px; margin: 0; letter-spacing: 0.5px; }
          .title h2 { font-size: 21px; margin: 0; }
          .title h3 { font-size: 16px; margin: 2px 0; font-weight: 700; }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px 16px;
            margin: 12px 0 14px;
            font-size: 14px;
          }
          .meta-row { display: flex; gap: 8px; white-space: normal; line-height: 1.3; }
          .meta-label { font-weight: 700; min-width: 95px; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th, td {
            border: 1px solid #8b8b8b;
            padding: 7px 6px;
            font-size: 12px;
            vertical-align: top;
            text-align: center;
          }
          th { background: #f5f5f5; font-weight: 700; }
          td:nth-child(3) { text-align: left; }
          .totals td { font-weight: 700; }
          .summary {
            margin-top: 12px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px 14px;
            font-size: 14px;
          }
          .summary .item { display: flex; gap: 6px; }
          .summary .label { font-weight: 700; min-width: 100px; }
          .footer {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        ${includeReportTitle ? `<h1 class="report-title">${escapeHtml(reportTitle)}</h1>` : ""}
        ${sheetsHtml}
      </body>
    </html>
  `;

  const handleDownloadResult = async (resultDoc) => {
    if (!resultDoc?._id) {
      toast.error("Invalid result selected");
      return;
    }

    setDownloadingResultId(resultDoc._id);
    try {
      const html = getResultPdfHtmlDocument({ sheetsHtml: getResultSheetHtml(resultDoc) });

      const studentKey = String(resultDoc?.student?.enrollmentNumber || resultDoc?._id || "result")
        .replace(/\s+/g, "_");

      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: `${studentKey}_result.pdf`,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    } finally {
      setDownloadingResultId(null);
    }
  };

  const handleDownloadOverallReport = async () => {
    if (!filteredResultDocs.length) {
      toast.error("No results available to download");
      return;
    }

    setDownloadingReport(true);
    try {
      const selectedDepartmentLabel =
        department === "All"
          ? "All Departments"
          : departmentOptions.find((item) => item.value === department)?.label || "All Departments";
      const selectedGroupLabel =
        group === "All"
          ? "All Groups"
          : groupOptions.find((item) => item.value === group)?.label || "All Groups";
      const selectedSemesterLabel =
        semesterFilter === "All" ? "All Semesters" : `Sem ${semesterFilter}`;

    const rows = filteredResultDocs
      .map((resultDoc, index) => {
        const statusText = String(resultDoc?.overallStatus || "FAIL").toUpperCase();
        const statusClass = statusText === "PASS" ? "pass" : "fail";
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(resultDoc?.student?.user?.name || "-")}</td>
            <td>${escapeHtml(resultDoc?.student?.enrollmentNumber || "-")}</td>
            <td>${escapeHtml(resultDoc?.semester ?? "-")}</td>
            <td>${escapeHtml(round2(resultDoc?.semesterSummary?.sgpa))}</td>
            <td>${escapeHtml(round2(resultDoc?.cumulative?.cgpa))}</td>
            <td>${escapeHtml(
              Number(resultDoc?.cumulative?.totalBack ?? resultDoc?.semesterSummary?.totalBack ?? 0)
            )}</td>
            <td>${escapeHtml(
              Number(resultDoc?.cumulative?.activeBack ?? resultDoc?.semesterSummary?.activeBack ?? 0)
            )}</td>
            <td>${escapeHtml(
              Number(resultDoc?.cumulative?.clearedBack ?? resultDoc?.semesterSummary?.clearedBack ?? 0)
            )}</td>
            <td class="${statusClass}">${escapeHtml(statusText)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h1 {
              margin: 0 0 14px;
              text-align: center;
              font-size: 26px;
              letter-spacing: 0.5px;
            }
            .meta {
              margin-bottom: 10px;
              font-size: 13px;
              color: #475569;
            }
            .filters {
              margin: 0 0 14px;
              font-size: 12px;
              color: #334155;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 6px 12px;
            }
            .filters .item strong {
              color: #0f172a;
            }
            table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px 8px;
              font-size: 12px;
              text-align: left;
            }
            th {
              background: #f8fafc;
              color: #1e3a5f;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            td.pass { color: #16a34a; font-weight: 700; }
            td.fail { color: #dc2626; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>RESULT REPORT</h1>
          <div class="meta">Total Students: ${filteredResultDocs.length}</div>
          <div class="filters">
            <div class="item"><strong>Status:</strong> ${escapeHtml(status)}</div>
            <div class="item"><strong>Department:</strong> ${escapeHtml(selectedDepartmentLabel)}</div>
            <div class="item"><strong>Group:</strong> ${escapeHtml(selectedGroupLabel)}</div>
            <div class="item"><strong>Semester:</strong> ${escapeHtml(selectedSemesterLabel)}</div>
            <div class="item"><strong>Search:</strong> ${escapeHtml(search || "All")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>S. NO</th>
                <th>STUDENT NAME</th>
                <th>ENROLLMENT</th>
                <th>SEM</th>
                <th>SGPA</th>
                <th>CGPA</th>
                <th>TOTAL BACK</th>
                <th>ACTIVE BACK</th>
                <th>CLEARED BACK</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: "Overall_Results_Report.pdf",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    } finally {
      setDownloadingReport(false);
    }
  };
  }, [normalized, search, status, department, group, semesterFilter]);

  const resultsById = useMemo(
    () => new Map(results.map((item) => [String(item?._id || ""), item])),
    [results]
  );

  const filteredResultDocs = useMemo(
    () =>
      filtered
        .map((item) => resultsById.get(String(item?._id || "")))
        .filter(Boolean),
    [filtered, resultsById]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => String(student?._id || "") === String(formData.student || "")),
    [students, formData.student]
  );

  const handleSubjectChange = (index, key, value) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      ),
    }));
  };

  const addSubjectRow = () => {
    setFormData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { ...emptySubjectRow }],
    }));
  };

  const removeSubjectRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const resetForm = () => {
    setFormData({
      student: "",
      academicYear: "",
      semester: "",
      resultDate: "",
      publishStatus: "DRAFT",
      subjects: [{ ...emptySubjectRow }],
    });
    setEditingResultId(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEditModal = (result) => {
    const mappedSubjects = Array.isArray(result?.subjects)
      ? result.subjects.map((subject) => ({
          ...emptySubjectRow,
          course: String(subject?.course?._id || subject?.course || ""),
          marksObtained: String(subject?.marksObtained ?? ""),
          maxMarks: String(subject?.maxMarks ?? "100"),
          grade: String(subject?.grade || ""),
          gradePoint: String(subject?.gradePoint ?? ""),
          examType:
            String(subject?.examType || "MIDTERM").toUpperCase() === "ENDTERM"
              ? "ENDSEM"
              : String(subject?.examType || "MIDTERM").toUpperCase(),
          status: String(subject?.status || "PASS").toUpperCase(),
          attemptNo: String(subject?.attemptNo ?? "1"),
          isBackPaper: Boolean(subject?.isBackPaper),
          isClearedBack: Boolean(subject?.isClearedBack),
        }))
      : [];

    setEditingResultId(result?._id || null);
    setFormData({
      student: String(result?.student?._id || result?.student || ""),
      academicYear: String(result?.academicYear || ""),
      semester: String(result?.semester || ""),
      resultDate: result?.resultDate
        ? new Date(result.resultDate).toISOString().slice(0, 10)
        : "",
      publishStatus: String(result?.publishStatus || "DRAFT").toUpperCase(),
      subjects: mappedSubjects.length ? mappedSubjects : [{ ...emptySubjectRow }],
    });
    setIsOpen(true);
  };

  const handleCreateOrUpdateResult = async (event) => {
    event.preventDefault();

    if (!formData.student || !formData.academicYear || !formData.semester) {
      toast.error("Please fill student, academic year and semester");
      return;
    }

    if (!selectedStudent) {
      toast.error("Invalid student selected");
      return;
    }

    const preparedSubjects = formData.subjects
      .map((row) => {
        const course = courses.find(
          (item) => String(item?.id || item?._id || "") === String(row.course || "")
        );

        if (!course) return null;

        return {
          course: String(course?.id || course?._id || ""),
          subjectCode: course?.code || "",
          subjectName: course?.courseName || "",
          credits: Number(course?.credit || 0),
          marksObtained: Number(row.marksObtained || 0),
          maxMarks: Number(row.maxMarks || 100),
          grade: row.grade,
          gradePoint: Number(row.gradePoint || 0),
          examType: String(row.examType || "MIDTERM").toUpperCase(),
          status: String(row.status || "PASS").toUpperCase(),
          attemptNo: Number(row.attemptNo || 1),
          isBackPaper: Boolean(row.isBackPaper),
          isClearedBack: Boolean(row.isClearedBack),
        };
      })
      .filter(Boolean);

    if (!preparedSubjects.length) {
      toast.error("Please select at least one valid subject");
      return;
    }

    const payload = {
      student: formData.student,
      department: selectedStudent?.department?._id || selectedStudent?.department,
      group: selectedStudent?.group?._id || selectedStudent?.group || null,
      academicYear: formData.academicYear,
      semester: Number(formData.semester),
      resultDate: formData.resultDate || new Date().toISOString().slice(0, 10),
      publishStatus: formData.publishStatus,
      subjects: preparedSubjects,
    };

    try {
      setSubmitting(true);
      if (editingResultId) {
        await axios.put(`${apiBase}/admin/result/${editingResultId}`, payload, { withCredentials: true });
        toast.success("Result updated successfully");
      } else {
        await axios.post(`${apiBase}/admin/result`, payload, { withCredentials: true });
        toast.success("Result created successfully");
      }
      closeModal();
      await fetchAll();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editingResultId ? "Failed to update result" : "Failed to create result")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getResultSheetHtml = (resultDoc) => {
    const subjects = Array.isArray(resultDoc?.subjects) ? resultDoc.subjects : [];
    const totalObtained = subjects.reduce(
      (sum, subject) => sum + Number(subject?.marksObtained || 0),
      0
    );
    const totalMax = subjects.reduce((sum, subject) => sum + Number(subject?.maxMarks || 0), 0);
    const totalCredits = subjects.reduce((sum, subject) => sum + Number(subject?.credits || 0), 0);
    const totalGradePoints = subjects.reduce(
      (sum, subject) =>
        sum + Number(subject?.gradePoint || 0) * Number(subject?.credits || 0),
      0
    );
    const percentage = totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;
    const subjectRows = subjects
      .map((subject, index) => {
        const examType = toExamTypeLabel(subject?.examType);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(subject?.subjectCode || "-")}</td>
            <td>${escapeHtml(subject?.subjectName || "-")}</td>
            <td>${escapeHtml(subject?.marksObtained ?? "-")}</td>
            <td>${escapeHtml(subject?.maxMarks ?? "-")}</td>
            <td>${escapeHtml(subject?.maxMarks ?? "-")}</td>
            <td>${escapeHtml(subject?.grade || "-")}</td>
            <td>${escapeHtml(subject?.gradePoint ?? "-")}</td>
            <td>${escapeHtml(subject?.credits ?? "-")}</td>
            <td>${escapeHtml(
              Number(subject?.gradePoint || 0) * Number(subject?.credits || 0) || 0
            )}</td>
            <td>${escapeHtml(examType)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="sheet">
        <div class="title">
          <h2>STATEMENT OF MARKS / GRADE</h2>
          <h3>STUDENT RESULT</h3>
          <h3>SEMESTER ${escapeHtml(resultDoc?.semester ?? "-")} EXAM ${escapeHtml(
            String(resultDoc?.academicYear || "-")
          )}</h3>
        </div>

        <div class="meta-grid">
          <div class="meta-row"><span class="meta-label">Roll No.</span><span>${escapeHtml(
            resultDoc?.student?.enrollmentNumber || "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Enrollment</span><span>${escapeHtml(
            resultDoc?.student?.enrollmentNumber || "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Category</span><span>REGULAR</span></div>
          <div class="meta-row"><span class="meta-label">Result Date</span><span>${escapeHtml(
            formatDate(resultDoc?.resultDate)
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Name</span><span>${escapeHtml(
            resultDoc?.student?.user?.name || "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Semester</span><span>${escapeHtml(
            resultDoc?.semester ?? "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Academic Year</span><span>${escapeHtml(
            resultDoc?.academicYear || "-"
          )}</span></div>
          <div class="meta-row"><span class="meta-label">Publish</span><span>${escapeHtml(
            String(resultDoc?.publishStatus || "DRAFT").toUpperCase()
          )}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Sub Code</th>
              <th>Subject/Papers</th>
              <th>Marks Obtained</th>
              <th>Max Marks</th>
              <th>Total</th>
              <th>Grade</th>
              <th>Grade Points</th>
              <th>Credit</th>
              <th>Credit Points</th>
              <th>Exam Type</th>
            </tr>
          </thead>
          <tbody>${subjectRows || "<tr><td colspan='11'>No subject data</td></tr>"}</tbody>
          <tfoot>
            <tr class="totals">
              <td colspan="3">TOTAL</td>
              <td>${escapeHtml(totalObtained)}</td>
              <td>${escapeHtml(totalMax)}</td>
              <td>${escapeHtml(totalMax)}</td>
              <td>-</td>
              <td>${escapeHtml(round2(totalGradePoints / (totalCredits || 1)))}</td>
              <td>${escapeHtml(totalCredits)}</td>
              <td>${escapeHtml(totalGradePoints)}</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>

        <div class="summary">
          <div class="item"><span class="label">Total Marks</span><span>${escapeHtml(
            `${totalObtained}/${totalMax}`
          )}</span></div>
          <div class="item"><span class="label">Percentage</span><span>${escapeHtml(
            percentage
          )}</span></div>
          <div class="item"><span class="label">SGPA</span><span>${escapeHtml(
            round2(resultDoc?.semesterSummary?.sgpa)
          )}</span></div>
          <div class="item"><span class="label">CGPA</span><span>${escapeHtml(
            round2(resultDoc?.cumulative?.cgpa)
          )}</span></div>
        </div>

        <div class="footer">
          <span>RESULT : ${escapeHtml(String(resultDoc?.overallStatus || "FAIL").toUpperCase())}</span>
          <span>Dated : ${escapeHtml(formatDate(resultDoc?.resultDate))}</span>
        </div>
      </div>
    `;
  };

  const getResultPdfHtmlDocument = ({
    sheetsHtml = "",
    includeReportTitle = false,
    reportTitle = "RESULT REPORT",
  } = {}) => `
    <html>
      <head>
        <style>
          body { font-family: "Times New Roman", serif; padding: 12px; color: #111827; }
          .report-title {
            margin: 0 0 14px;
            text-align: center;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .sheet { border: 1px solid #111; padding: 10px; margin-bottom: 12px; }
          .sheet.page-break { page-break-after: always; }
          .title { text-align: center; line-height: 1.25; margin-bottom: 10px; }
          .title h1 { font-size: 24px; margin: 0; letter-spacing: 0.5px; }
          .title h2 { font-size: 21px; margin: 0; }
          .title h3 { font-size: 16px; margin: 2px 0; font-weight: 700; }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px 16px;
            margin: 12px 0 14px;
            font-size: 14px;
          }
          .meta-row { display: flex; gap: 8px; white-space: normal; line-height: 1.3; }
          .meta-label { font-weight: 700; min-width: 95px; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th, td {
            border: 1px solid #8b8b8b;
            padding: 7px 6px;
            font-size: 12px;
            vertical-align: top;
            text-align: center;
          }
          th { background: #f5f5f5; font-weight: 700; }
          td:nth-child(3) { text-align: left; }
          .totals td { font-weight: 700; }
          .summary {
            margin-top: 12px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px 14px;
            font-size: 14px;
          }
          .summary .item { display: flex; gap: 6px; }
          .summary .label { font-weight: 700; min-width: 100px; }
          .footer {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        ${includeReportTitle ? `<h1 class="report-title">${escapeHtml(reportTitle)}</h1>` : ""}
        ${sheetsHtml}
      </body>
    </html>
  `;

  const handleDownloadResult = (resultDoc) => {
    if (!resultDoc?._id) {
      toast.error("Invalid result selected");
      return;
    }

    const html = getResultPdfHtmlDocument({ sheetsHtml: getResultSheetHtml(resultDoc) });

    const studentKey = String(resultDoc?.student?.enrollmentNumber || resultDoc?._id || "result")
      .replace(/\s+/g, "_");

    downloadPdfFromHtml(apiBase, {
      html,
      fileName: `${studentKey}_result.pdf`,
    }).catch((error) => {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    });
  };

  const handleDownloadOverallReport = () => {
    if (!filteredResultDocs.length) {
      toast.error("No results available to download");
      return;
    }

    const selectedDepartmentLabel =
      department === "All"
        ? "All Departments"
        : departmentOptions.find((item) => item.value === department)?.label || "All Departments";
    const selectedGroupLabel =
      group === "All"
        ? "All Groups"
        : groupOptions.find((item) => item.value === group)?.label || "All Groups";
    const selectedSemesterLabel =
      semesterFilter === "All" ? "All Semesters" : `Sem ${semesterFilter}`;

    const rows = filteredResultDocs
      .map((resultDoc, index) => {
        const statusText = String(resultDoc?.overallStatus || "FAIL").toUpperCase();
        const statusClass = statusText === "PASS" ? "pass" : "fail";
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(resultDoc?.student?.user?.name || "-")}</td>
            <td>${escapeHtml(resultDoc?.student?.enrollmentNumber || "-")}</td>
            <td>${escapeHtml(resultDoc?.semester ?? "-")}</td>
            <td>${escapeHtml(round2(resultDoc?.semesterSummary?.sgpa))}</td>
            <td>${escapeHtml(round2(resultDoc?.cumulative?.cgpa))}</td>
            <td>${escapeHtml(
              Number(resultDoc?.cumulative?.totalBack ?? resultDoc?.semesterSummary?.totalBack ?? 0)
            )}</td>
            <td>${escapeHtml(
              Number(resultDoc?.cumulative?.activeBack ?? resultDoc?.semesterSummary?.activeBack ?? 0)
            )}</td>
            <td>${escapeHtml(
              Number(resultDoc?.cumulative?.clearedBack ?? resultDoc?.semesterSummary?.clearedBack ?? 0)
            )}</td>
            <td class="${statusClass}">${escapeHtml(statusText)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h1 {
              margin: 0 0 14px;
              text-align: center;
              font-size: 26px;
              letter-spacing: 0.5px;
            }
            .meta {
              margin-bottom: 10px;
              font-size: 13px;
              color: #475569;
            }
            .filters {
              margin: 0 0 14px;
              font-size: 12px;
              color: #334155;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 6px 12px;
            }
            .filters .item strong {
              color: #0f172a;
            }
            table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px 8px;
              font-size: 12px;
              text-align: left;
            }
            th {
              background: #f8fafc;
              color: #1e3a5f;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            td.pass { color: #16a34a; font-weight: 700; }
            td.fail { color: #dc2626; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>RESULT REPORT</h1>
          <div class="meta">Total Students: ${filteredResultDocs.length}</div>
          <div class="filters">
            <div class="item"><strong>Status:</strong> ${escapeHtml(status)}</div>
            <div class="item"><strong>Department:</strong> ${escapeHtml(selectedDepartmentLabel)}</div>
            <div class="item"><strong>Group:</strong> ${escapeHtml(selectedGroupLabel)}</div>
            <div class="item"><strong>Semester:</strong> ${escapeHtml(selectedSemesterLabel)}</div>
            <div class="item"><strong>Search:</strong> ${escapeHtml(search || "All")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>S. NO</th>
                <th>STUDENT NAME</th>
                <th>ENROLLMENT</th>
                <th>SEM</th>
                <th>SGPA</th>
                <th>CGPA</th>
                <th>TOTAL BACK</th>
                <th>ACTIVE BACK</th>
                <th>CLEARED BACK</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
    downloadPdfFromHtml(apiBase, {
      html,
      fileName: "Overall_Results_Report.pdf",
    }).catch((error) => {
      toast.error(error.response?.data?.message || "Failed to download PDF");
    });
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="result-state pending app-loader-state">
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
          <p>Loading results...</p>
        </div>
      );
    }

    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
      return (
        <div className="result-state error">
          <img src={emptyStateImg} alt="Failed" className="result-state-img" />
          <h3>Failed to load results</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="result-header">
          <h1 className="result-title">Results & Grades</h1>
          <div className="result-header-actions">
            <button className="result-download-all-btn admin-btn-with-loader" type="button" onClick={handleDownloadOverallReport} disabled={downloadingReport}>
              {downloadingReport ? (
                <>
                  <ClipLoader size={15} color="#000000" />
                  <span>Downloading...</span>
                </>
              ) : (
                "Download Overall Report"
              )}
            </button>
            <button className="result-add-btn" type="button" onClick={openCreateModal}>
              + Add Result
            </button>
          </div>
        </div>
        <div className="result-header">
          <h1 className="result-title">Results & Grades</h1>
          <div className="result-header-actions">
            <button className="result-download-all-btn" type="button" onClick={handleDownloadOverallReport}>
              Download Overall Report
            </button>
            <button className="result-add-btn" type="button" onClick={openCreateModal}>
              + Add Result
            </button>
          </div>
        </div>

        <div className="result-toolbar">
          <div className="result-search">
            <span className="result-search-icon" aria-hidden="true">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Search by student, enrollment, semester..."
              placeholder="Search by student, enrollment, semester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="result-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {["All", "PASS", "FAIL"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select className="result-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="All">All Departments</option>
            {departmentOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select className="result-select" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="All">All Groups</option>
            {groupOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select className="result-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {["All", "PASS", "FAIL"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select className="result-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="All">All Departments</option>
            {departmentOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select className="result-select" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="All">All Groups</option>
            {groupOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            className="result-select"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
          >
            <option value="All">All Semesters</option>
            {semesterOptions.map((item) => (
              <option key={item} value={item}>
                Sem {item}
            <option value="All">All Semesters</option>
            {semesterOptions.map((item) => (
              <option key={item} value={item}>
                Sem {item}
              </option>
            ))}
          </select>
        </div>

        <div className="result-table-wrap">
          <table className="result-table">
            <thead>
              <tr>
                <th className="result-cell-serial">S. No</th>
                <th>STUDENT NAME</th>
                <th>ENROLLMENT</th>
                <th>SEM</th>
                <th>SGPA</th>
                <th>CGPA</th>
                <th>TOTAL BACK</th>
                <th>ACTIVE BACK</th>
                <th>CLEARED BACK</th>
                <th>ENROLLMENT</th>
                <th>SEM</th>
                <th>SGPA</th>
                <th>CGPA</th>
                <th>TOTAL BACK</th>
                <th>ACTIVE BACK</th>
                <th>CLEARED BACK</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, index) => (
                <tr key={item._id || `${item.enrollmentNumber}-${index}`}>
                  <td className="result-serial-cell">{index + 1}</td>
                  <td className="result-name">{item.studentName}</td>
                  <td>{item.enrollmentNumber}</td>
                  <td>{item.semester}</td>
                  <td>{item.sgpa}</td>
                  <td>{item.cgpa}</td>
                  <td>{item.totalBack}</td>
                  <td>{item.activeBack}</td>
                  <td>{item.clearedBack}</td>
                  <td>
                    <span className={`result-status ${item.status === "PASS" ? "pass" : "fail"}`}>
                      {item.status === "PASS" ? <FiCheckCircle /> : <FiXCircle />}
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="result-actions">
                      <button
                        className="result-action-btn"
                        type="button"
                        onClick={() => openEditModal(resultsById.get(String(item?._id || "")) || {})}
                      >
                        <FiEdit2 />
                        Edit
                      </button>
                      <button
                        className="result-action-btn export admin-btn-with-loader"
                        type="button"
                        onClick={() => handleDownloadResult(resultsById.get(String(item?._id || "")) || {})}
                        disabled={downloadingResultId === item._id}
                      >
                        {downloadingResultId === item._id ? (
                          <>
                            <ClipLoader size={13} color="#000000" />
                            <span>...</span>
                          </>
                        ) : (
                          <>
                            <FiDownload />
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.map((item, index) => (
                <tr key={item._id || `${item.enrollmentNumber}-${index}`}>
                  <td className="result-serial-cell">{index + 1}</td>
                  <td className="result-name">{item.studentName}</td>
                  <td>{item.enrollmentNumber}</td>
                  <td>{item.semester}</td>
                  <td>{item.sgpa}</td>
                  <td>{item.cgpa}</td>
                  <td>{item.totalBack}</td>
                  <td>{item.activeBack}</td>
                  <td>{item.clearedBack}</td>
                  <td>
                    <span className={`result-status ${item.status === "PASS" ? "pass" : "fail"}`}>
                      {item.status === "PASS" ? <FiCheckCircle /> : <FiXCircle />}
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="result-actions">
                      <button
                        className="result-action-btn"
                        type="button"
                        onClick={() => openEditModal(resultsById.get(String(item?._id || "")) || {})}
                      >
                        <FiEdit2 />
                        Edit
                      </button>
                      <button
                        className="result-action-btn export"
                        type="button"
                        onClick={() => handleDownloadResult(resultsById.get(String(item?._id || "")) || {})}
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
                  <td colSpan={11} className="result-empty">
                  <td colSpan={11} className="result-empty">
                    No results found.
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
    <div className="result-page">
      {renderState()}
      {isOpen && (
        <div className="result-modal">
          <div
            className="result-modal-backdrop"
            onClick={closeModal}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="result-modal-card">
            <div className="result-modal-head">
              <h2>{editingResultId ? "Edit Result" : "Create Result"}</h2>
              <p>
                {editingResultId
                  ? "Update semester result with subject-wise marks"
                  : "Add semester result with subject-wise marks"}
              </p>
            </div>
            <form className="result-form" onSubmit={handleCreateOrUpdateResult}>
              <div className="result-form-row">
                <label>
                  Student *
                  <select
                    name="student"
                    value={formData.student}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, student: event.target.value }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Select Student
                    </option>
                    {students.map((item) => (
                      <option key={item?._id} value={item?._id}>
                        {`${item?.enrollmentNumber || "-"} - ${item?.user?.name || "Student"}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Academic Year *
                  <input
                    name="academicYear"
                    placeholder="e.g., 2025-2026"
                    value={formData.academicYear}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, academicYear: event.target.value }))
                    }
                    required
                  />
                </label>
              </div>

              <div className="result-form-row">
                <label>
                  Semester *
                  <input
                    type="number"
                    min="1"
                    max="12"
                    name="semester"
                    value={formData.semester}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, semester: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Result Date
                  <input
                    type="date"
                    name="resultDate"
                    value={formData.resultDate}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, resultDate: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label>
                Publish Status
                <select
                  name="publishStatus"
                  value={formData.publishStatus}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, publishStatus: event.target.value }))
                  }
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </select>
              </label>

              <div className="result-subject-block">
                <div className="result-subject-head">
                  <h3>Subjects</h3>
                  <button type="button" className="btn-secondary" onClick={addSubjectRow}>
                    + Add Subject
                  </button>
                </div>

                {formData.subjects.map((row, index) => (
                  <div key={`subject-row-${index}`} className="result-subject-row">
                    <select
                      value={row.course}
                      onChange={(event) => handleSubjectChange(index, "course", event.target.value)}
                      required
                    >
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

                    <input
                      type="number"
                      placeholder="Marks"
                      min="0"
                      value={row.marksObtained}
                      onChange={(event) =>
                        handleSubjectChange(index, "marksObtained", event.target.value)
                      }
                      required
                    />

                    <input
                      type="number"
                      placeholder="Max"
                      min="1"
                      value={row.maxMarks}
                      onChange={(event) => handleSubjectChange(index, "maxMarks", event.target.value)}
                      required
                    />

                    <select
                      value={row.examType}
                      onChange={(event) => handleSubjectChange(index, "examType", event.target.value)}
                    >
                      {["MIDTERM", "ENDSEM", "PRACTICAL", "BACK"].map((item) => (
                        <option key={item} value={item}>
                          {item === "ENDSEM" ? "END SEM" : item}
                        </option>
                      ))}
                    </select>

                    <input
                      placeholder="Grade"
                      value={row.grade}
                      onChange={(event) => handleSubjectChange(index, "grade", event.target.value)}
                    />

                    <input
                      type="number"
                      placeholder="Grade Point"
                      min="0"
                      max="10"
                      step="0.1"
                      value={row.gradePoint}
                      onChange={(event) =>
                        handleSubjectChange(index, "gradePoint", event.target.value)
                      }
                    />

                    <select
                      value={row.status}
                      onChange={(event) => handleSubjectChange(index, "status", event.target.value)}
                    >
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                      <option value="ABSENT">ABSENT</option>
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Attempt"
                      value={row.attemptNo}
                      onChange={(event) => handleSubjectChange(index, "attemptNo", event.target.value)}
                    />

                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => removeSubjectRow(index)}
                      disabled={formData.subjects.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="result-modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary admin-btn-with-loader" disabled={submitting}>
                  {submitting ? (
                    <>
                      <ClipLoader size={15} color="#000000" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    editingResultId ? "Update Result" : "Create Result"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
  return (
    <div className="result-page">
      {renderState()}
      {isOpen && (
        <div className="result-modal">
          <div
            className="result-modal-backdrop"
            onClick={closeModal}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="result-modal-card">
            <div className="result-modal-head">
              <h2>{editingResultId ? "Edit Result" : "Create Result"}</h2>
              <p>
                {editingResultId
                  ? "Update semester result with subject-wise marks"
                  : "Add semester result with subject-wise marks"}
              </p>
            </div>
            <form className="result-form" onSubmit={handleCreateOrUpdateResult}>
              <div className="result-form-row">
                <label>
                  Student *
                  <select
                    name="student"
                    value={formData.student}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, student: event.target.value }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Select Student
                    </option>
                    {students.map((item) => (
                      <option key={item?._id} value={item?._id}>
                        {`${item?.enrollmentNumber || "-"} - ${item?.user?.name || "Student"}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Academic Year *
                  <input
                    name="academicYear"
                    placeholder="e.g., 2025-2026"
                    value={formData.academicYear}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, academicYear: event.target.value }))
                    }
                    required
                  />
                </label>
              </div>

              <div className="result-form-row">
                <label>
                  Semester *
                  <input
                    type="number"
                    min="1"
                    max="12"
                    name="semester"
                    value={formData.semester}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, semester: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Result Date
                  <input
                    type="date"
                    name="resultDate"
                    value={formData.resultDate}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, resultDate: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label>
                Publish Status
                <select
                  name="publishStatus"
                  value={formData.publishStatus}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, publishStatus: event.target.value }))
                  }
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </select>
              </label>

              <div className="result-subject-block">
                <div className="result-subject-head">
                  <h3>Subjects</h3>
                  <button type="button" className="btn-secondary" onClick={addSubjectRow}>
                    + Add Subject
                  </button>
                </div>

                {formData.subjects.map((row, index) => (
                  <div key={`subject-row-${index}`} className="result-subject-row">
                    <select
                      value={row.course}
                      onChange={(event) => handleSubjectChange(index, "course", event.target.value)}
                      required
                    >
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

                    <input
                      type="number"
                      placeholder="Marks"
                      min="0"
                      value={row.marksObtained}
                      onChange={(event) =>
                        handleSubjectChange(index, "marksObtained", event.target.value)
                      }
                      required
                    />

                    <input
                      type="number"
                      placeholder="Max"
                      min="1"
                      value={row.maxMarks}
                      onChange={(event) => handleSubjectChange(index, "maxMarks", event.target.value)}
                      required
                    />

                    <select
                      value={row.examType}
                      onChange={(event) => handleSubjectChange(index, "examType", event.target.value)}
                    >
                      {["MIDTERM", "ENDSEM", "PRACTICAL", "BACK"].map((item) => (
                        <option key={item} value={item}>
                          {item === "ENDSEM" ? "END SEM" : item}
                        </option>
                      ))}
                    </select>

                    <input
                      placeholder="Grade"
                      value={row.grade}
                      onChange={(event) => handleSubjectChange(index, "grade", event.target.value)}
                    />

                    <input
                      type="number"
                      placeholder="Grade Point"
                      min="0"
                      max="10"
                      step="0.1"
                      value={row.gradePoint}
                      onChange={(event) =>
                        handleSubjectChange(index, "gradePoint", event.target.value)
                      }
                    />

                    <select
                      value={row.status}
                      onChange={(event) => handleSubjectChange(index, "status", event.target.value)}
                    >
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                      <option value="ABSENT">ABSENT</option>
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Attempt"
                      value={row.attemptNo}
                      onChange={(event) => handleSubjectChange(index, "attemptNo", event.target.value)}
                    />

                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => removeSubjectRow(index)}
                      disabled={formData.subjects.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="result-modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : editingResultId ? "Update Result" : "Create Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Result;
