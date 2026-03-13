import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PiStudentBold } from "react-icons/pi";
import {
  FiHome,
  FiMapPin,
  FiUser,
  FiActivity,
  FiBookOpen,
  FiClipboard,
  FiDollarSign,
  FiBriefcase,
  FiMenu,
  FiCalendar,
  FiHash,
  FiTruck,
  FiMessageSquare,
  FiSend,
  FiRefreshCw,
  FiFileText,
  FiCreditCard,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiPercent,
  FiArrowLeft,
  FiDownload,
  FiEye,
} from "react-icons/fi";
import { HiOutlineAcademicCap, HiOutlineBuildingOffice } from "react-icons/hi2";
import { FaLinkedin } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import heroImage from "../../assets/college_47233.jpg";
import NetworkSpeedBadge from "../common/NetworkSpeedBadge";
import AlertNotifications from "../common/AlertNotifications";
import StudentDetails from "./StudentDetails";
import AttendanceOverview from "./AttendanceOverview";
import CoursesDetails from "./CoursesDetails";
import StudentExamCenter from "./StudentExamCenter";
import StudentExternalJobs from "./StudentExternalJobs";
import LinkedinAnalyzer from "./linkedin/LinkedinAnalyzer";
import StudentHostel from "./StudentHostel";
import StudentAdmitCard from "./StudentAdmitCard";
import StudentExamRegistration from "./StudentExamRegistration";
import axiosInstance from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import {
  createMyDemandRequest,
  fetchMyDemandRequests,
  fetchMyFeeProfile,
  fetchMyFeeDemands,
  fetchMyPayments,
  selectFeeActionLoading,
  selectFeeLoading,
  selectMyDemandRequests,
  selectMyFeeProfile,
  selectMyDemands,
  selectMyPayments,
  selectMyYearlyBreakdown,
} from "../../redux/feeSlice";
import { downloadPdfFromHtml } from "../../utils/pdfDownload";
import "./StudentDashboardShell.css";

const buildProfileImageUrl = (apiBase, fileUrl, fileName) => {
  const backendBase = String(apiBase || "").replace(/\/api\/?$/, "");
  const normalizePath = (rawValue = "") => {
    const value = String(rawValue || "").trim();
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    if (value.startsWith("/uploads/")) return `${backendBase}${value}`;
    if (value.startsWith("uploads/")) return `${backendBase}/${value}`;
    if (value.startsWith("/")) return `${backendBase}${value}`;

    const normalizedFileName = value
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${backendBase}/uploads/profile-images/${normalizedFileName}`;
  };

  return normalizePath(fileUrl) || normalizePath(fileName);
};

const StudentDashboardShell = ({
  resolvedStudentData,
  roleDetails,
  totalSessions,
  overallAttendance,
  attendanceData,
  coursesData,
  onCourseClick,
  onLogout,
  todayLabel,
}) => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const userData = useSelector((state) => state.user.userData);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const myDemandRequests = useSelector(selectMyDemandRequests);
  const feeLoading = useSelector(selectFeeLoading);
  const feeActionLoading = useSelector(selectFeeActionLoading);
  const myFeeProfile = useSelector(selectMyFeeProfile);
  const myDemands = useSelector(selectMyDemands);
  const myPayments = useSelector(selectMyPayments);
  const myYearlyBreakdown = useSelector(selectMyYearlyBreakdown);

  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth >= 769 : true)
  );
  const [isExamFocusMode, setIsExamFocusMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDownloadingAttendanceReport, setIsDownloadingAttendanceReport] = useState(false);
  const [nowTime, setNowTime] = useState(() => new Date());

  // Keep existing profile image resolution behavior.
  const profileImage = buildProfileImageUrl(
    apiBase,
    userData?.user?.profileImageUrl,
    userData?.user?.profileImage
  );

  const studentName =
    resolvedStudentData?.personalInfo?.name ||
    userData?.user?.name ||
    "Student";
  const studentEmail =
    resolvedStudentData?.personalInfo?.email ||
    userData?.user?.email ||
    "";
  const enrolledCoursesCount = Array.isArray(coursesData) ? coursesData.length : 0;
  const attendancePercent = Number(overallAttendance?.percentage || 0);
  const attendanceSubjectRoutePrefix = "/dashboard/attendance/subject/";

  const [hostelAllocation, setHostelAllocation] = useState(null);
  const isHostelStudent = Boolean(hostelAllocation?.hostel?.id && hostelAllocation?.room?.id);
  const defaultAcademicYear =
    roleDetails?.academicYear ||
    `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
  const [demandRequestForm, setDemandRequestForm] = useState({
    academicYear: defaultAcademicYear,
    semesterNo: String(roleDetails?.semester || 1),
    scope: "SEMESTER",
    hostelAmount: "0",
    transportAmount: "0",
    note: "",
  });
  const [useYearlyHostelFee, setUseYearlyHostelFee] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchHostelContext = async () => {
      try {
        const response = await axiosInstance.get("/api/student/hostel/context");
        if (!isMounted) return;
        setHostelAllocation(response?.data?.allocation || null);
      } catch (error) {
        void error;
        if (!isMounted) return;
        setHostelAllocation(null);
      }
    };

    fetchHostelContext();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 769) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTime(new Date());
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const currentSection = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/dashboard/profile")) return "profile";
    if (path.includes("/dashboard/attendance")) return "attendance";
    if (path.includes("/dashboard/timetable")) return "timetable";
    if (path.includes("/dashboard/courses")) return "courses";
    if (path.includes("/dashboard/exam-registration")) return "exam-registration";
    if (path.includes("/dashboard/exams")) return "exams";
    if (path.includes("/dashboard/hostel")) return "hostel";
    if (path.includes("/dashboard/fees")) return "fees";
    if (path.includes("/dashboard/admit-card")) return "admit-card";
    if (path.includes("/dashboard/jobs")) return "jobs";
    if (path.includes("/dashboard/linkedin")) return "linkedin";
    return "home";
  }, [location.pathname]);

  useEffect(() => {
    if (currentSection !== "fees") return;
    dispatch(fetchMyDemandRequests());
    dispatch(fetchMyFeeProfile());
    dispatch(fetchMyFeeDemands());
    dispatch(fetchMyPayments());
  }, [currentSection, dispatch]);

  const dashboardMenuItems = [
    { id: "home", label: "Home", path: "/dashboard", icon: FiHome },
    { id: "profile", label: "Profile", path: "/dashboard/profile", icon: FiUser },
    ...(isHostelStudent
      ? [{ id: "hostel", label: "Hostel", path: "/dashboard/hostel", icon: FiMapPin }]
      : []),
  ];

  const academicsMenuItems = [
    { id: "attendance", label: "Attendance", path: "/dashboard/attendance", icon: FiActivity },
    { id: "timetable", label: "Timetable", path: "/dashboard/timetable", icon: FiCalendar },
    { id: "courses", label: "Courses", path: "/dashboard/courses", icon: FiBookOpen },
    { id: "exams", label: "Exams", path: "/dashboard/exams", icon: FiClipboard },
    { id: "exam-registration", label: "Exam Registration", path: "/dashboard/exam-registration", icon: FiFileText },
    { id: "fees", label: "Fees", path: "/dashboard/fees", icon: FiDollarSign },
    { id: "admit-card", label: "Admit Card", path: "/dashboard/admit-card", icon: FiFileText },
    { id: "jobs", label: "Jobs", path: "/dashboard/jobs", icon: FiBriefcase },
    { id: "linkedin", label: "LinkedIn AI", path: "/dashboard/linkedin", icon: FaLinkedin },
  ];

  const userInitials = (studentName || "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  const feeSummary = useMemo(() => {
    const profileSummary = myFeeProfile?.feeSummary;
    if (profileSummary) {
      const total = Number(profileSummary.courseNetFee || 0);
      const paid = Number(profileSummary.totalPaid || 0);
      const remaining = Number(profileSummary.remainingFee || 0) || Math.max(total - paid, 0);
      return { total, paid, remaining };
    }

    const demandTotal = (myDemands || []).reduce((s, d) => s + Number(d.totalAmount || 0), 0);
    const demandPaid = (myDemands || []).reduce((s, d) => s + Number(d.paidAmount || 0), 0);
    if (demandTotal > 0) {
      return { total: demandTotal, paid: demandPaid, remaining: Math.max(demandTotal - demandPaid, 0) };
    }

    const yearlyTotal = (myYearlyBreakdown || []).reduce(
      (sum, row) => sum + Number(row?.totalFee || 0),
      0
    );
    if (yearlyTotal > 0) {
      return { total: yearlyTotal, paid: 0, remaining: yearlyTotal };
    }

    const total =
      Number(roleDetails?.totalAcademicFee) ||
      Number(roleDetails?.fees?.academic?.total) ||
      0;
    const paid =
      Number(roleDetails?.paidAcademicFee) ||
      Number(roleDetails?.fees?.academic?.paid) ||
      0;
    const remaining = Math.max(total - paid, 0);
    return { total, paid, remaining };
  }, [myFeeProfile, myDemands, myYearlyBreakdown, roleDetails]);

  const formatAmount = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const demandScope = String(demandRequestForm.scope || "SEMESTER").toUpperCase();
  const isYearRequest = demandScope === "YEAR";
  useEffect(() => {
    if (!isYearRequest && useYearlyHostelFee) {
      setUseYearlyHostelFee(false);
    }
  }, [isYearRequest, useYearlyHostelFee]);
  const rawSemesterNo = Number(
    myFeeProfile?.currentSemester || roleDetails?.semester || demandRequestForm.semesterNo || 1
  );
  const currentSemesterNo = Number.isFinite(rawSemesterNo) && rawSemesterNo > 0 ? rawSemesterNo : 1;
  const semsPerYear = Number(roleDetails?.durationYears) && Number(roleDetails?.totalSemesters)
    ? Math.max(1, Math.round(Number(roleDetails.totalSemesters) / Number(roleDetails.durationYears)))
    : 2;
  const yearStartSemester = Math.max(1, Math.floor((currentSemesterNo - 1) / semsPerYear) * semsPerYear + 1);
  const yearEndSemester = yearStartSemester + semsPerYear - 1;
  const yearRangeLabel = `Sem ${yearStartSemester}-${yearEndSemester}`;
  const currentYearNo = Math.ceil(currentSemesterNo / semsPerYear);
  const currentYearBreakdown = (myYearlyBreakdown || []).find(
    (row) => Number(row?.yearNo) === Number(currentYearNo)
  );
  const suggestedHostelYearFee = Number(currentYearBreakdown?.hostelFee || 0);
  const canSuggestHostelYearFee = suggestedHostelYearFee > 0;
  const lockHostelAmount = useYearlyHostelFee && canSuggestHostelYearFee;

  const formatSemesterLabel = (semesterNo, scope) => {
    const normalizedScope = String(scope || "").toUpperCase();
    const sem = Number(semesterNo);
    if (normalizedScope === "YEAR" || sem === 0) return "Full Year";
    if (Number.isFinite(sem) && sem > 0) return `Sem ${sem}`;
    return "-";
  };

  const handleMenuClick = (item) => {
    navigate(item.path);
    if (window.innerWidth < 769) {
      setIsSidebarOpen(false);
    }
  };

  const submitDemandRequest = async (event) => {
    event.preventDefault();
    if (!demandRequestForm.academicYear || (!isYearRequest && !demandRequestForm.semesterNo)) {
      toast.error(isYearRequest ? "Academic year is required" : "Academic year and semester are required");
      return;
    }

    try {
      await dispatch(
        createMyDemandRequest({
          academicYear: String(demandRequestForm.academicYear || "").trim(),
          semesterNo: isYearRequest ? 0 : Number(demandRequestForm.semesterNo),
          scope: isYearRequest ? "YEAR" : "SEMESTER",
          hostelAmount: Number(demandRequestForm.hostelAmount || 0),
          transportAmount: Number(demandRequestForm.transportAmount || 0),
          note: String(demandRequestForm.note || "").trim(),
        })
      ).unwrap();
      toast.success("Demand request sent to admin");
      setDemandRequestForm((prev) => ({ ...prev, note: "" }));
    } catch (error) {
      toast.error(error || "Failed to submit demand request");
    }
  };

  const handleViewDemandLetter = (requestId) => {
    if (!apiBase || !requestId) {
      toast.error("Demand letter is not available");
      return;
    }
    const url = `${apiBase}/student/fee/me/demand-request/${requestId}/letter/view`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadDemandLetter = async (requestId) => {
    if (!apiBase || !requestId) {
      toast.error("Demand letter is not available");
      return;
    }
    try {
      const response = await axiosInstance.get(
        `${apiBase}/student/fee/me/demand-request/${requestId}/letter/download`,
        {
          withCredentials: true,
          responseType: "blob",
        }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `demand_letter_${requestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download demand letter");
    }
  };

  const renderFeeCards = ({
    wrapperClassName = "student-home-fee-row",
    cardClassName = "",
  } = {}) => (
    <section className={wrapperClassName}>
      <article className={`student-summary-card student-summary-card--fee-total ${cardClassName}`}>
        <p>Total Academic Fee</p>
        <strong>{formatAmount(feeSummary.total)}</strong>
      </article>
      <article className={`student-summary-card student-summary-card--fee-paid ${cardClassName}`}>
        <p>Paid</p>
        <strong>{formatAmount(feeSummary.paid)}</strong>
      </article>
      <article className={`student-summary-card student-summary-card--fee-remaining ${cardClassName}`}>
        <p>Remaining</p>
        <strong>{formatAmount(feeSummary.remaining)}</strong>
      </article>
    </section>
  );

  const renderHomeSummaryCards = () => (
    <section id="overview" className="student-home-summary-stack">
      {renderFeeCards({ wrapperClassName: "student-home-fee-row" })}
      <section className="student-home-stats-row">
        <article className="student-summary-card student-summary-card--courses">
          <p>Enrolled Courses</p>
          <strong>{enrolledCoursesCount}</strong>
        </article>
        <article className="student-summary-card student-summary-card--sessions">
          <p>Total Sessions</p>
          <strong>{totalSessions}</strong>
        </article>
      </section>
    </section>
  );

  const renderHome = () => (
    <div className="student-home-stack">
      <section className="student-home-hero">
        <div className="student-home-image-wrap">
          <img src={heroImage} alt="Campus" className="student-home-image" />
        </div>
        <div className="student-home-hero-copy">
          <h3>Welcome Back</h3>
          <p>Track your attendance, courses, and fee status from one place.</p>
          <div className="student-home-hero-chips">
            <span>{enrolledCoursesCount} Courses</span>
            <span>{totalSessions} Sessions</span>
            <span>{attendancePercent.toFixed(1)}% Attendance</span>
          </div>
        </div>
      </section>
      {renderHomeSummaryCards()}

      <AttendanceOverview
        overallAttendance={overallAttendance}
        attendanceData={attendanceData}
        studentData={resolvedStudentData}
      />
    </div>
  );

  const renderAttendancePage = () => {
    const totalClasses = overallAttendance?.totalSessions || 0;
    const attended = overallAttendance?.presentCount || 0;
    const missed = totalClasses - attended;
    const percentage = totalClasses > 0
      ? Number(((attended / totalClasses) * 100).toFixed(1))
      : 0;

    const getColor = (pct) => {
      if (pct >= 90) return "#16a34a";
      if (pct >= 75) return "#f59e0b";
      return "#ef4444";
    };

    const getAccentSoftColor = (pct) => {
      if (pct >= 90) return "#86efac";
      if (pct >= 75) return "#fcd34d";
      return "#fca5a5";
    };

    const getAccentShadowColor = (pct) => {
      if (pct >= 90) return "rgba(22, 163, 74, 0.24)";
      if (pct >= 75) return "rgba(245, 158, 11, 0.24)";
      return "rgba(239, 68, 68, 0.24)";
    };

    const extractFacultyName = (entry = {}, course = {}) => {
      const directCandidates = [
        entry?.facultyName,
        course?.facultyName,
        course?.faculty?.name,
        course?.faculty?.user?.name,
      ];
      const directHit = directCandidates.find(
        (value) => String(value || "").trim() && String(value || "").trim() !== "N/A"
      );
      if (directHit) return String(directHit).trim();

      const attendanceCourseId = String(course?._id || entry?.course?._id || "").trim();
      const attendanceCode = String(course?.code || "").trim().toLowerCase();
      const attendanceName = String(course?.courseName || "").trim().toLowerCase();

      const match = (Array.isArray(coursesData) ? coursesData : []).find((courseItem) => {
        const itemId = String(courseItem?.id || courseItem?._id || "").trim();
        const itemCode = String(courseItem?.courseCode || courseItem?.code || "")
          .trim()
          .toLowerCase();
        const itemName = String(courseItem?.courseName || courseItem?.name || "")
          .trim()
          .toLowerCase();

        return (
          (attendanceCourseId && itemId && attendanceCourseId === itemId) ||
          (attendanceCode && itemCode && attendanceCode === itemCode) ||
          (attendanceName && itemName && attendanceName === itemName)
        );
      });

      const mappedFaculty = String(
        match?.instructor || match?.facultyName || match?.faculty?.name || ""
      ).trim();

      return mappedFaculty || "-";
    };

    const subjectData = (attendanceData || []).map((entry) => {
      const course = entry.course || {};
      const total = entry.totalSessions || 0;
      const present = entry.presentCount || 0;
      const pct = total > 0 ? Number(((present / total) * 100).toFixed(0)) : 0;
      const routeId = String(course._id || course.code || course.courseName || "subject")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      const sessions = Array.isArray(entry.recentSessions)
        ? [...entry.recentSessions]
            .map((session) => ({
              date: session?.date,
              status: String(session?.status || "no-data").toLowerCase(),
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        : [];
      return {
        name: course.courseName || course.code || "Course",
        code: course.code || "",
        faculty: extractFacultyName(entry, course),
        routeId,
        totalSessions: total,
        presentCount: present,
        percentage: pct,
        sessions,
      };
    });

    const downloadAttendanceReport = async () => {
      if (isDownloadingAttendanceReport) return;
      try {
        setIsDownloadingAttendanceReport(true);
        const esc = (value = "") =>
          String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const rows = subjectData
          .map(
            (sub, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${esc(sub.name)}</td>
                <td>${esc(sub.code || "-")}</td>
                <td>${esc(sub.faculty || "-")}</td>
                <td>${sub.totalSessions}</td>
                <td>${sub.presentCount}</td>
                <td>${Number(sub.percentage || 0).toFixed(2)}%</td>
              </tr>
            `
          )
          .join("");

        const now = new Date();
        const html = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
                h1 { margin: 0 0 16px; font-size: 30px; color: #334155; }
                .card { border: 1px solid #dbe4ee; border-radius: 12px; padding: 16px; margin-bottom: 16px; background: #f8fbff; }
                .card h2 { margin: 0 0 10px; font-size: 24px; color: #334155; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 18px; }
                .label { font-weight: 700; }
                .meta { margin-top: 12px; font-size: 16px; color: #475569; text-align: center; }
                table { width: 100%; border-collapse: collapse; border: 1px solid #d4dbe5; background: #ffffff; }
                th, td { border: 1px solid #d4dbe5; padding: 10px; text-align: center; font-size: 15px; }
                th { background: #f3f4f6; color: #6b7280; font-weight: 700; }
                tfoot td { font-weight: 700; background: #f9fafb; }
              </style>
            </head>
            <body>
              <h1>Attendance Report</h1>
              <section class="card">
                <h2>Student Details</h2>
                <div class="grid">
                  <div><span class="label">Name:</span> ${esc(studentName || "-")}</div>
                  <div><span class="label">Email:</span> ${esc(studentEmail || "-")}</div>
                  <div><span class="label">Enrollment:</span> ${esc(roleDetails?.enrollmentNumber || resolvedStudentData?.personalInfo?.studentId || "-")}</div>
                  <div><span class="label">Semester:</span> ${esc(roleDetails?.semester || resolvedStudentData?.academicInfo?.semester || "-")}</div>
                  <div><span class="label">Department:</span> ${esc(roleDetails?.department?.name || resolvedStudentData?.academicInfo?.course || "-")}</div>
                  <div><span class="label">Section:</span> ${esc(roleDetails?.group?.name || resolvedStudentData?.academicInfo?.section || "-")}</div>
                </div>
                <div class="meta">
                  <span class="label">Date:</span> ${esc(now.toLocaleDateString())} &nbsp; | &nbsp;
                  <span class="label">Time:</span> ${esc(now.toLocaleTimeString())}
                </div>
              </section>
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Subject Name</th>
                    <th>Subject Code</th>
                    <th>Faculty</th>
                    <th>Total Held</th>
                    <th>Total Attended</th>
                    <th>% Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || '<tr><td colspan="7">No attendance records found</td></tr>'}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4">Overall</td>
                    <td>${totalClasses}</td>
                    <td>${attended}</td>
                    <td>${Number(percentage || 0).toFixed(2)}%</td>
                  </tr>
                </tfoot>
              </table>
            </body>
          </html>
        `;

        await downloadPdfFromHtml(apiBase, {
          html,
          fileName: `${studentName || "Student"}_Attendance_Report.pdf`,
        });
      } catch (error) {
        toast.error(error?.message || "Failed to download attendance report");
      } finally {
        setIsDownloadingAttendanceReport(false);
      }
    };

    const selectedRouteId = decodeURIComponent(
      String(location.pathname || "")
        .replace(attendanceSubjectRoutePrefix, "")
        .split("/")[0]
        .trim()
    );
    const selectedSubject = subjectData.find((item) => item.routeId === selectedRouteId);

    const lowestSubject = subjectData.length > 0
      ? subjectData.reduce((low, s) => (s.percentage < low.percentage ? s : low), subjectData[0])
      : null;
    const tipSubject = lowestSubject && lowestSubject.percentage < 75 ? lowestSubject : null;
    let classesNeeded = 0;
    if (tipSubject) {
      let needed = 0;
      let t = tipSubject.totalSessions;
      let p = tipSubject.presentCount;
      while (t < 999 && (p / t) * 100 < 75) { t++; p++; needed++; }
      classesNeeded = needed;
    }

    if (selectedRouteId) {
      return (
        <section className="stu-att-page">
          <div className="stu-att-detail-card">
            <button
              type="button"
              className="stu-att-detail-back"
              onClick={() => navigate("/dashboard/attendance")}
            >
              <FiArrowLeft size={14} />
              Back to Attendance
            </button>
            <div className="stu-att-detail-head">
              <div>
                <h3 className="stu-att-detail-name">{selectedSubject?.name || "Subject Attendance"}</h3>
                {selectedSubject?.code && (
                  <span className="stu-att-detail-code">{selectedSubject.code}</span>
                )}
              </div>
              {selectedSubject && (
                <div className="stu-att-detail-summary">
                  <span className="stu-att-detail-chip stu-att-detail-chip--pct">{selectedSubject.percentage}%</span>
                  <span className="stu-att-detail-chip stu-att-detail-chip--present">{selectedSubject.presentCount} Present</span>
                  <span className="stu-att-detail-chip stu-att-detail-chip--absent">
                    {Math.max(selectedSubject.totalSessions - selectedSubject.presentCount, 0)} Absent
                  </span>
                </div>
              )}
            </div>

            {!selectedSubject ? (
              <p className="stu-att-detail-empty">Subject attendance not found.</p>
            ) : selectedSubject.sessions.length === 0 ? (
              <p className="stu-att-detail-empty">No session records available for this subject.</p>
            ) : (
              <div className="stu-att-detail-list">
                {selectedSubject.sessions.map((session, index) => {
                  const dateObj = new Date(session.date);
                  const dateText = Number.isNaN(dateObj.getTime())
                    ? "N/A"
                    : dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                  const dayText = Number.isNaN(dateObj.getTime())
                    ? ""
                    : dateObj.toLocaleDateString("en-IN", { weekday: "short" });
                  const status = session.status === "present"
                    ? "present"
                    : session.status === "absent"
                    ? "absent"
                    : "no-data";
                  return (
                    <div key={`${selectedSubject.routeId}-${session.date || "na"}-${index}`} className="stu-att-detail-row">
                      <div className="stu-att-detail-date">
                        <span className="stu-att-detail-date-main">{dateText}</span>
                        <span className="stu-att-detail-date-day">{dayText}</span>
                      </div>
                      <span className={`stu-att-detail-badge stu-att-detail-badge--${status}`}>
                        {status === "present" ? "Present" : status === "absent" ? "Absent" : "No Data"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      );
    }

    return (
        <section className="stu-att-page">
          {/* Overall Attendance Card */}
          <div
            className="stu-att-overall-card"
            style={{
              "--stu-att-accent": getColor(percentage),
              "--stu-att-accent-soft": getAccentSoftColor(percentage),
              "--stu-att-accent-shadow": getAccentShadowColor(percentage),
            }}
          >
          <div className="stu-att-overall-head">
            <h3 className="stu-att-overall-title">Overall Attendance</h3>
            <button
              type="button"
              className="stu-att-download-btn"
              onClick={downloadAttendanceReport}
              disabled={isDownloadingAttendanceReport}
              title="Download full attendance report"
            >
              {isDownloadingAttendanceReport ? (
                <span className="stu-att-download-spinner" aria-hidden="true" />
              ) : (
                <FiDownload size={15} />
              )}
            </button>
          </div>
          <div className="stu-att-circle-wrap">
            <svg viewBox="0 0 140 140" className="stu-att-circle-svg">
              <circle cx="70" cy="70" r="58" fill="none" stroke="#f1f5f9" strokeWidth="11" />
              <circle
                cx="70" cy="70" r="58"
                fill="none"
                stroke={getColor(percentage)}
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${(percentage / 100) * 364.42} 364.42`}
                transform="rotate(-90 70 70)"
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
            </svg>
            <div className="stu-att-circle-text">
              <span className="stu-att-circle-pct">{percentage}%</span>
              <span className="stu-att-circle-label">PRESENT</span>
            </div>
          </div>
          <div className="stu-att-stats-row">
            <div className="stu-att-stat">
              <span className="stu-att-stat-label">TOTAL</span>
              <span className="stu-att-stat-value">{totalClasses}</span>
            </div>
            <div className="stu-att-stat-divider" />
            <div className="stu-att-stat">
              <span className="stu-att-stat-label stu-att-stat-label--attended">ATTENDED</span>
              <span className="stu-att-stat-value stu-att-stat-value--attended">{attended}</span>
            </div>
            <div className="stu-att-stat-divider" />
            <div className="stu-att-stat">
              <span className="stu-att-stat-label stu-att-stat-label--missed">MISSED</span>
              <span className="stu-att-stat-value stu-att-stat-value--missed">{missed}</span>
            </div>
          </div>
        </div>

        {/* Subject-wise Analysis */}
        {subjectData.length > 0 && (
          <div className="stu-att-subject-card">
            <div className="stu-att-subject-header">
              <h3 className="stu-att-subject-title">Subject-wise Analysis</h3>
            </div>
            <div className="stu-att-subject-list">
              {subjectData.map((sub, idx) => {
                const barColor = getColor(sub.percentage);
                const isLow = sub.percentage < 75;
                return (
                  <div
                    key={idx}
                    className="stu-att-subject-item stu-att-subject-item--clickable"
                    onClick={() =>
                      navigate(`${attendanceSubjectRoutePrefix}${encodeURIComponent(sub.routeId)}`)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        navigate(`${attendanceSubjectRoutePrefix}${encodeURIComponent(sub.routeId)}`);
                      }
                    }}
                  >
                    <div className="stu-att-subject-row">
                      <div className="stu-att-subject-info">
                        <span className="stu-att-subject-name">{sub.name}</span>
                        <span className="stu-att-subject-hint">Tap to view all dates</span>
                      </div>
                      <div className="stu-att-subject-nums">
                        <span className="stu-att-subject-pct" style={{ color: barColor }}>{sub.percentage}%</span>
                        <span className="stu-att-subject-count">{sub.presentCount} / {sub.totalSessions} classes</span>
                      </div>
                    </div>
                    <div className="stu-att-bar-track">
                      <div
                        className="stu-att-bar-fill"
                        style={{
                          width: `${Math.min(sub.percentage, 100)}%`,
                          background: barColor,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                    {isLow && (
                      <span className="stu-att-below-threshold">Below threshold (75%)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attendance Tip */}
        {tipSubject && classesNeeded > 0 && (
          <div className="stu-att-tip-card">
            <div className="stu-att-tip-icon">
              <FiAlertCircle size={22} />
            </div>
            <div className="stu-att-tip-body">
              <span className="stu-att-tip-title">Attendance Tip</span>
              <span className="stu-att-tip-text">
                Attend the next {classesNeeded} {tipSubject.name} classes to reach the 75% goal.
              </span>
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderTimetablePage = () => {
    const todayScheduleList = Array.isArray(userData?.todaySchedule)
      ? userData.todaySchedule
      : Array.isArray(roleDetails?.todaySchedule)
      ? roleDetails.todaySchedule
      : [];

    const slotByLecture = {
      1: { start: "09:00", end: "09:50" },
      2: { start: "09:50", end: "10:40" },
      3: { start: "10:50", end: "11:40" },
      4: { start: "11:40", end: "12:30" },
      5: { start: "13:10", end: "14:00" },
      6: { start: "14:00", end: "14:50" },
      7: { start: "15:00", end: "15:50" },
      8: { start: "15:50", end: "16:40" },
    };

    const toMinutes = (hhmm = "") => {
      const [hh, mm] = String(hhmm).split(":").map(Number);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
      return hh * 60 + mm;
    };

    const nowMinutes = nowTime.getHours() * 60 + nowTime.getMinutes();
    const dayClasses = [...todayScheduleList]
      .map((entry) => {
        const lectureNumber = Number(entry?.lectureNumber || 0);
        const slot = slotByLecture[lectureNumber] || null;
        const startMinutes = toMinutes(slot?.start);
        const endMinutes = toMinutes(slot?.end);
        const course = entry?.course || {};
        const courseId = String(course?._id || entry?.courseId || "").trim();
        const courseCode = String(course?.code || entry?.courseCode || "").trim().toLowerCase();
        const courseName = String(course?.courseName || entry?.courseName || "").trim().toLowerCase();

        const matchedCourse = (Array.isArray(coursesData) ? coursesData : []).find((item) => {
          const itemId = String(item?.id || item?._id || "").trim();
          const itemCode = String(item?.courseCode || item?.code || "").trim().toLowerCase();
          const itemName = String(item?.courseName || item?.name || "").trim().toLowerCase();
          return (
            (courseId && itemId && courseId === itemId) ||
            (courseCode && itemCode && courseCode === itemCode) ||
            (courseName && itemName && courseName === itemName)
          );
        });

        let status = "upcoming";
        if (Number.isFinite(startMinutes) && Number.isFinite(endMinutes)) {
          if (nowMinutes >= startMinutes && nowMinutes < endMinutes) status = "live";
          else if (nowMinutes >= endMinutes) status = "completed";
        }

        return {
          lectureNumber,
          subject: matchedCourse?.courseName || course?.courseName || matchedCourse?.courseCode || course?.code || "Class",
          code: matchedCourse?.courseCode || course?.code || "-",
          teacher:
            entry?.facultyName ||
            matchedCourse?.instructor ||
            matchedCourse?.facultyName ||
            course?.facultyName ||
            "Teacher not assigned",
          timeLabel: slot ? `${slot.start} - ${slot.end}` : "Time not set",
          status,
        };
      })
      .sort((a, b) => a.lectureNumber - b.lectureNumber);

    const liveCount = dayClasses.filter((item) => item.status === "live").length;
    const completedCount = dayClasses.filter((item) => item.status === "completed").length;
    const upcomingCount = dayClasses.filter((item) => item.status === "upcoming").length;

    return (
      <section className="stu-tt-page">
        <div className="stu-tt-hero">
          <div>
            <h3 className="stu-tt-title">Today's Timetable</h3>
            <p className="stu-tt-subtitle">
              Track live class, completed lectures, and upcoming sessions for today.
            </p>
          </div>
          <div className="stu-tt-kpis">
            <span className="stu-tt-kpi live">Live {liveCount}</span>
            <span className="stu-tt-kpi completed">Completed {completedCount}</span>
            <span className="stu-tt-kpi upcoming">Upcoming {upcomingCount}</span>
          </div>
        </div>

        {dayClasses.length === 0 ? (
          <div className="stu-tt-empty">No classes scheduled for today.</div>
        ) : (
          <div className="stu-tt-list">
            {dayClasses.map((item) => (
              <article
                key={`${item.lectureNumber}-${item.code}-${item.subject}`}
                className={`stu-tt-card ${item.status}`}
              >
                <div className="stu-tt-slot">Lecture {item.lectureNumber}</div>
                <div className="stu-tt-main">
                  <h4>{item.subject}</h4>
                  <p>{item.code}</p>
                  <p className="stu-tt-teacher">{item.teacher}</p>
                </div>
                <div className="stu-tt-meta">
                  <span className="stu-tt-time">{item.timeLabel}</span>
                  <span className={`stu-tt-status ${item.status}`}>
                    {item.status === "live"
                      ? "Live"
                      : item.status === "completed"
                      ? "Completed"
                      : "Upcoming"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderFees = () => {
    const demandsList = myDemands || [];
    const paymentsList = myPayments || [];
    const profile = myFeeProfile;

    const pendingDemands = demandsList.filter((d) => d.status === "PENDING" || d.status === "PARTIAL").length;
    const paidDemands = demandsList.filter((d) => d.status === "PAID").length;
    const totalDemandAmount = demandsList.reduce((s, d) => s + Number(d.totalAmount || 0), 0);
    const totalPaidAmount = demandsList.reduce((s, d) => s + Number(d.paidAmount || 0), 0);
    const collectionRate = totalDemandAmount > 0 ? ((totalPaidAmount / totalDemandAmount) * 100) : 0;
    const successPayments = paymentsList.filter((p) => p.status === "SUCCESS").length;

    return (
    <section className="student-fees-page mt-10 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      <h3 className="relative z-10 text-2xl font-semibold text-gray-800">Fee Overview</h3>
      <div className="relative z-10 mt-6">
        {renderFeeCards({
          wrapperClassName: "student-fee-overview-row",
          cardClassName: "student-summary-card--hoverable",
        })}
      </div>

      {/* Admin-style info cards */}
      <div className="relative z-10 mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <FiFileText size={18} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Demands</span>
          <span className="text-xl font-semibold text-slate-800">{demandsList.length}</span>
          <span className="text-xs text-slate-400">{formatAmount(totalDemandAmount)} generated</span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <FiClock size={18} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending</span>
          <span className="text-xl font-semibold text-slate-800">{pendingDemands}</span>
          <span className="text-xs text-slate-400">{pendingDemands === 1 ? "demand" : "demands"} unpaid</span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <FiCheckCircle size={18} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid Demands</span>
          <span className="text-xl font-semibold text-slate-800">{paidDemands}</span>
          <span className="text-xs text-slate-400">{formatAmount(totalPaidAmount)} collected</span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <FiCreditCard size={18} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Payments</span>
          <span className="text-xl font-semibold text-slate-800">{successPayments}</span>
          <span className="text-xs text-slate-400">{paymentsList.length} total transactions</span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
            <FiPercent size={18} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Collection Rate</span>
          <span className="text-xl font-semibold text-slate-800">{collectionRate.toFixed(1)}%</span>
          <span className="text-xs text-slate-400">
            {profile?.programId?.programName || profile?.branchId?.branchName || ""}
          </span>
        </div>
      </div>

      {/* Semester-wise demands table */}
      {demandsList.length > 0 && (
        <div className="relative z-10 mt-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FiFileText className="text-blue-500" size={18} />
            <h4 className="text-base font-semibold text-slate-700">Semester-wise Demands</h4>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Year</th>
                  <th className="pb-2 pr-4">Sem</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Paid</th>
                  <th className="pb-2 pr-4">Due</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {demandsList.map((d) => (
                  <tr key={d._id} className="border-t border-slate-50 transition hover:bg-slate-50">
                    <td className="py-2.5 pr-4 text-slate-700">{d.academicYear || "-"}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{formatSemesterLabel(d.semesterNo, d.scope)}</td>
                    <td className="py-2.5 pr-4 text-slate-700">
                      {(Array.isArray(d.breakdown) ? d.breakdown : []).some((row) => String(row?.head || "").toUpperCase() === "HOSTEL")
                        ? "Academic + Hostel"
                        : "Academic"}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{formatAmount(d.totalAmount)}</td>
                    <td className="py-2.5 pr-4 text-emerald-600">{formatAmount(d.paidAmount)}</td>
                    <td className="py-2.5 pr-4 text-red-500">{formatAmount(d.dueAmount)}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.status === "PAID" ? "bg-emerald-50 text-emerald-700"
                        : d.status === "PARTIAL" ? "bg-amber-50 text-amber-700"
                        : d.status === "PENDING" ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                      }`}>
                        {d.status === "PAID" && <FiCheckCircle size={12} />}
                        {d.status === "PENDING" && <FiClock size={12} />}
                        {d.status === "PARTIAL" && <FiAlertCircle size={12} />}
                        {d.status || "N/A"}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {d.dueDate ? new Date(d.dueDate).toLocaleDateString("en-IN") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History */}
      {paymentsList.length > 0 && (
        <div className="relative z-10 mt-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FiCreditCard className="text-violet-500" size={18} />
            <h4 className="text-base font-semibold text-slate-700">Payment History</h4>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Mode</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Receipt</th>
                  <th className="pb-2">Semester</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList.map((p) => (
                  <tr key={p._id} className="border-t border-slate-50 transition hover:bg-slate-50">
                    <td className="py-2.5 pr-4 text-slate-700">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{formatAmount(p.amount)}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{p.mode || "-"}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700"
                        : p.status === "PENDING" ? "bg-amber-50 text-amber-700"
                        : p.status === "FAILED" ? "bg-red-50 text-red-700"
                        : "bg-slate-100 text-slate-600"
                      }`}>
                        {p.status === "SUCCESS" && <FiCheckCircle size={12} />}
                        {p.status === "PENDING" && <FiClock size={12} />}
                        {p.status === "FAILED" && <FiAlertCircle size={12} />}
                        {p.status || "N/A"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{p.receiptNo || "-"}</td>
                    <td className="py-2.5 text-slate-500">
                      {formatSemesterLabel(p.demandId?.semesterNo, p.demandId?.scope)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={submitDemandRequest}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <FiDollarSign className="text-blue-600" size={22} />
            <h4 className="text-lg font-semibold text-slate-800">Request New Fee Demand</h4>
          </div>
          <p className="mt-1 text-sm text-slate-500">Send a message to admin for demand generation.</p>

          {/* Academic Details */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <HiOutlineAcademicCap size={16} className="text-indigo-500" />
              Academic Details
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>Apply For</span>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 transition ${
                  demandScope === "SEMESTER"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() =>
                  setDemandRequestForm((prev) => ({
                    ...prev,
                    scope: "SEMESTER",
                  }))
                }
              >
                Semester
              </button>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 transition ${
                  demandScope === "YEAR"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() =>
                  setDemandRequestForm((prev) => ({
                    ...prev,
                    scope: "YEAR",
                  }))
                }
              >
                Full Year
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FiCalendar size={14} className="text-slate-400" />
                  Academic Year
                </span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  type="text"
                  placeholder="2026-27"
                  value={demandRequestForm.academicYear}
                  onChange={(event) =>
                    setDemandRequestForm((prev) => ({
                      ...prev,
                      academicYear: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              {isYearRequest ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Full year request will cover {yearRangeLabel} based on your current semester.
                </div>
              ) : (
                <label className="text-sm text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <FiHash size={14} className="text-slate-400" />
                    Semester
                  </span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    type="number"
                    min="1"
                    max="20"
                    value={demandRequestForm.semesterNo}
                    onChange={(event) =>
                      setDemandRequestForm((prev) => ({
                        ...prev,
                        semesterNo: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Due date will be assigned by admin during approval and shown on the demand letter.
            </p>
          </div>

          {/* Fee Amounts */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <FiDollarSign size={16} className="text-emerald-500" />
              Fee Amounts
            </div>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="flex items-center gap-1.5">
                  <HiOutlineBuildingOffice size={14} className="text-slate-400" />
                  Hostel Amount
                </span>
                <input
                  className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${
                    lockHostelAmount ? "bg-slate-50 text-slate-500" : ""
                  }`}
                  type="number"
                  min="0"
                  value={demandRequestForm.hostelAmount}
                  readOnly={lockHostelAmount}
                  onChange={(event) =>
                    setDemandRequestForm((prev) => ({
                      ...prev,
                      hostelAmount: event.target.value,
                    }))
                  }
                />
                {isYearRequest ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useYearlyHostelFee}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setUseYearlyHostelFee(checked);
                          if (checked && canSuggestHostelYearFee) {
                            setDemandRequestForm((prev) => ({
                              ...prev,
                              hostelAmount: String(suggestedHostelYearFee),
                            }));
                          }
                        }}
                      />
                      Use full-year hostel fee
                    </label>
                    {canSuggestHostelYearFee ? (
                      <span>Suggested: Rs.{suggestedHostelYearFee.toLocaleString("en-IN")}</span>
                    ) : (
                      <span className="text-amber-600">Full-year hostel fee not configured.</span>
                    )}
                  </div>
                ) : null}
              </label>
              <label className="text-sm text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FiTruck size={14} className="text-slate-400" />
                  Transport Amount
                </span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  type="number"
                  min="0"
                  value={demandRequestForm.transportAmount}
                  onChange={(event) =>
                    setDemandRequestForm((prev) => ({
                      ...prev,
                      transportAmount: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>

          {/* Message */}
          <div className="mt-5">
            <label className="text-sm text-slate-700">
              <span className="flex items-center gap-1.5">
                <FiMessageSquare size={14} className="text-slate-400" />
                Message to Admin
              </span>
              <textarea
                className="mt-1 min-h-[96px] w-full rounded-lg border border-slate-200 px-3 py-2 transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                placeholder="Write your request details..."
                value={demandRequestForm.note}
                onChange={(event) =>
                  setDemandRequestForm((prev) => ({
                    ...prev,
                    note: event.target.value,
                  }))
                }
                maxLength={500}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={feeActionLoading}
            >
              <FiSend size={15} />
              {feeActionLoading ? "Sending..." : "Send Demand Request"}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
              onClick={() => dispatch(fetchMyDemandRequests())}
              disabled={feeLoading}
            >
              <FiRefreshCw size={15} className={feeLoading ? "animate-spin" : ""} />
              {feeLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-800">My Demand Requests</h4>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Year</th>
                  <th className="pb-2 pr-4">Sem</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Message</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 pl-4">Letter</th>
                </tr>
              </thead>
              <tbody>
                {(myDemandRequests || []).map((row) => (
                  <tr key={row._id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{row.academicYear || "-"}</td>
                    <td className="py-2 pr-4">{formatSemesterLabel(row.semesterNo, row.scope)}</td>
                    <td className="py-2 pr-4">{row.status || "-"}</td>
                    <td className="max-w-[220px] truncate py-2 pr-4">{row.note || "-"}</td>
                    <td className="py-2">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString("en-IN")
                        : "-"}
                    </td>
                    <td className="py-2 pl-4">
                      {String(row.status || "").toUpperCase() === "APPROVED" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            onClick={() => handleViewDemandLetter(row._id)}
                          >
                            <FiEye size={13} />
                            View
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            onClick={() => handleDownloadDemandLetter(row._id)}
                          >
                            <FiDownload size={13} />
                            Download
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Array.isArray(myDemandRequests) && myDemandRequests.length === 0 && (
              <p className="mt-3 text-sm text-slate-500">No demand requests submitted yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
    );
  };

  const renderContent = () => {
    if (currentSection === "profile") {
      return <StudentDetails studentData={resolvedStudentData} />;
    }
    if (currentSection === "attendance") {
      return renderAttendancePage();
    }
    if (currentSection === "timetable") {
      return renderTimetablePage();
    }
    if (currentSection === "courses") {
      return (
        <CoursesDetails
          coursesData={coursesData}
          roleDetails={roleDetails}
          onCourseClick={onCourseClick}
        />
      );
    }
    if (currentSection === "exams") {
      return <StudentExamCenter onExamFocusModeChange={setIsExamFocusMode} />;
    }
    if (currentSection === "exam-registration") {
      return <StudentExamRegistration />;
    }
    if (currentSection === "fees") {
      return renderFees();
    }
    if (currentSection === "admit-card") {
      return <StudentAdmitCard />;
    }
    if (currentSection === "hostel") {
      return <StudentHostel />;
    }
    if (currentSection === "jobs") {
      return <StudentExternalJobs />;
    }
    if (currentSection === "linkedin") {
      return <LinkedinAnalyzer />;
    }
    return renderHome();
  };

  return (
    <>
      {!isExamFocusMode && (
        <header
          className={`student-admin-nav ${
            isScrolled ? "is-scrolled" : ""
          }`}
        >
          <div
            className="student-admin-nav-inner student-header-shell h-full"
          >
            <div className="student-admin-nav-left">
              <div className="student-admin-brand">
                <PiStudentBold className="student-admin-brand-icon" />
                <div className="student-admin-brand-copy">
                  <h1>Student Desk</h1>
                  <p>HU ERP PORTAL</p>
                </div>
              </div>
            </div>

            <div className="student-admin-nav-right">
              <div className="student-admin-welcome">
                <span className="student-admin-welcome-name">Welcome {studentName}</span>
                <small className="student-admin-welcome-date">{todayLabel}</small>
              </div>
              <div className="student-admin-nav-actions">
                <NetworkSpeedBadge className="student-nav-speed" />
                <AlertNotifications className="student-nav-alert" />
                <button
                  className="student-admin-logout"
                  type="button"
                  onClick={onLogout}
                >
                  <span aria-hidden="true" className="student-admin-logout-fill" />
                  <span className="student-admin-logout-text">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      {/* Floating menu button - toggle sidebar open/close */}
      {!isExamFocusMode && !isSidebarOpen && (
        <button
          type="button"
          className="student-menu-btn student-menu-float"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
          aria-expanded={isSidebarOpen}
        >
          <FiMenu className="student-sidebar-toggle-icon" />
        </button>
      )}

      <div
        className={`student-admin-layout ${
          isExamFocusMode ? "exam-focus-mode" : isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
      >
        {!isExamFocusMode && isSidebarOpen && (
          <button
            type="button"
            className="student-admin-sidebar-overlay"
            aria-label="Close sidebar overlay"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {!isExamFocusMode && (
          <aside
            id="student-dashboard-sidebar"
            className={`student-admin-sidebar ${isSidebarOpen ? "open" : ""}`}
          >
            <div className="student-admin-sidebar-profile">
              <div className="student-admin-sidebar-profile-main">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="student-admin-sidebar-avatar-img"
                  />
                ) : (
                  <div className="student-admin-sidebar-avatar">{userInitials || "ST"}</div>
                )}
                <div className="student-admin-sidebar-profile-copy">
                  <h2>{studentName}</h2>
                  <p>{studentEmail}</p>
                </div>
              </div>
              <button
                type="button"
                className="student-admin-sidebar-toggle"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <FiMenu />
              </button>
            </div>

            <div className="student-admin-sidebar-menu-scroll">
              <div className="student-admin-sidebar-header">
                <span className="student-admin-sidebar-title">Menu</span>
              </div>

              <div className="student-admin-sidebar-section">
                <label className="student-admin-sidebar-label">DASHBOARD</label>
                {dashboardMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`student-admin-sidebar-btn ${
                        currentSection === item.id ? "active" : ""
                      }`}
                      onClick={() => handleMenuClick(item)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="student-admin-sidebar-section">
                <label className="student-admin-sidebar-label">ACADEMICS</label>
                {academicsMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`student-admin-sidebar-btn ${
                        currentSection === item.id ? "active" : ""
                      }`}
                      onClick={() => handleMenuClick(item)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        <main className="student-admin-content">{renderContent()}</main>
      </div>
    </>
  );
};

export default StudentDashboardShell;
