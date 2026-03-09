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
} from "../../redux/feeSlice";
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth >= 769 : true)
  );
  const [isExamFocusMode, setIsExamFocusMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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

  const [hostelAllocation, setHostelAllocation] = useState(null);
  const isHostelStudent = Boolean(hostelAllocation?.hostel?.id && hostelAllocation?.room?.id);
  const defaultAcademicYear =
    roleDetails?.academicYear ||
    `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
  const [demandRequestForm, setDemandRequestForm] = useState({
    academicYear: defaultAcademicYear,
    semesterNo: String(roleDetails?.semester || 1),
    dueDate: "",
    hostelAmount: "0",
    transportAmount: "0",
    note: "",
  });

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

  const currentSection = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/dashboard/profile")) return "profile";
    if (path.includes("/dashboard/attendance")) return "attendance";
    if (path.includes("/dashboard/courses")) return "courses";
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
    { id: "courses", label: "Courses", path: "/dashboard/courses", icon: FiBookOpen },
    { id: "exams", label: "Exams", path: "/dashboard/exams", icon: FiClipboard },
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
  }, [myFeeProfile, myDemands, roleDetails]);

  const formatAmount = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const dateWiseAttendance = useMemo(() => {
    const rows = [];
    (attendanceData || []).forEach((entry) => {
      const course = entry.course || {};
      (entry.recentSessions || []).forEach((session) => {
        rows.push({
          date: session.date,
          courseCode: course.code || "N/A",
          courseName: course.courseName || "Course",
          status: session.status || "no-data",
        });
      });
    });
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    return rows;
  }, [attendanceData]);

  const handleMenuClick = (item) => {
    navigate(item.path);
    if (window.innerWidth < 769) {
      setIsSidebarOpen(false);
    }
  };

  const submitDemandRequest = async (event) => {
    event.preventDefault();
    if (!demandRequestForm.academicYear || !demandRequestForm.semesterNo) {
      toast.error("Academic year and semester are required");
      return;
    }

    try {
      await dispatch(
        createMyDemandRequest({
          academicYear: String(demandRequestForm.academicYear || "").trim(),
          semesterNo: Number(demandRequestForm.semesterNo),
          dueDate: demandRequestForm.dueDate || null,
          hostelAmount: Number(demandRequestForm.hostelAmount || 0),
          transportAmount: Number(demandRequestForm.transportAmount || 0),
          note: String(demandRequestForm.note || "").trim(),
        })
      ).unwrap();
      toast.success("Demand request sent to admin");
      setDemandRequestForm((prev) => ({ ...prev, note: "", dueDate: "" }));
    } catch (error) {
      toast.error(error || "Failed to submit demand request");
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

  const renderDateWiseAttendance = () => (
    <section className="student-attendance-table-card rounded-2xl border border-gray-100 bg-white shadow-md">
      <h3>Date-wise Attendance</h3>
      {dateWiseAttendance.length === 0 ? (
        <p className="student-empty-state">No date-wise attendance data available.</p>
      ) : (
        <div className="student-attendance-table-wrap">
          <table className="student-attendance-table border-separate [border-spacing:0_0.75rem]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dateWiseAttendance.map((row, idx) => (
                <tr
                  key={`${row.date}-${row.courseCode}-${idx}`}
                  className="group transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-sm"
                >
                  <td className="rounded-l-xl border-y border-l border-gray-100 px-4 py-3 transition-all duration-200 ease-in-out group-hover:bg-gray-50">
                    {Number.isNaN(new Date(row.date).getTime())
                      ? "N/A"
                      : new Date(row.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="border-y border-gray-100 px-4 py-3 transition-all duration-200 ease-in-out group-hover:bg-gray-50">
                    {row.courseCode}
                  </td>
                  <td className="border-y border-gray-100 px-4 py-3 transition-all duration-200 ease-in-out group-hover:bg-gray-50">
                    {row.courseName}
                  </td>
                  <td className="rounded-r-xl border-y border-r border-gray-100 px-4 py-3 transition-all duration-200 ease-in-out group-hover:bg-gray-50">
                    <span
                      className={`inline-flex rounded-lg px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-in-out ${
                        row.status === "present"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : row.status === "absent"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-gray-500 hover:bg-gray-600"
                      }`}
                    >
                      {row.status === "present"
                        ? "Present"
                        : row.status === "absent"
                        ? "Absent"
                        : "No Data"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

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
                    <td className="py-2.5 pr-4 text-slate-700">{d.semesterNo || "-"}</td>
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
                      {p.demandId?.semesterNo ? `Sem ${p.demandId.semesterNo}` : "-"}
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
              <label className="text-sm text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FiCalendar size={14} className="text-slate-400" />
                  Due Date (optional)
                </span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  type="date"
                  value={demandRequestForm.dueDate}
                  onChange={(event) =>
                    setDemandRequestForm((prev) => ({
                      ...prev,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
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
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  type="number"
                  min="0"
                  value={demandRequestForm.hostelAmount}
                  onChange={(event) =>
                    setDemandRequestForm((prev) => ({
                      ...prev,
                      hostelAmount: event.target.value,
                    }))
                  }
                />
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
                </tr>
              </thead>
              <tbody>
                {(myDemandRequests || []).map((row) => (
                  <tr key={row._id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{row.academicYear || "-"}</td>
                    <td className="py-2 pr-4">{row.semesterNo || "-"}</td>
                    <td className="py-2 pr-4">{row.status || "-"}</td>
                    <td className="max-w-[220px] truncate py-2 pr-4">{row.note || "-"}</td>
                    <td className="py-2">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString("en-IN")
                        : "-"}
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
      return renderDateWiseAttendance();
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



