import { useMemo, useState } from "react";
import {
  CheckCircle,
  FileText,
  Clock,
  AlertTriangle,
  Eye,
  Filter,
  Calendar as CalendarIcon,
  ScanLine,
  Camera,
  X,
  Download,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import TopNavbar from "./TopNavbar";
import StatCard from "./StatCard";
import OutpassDrawer from "./OutpassDrawer";
import StatusBadge from "./StatusBadge";
import { getOutpassStats } from "./outpassMockData";
import "./wardenScope.css";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { useRef } from "react";
import { fetchWardenProfile } from "../../redux/wardenSlice";
import {
  getWardenOutpassesApi,
  getWardenTodayOutpassesApi,
  scanWardenOutpassQrApi,
  updateWardenOutpassApi,
  getGateSecurityOutpassApi,
  scanGateSecurityOutpassQrApi,
} from "./constants/wardenApi";
import { downloadPdfFromHtml } from "../../utils/pdfDownload";

const normalizeScannedToken = (decodedText) => {
  const raw = String(decodedText || "").trim();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");
  try {
    const parsed = new URL(compact);
    const wrapped =
      parsed.searchParams.get("token") ||
      parsed.searchParams.get("qrToken") ||
      parsed.searchParams.get("data");
    if (wrapped) return String(wrapped).trim();
  } catch (_error) {
    // Ignore parse errors for non-URL QR payloads.
  }

  return compact;
};

function OutpassManagement({ portalRole = "warden" }) {
  const dispatch = useDispatch();
  const profileState = useSelector((state) => state.warden.profile);
  const userData = useSelector((state) => state.user.userData);
  const apiBase = useSelector((state) => state.config.apiBase);
  const isGateSecurity = String(portalRole || "").toLowerCase() === "gatesecurity";
  const [selectedOutpass, setSelectedOutpass] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [outpasses, setOutpasses] = useState([]);
  const [todayOutpassMap, setTodayOutpassMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isDetectingQr, setIsDetectingQr] = useState(false);
  const [reportExporting, setReportExporting] = useState("");
  const [reportRange, setReportRange] = useState("all");
  const [reportSpecificDate, setReportSpecificDate] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const html5QrcodeRef = useRef(null);
  const scanProcessingRef = useRef(false);
  const scannerRegionId = "warden-outpass-qr-reader";

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const stats = useMemo(() => getOutpassStats(outpasses), [outpasses]);

  const profile = useMemo(
    () => ({
      name:
        profileState?.name ||
        userData?.user?.name ||
        (isGateSecurity ? "Gate Security" : "Warden"),
      role:
        profileState?.role ||
        userData?.user?.role ||
        (isGateSecurity ? "Gate Security" : "Warden"),
    }),
    [profileState, userData, isGateSecurity]
  );

  useEffect(() => {
    if (!isGateSecurity) {
      dispatch(fetchWardenProfile());
    }
  }, [dispatch, isGateSecurity]);

  const fetchOutpasses = async () => {
    try {
      setLoading(true);
      setError("");
      const outpassApiCall = isGateSecurity ? getGateSecurityOutpassApi : getWardenOutpassesApi;
      const [payload, todayPayload] = await Promise.all([
        outpassApiCall(),
        isGateSecurity ? Promise.resolve({ outpasses: [] }) : getWardenTodayOutpassesApi(),
      ]);
      const list = Array.isArray(payload?.outpasses) ? payload.outpasses : [];
      const todayList = Array.isArray(todayPayload?.outpasses) ? todayPayload.outpasses : [];
      const todayMap = todayList.reduce((acc, item) => {
        acc[item.id] = item?.comingStatus || "";
        return acc;
      }, {});
      setOutpasses(list);
      setTodayOutpassMap(todayMap);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load outpasses.");
      setOutpasses([]);
      setTodayOutpassMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutpasses();
  }, [isGateSecurity]);

  const summaryCards = [
    {
      id: "approved-count",
      title: isGateSecurity ? "Students Outside" : "Approved Outpasses",
      value: stats.approved,
      delta: isGateSecurity ? "Approved and yet to return" : "Currently active",
      icon: CheckCircle,
    },
    {
      id: "total-outpasses",
      title: "Total Outpasses Taken",
      value: stats.total,
      delta: `${stats.returned} completed`,
      icon: FileText,
    },
    {
      id: "pending-requests",
      title: isGateSecurity ? "Pending Approval" : "Pending Requests",
      value: stats.pending,
      delta: "Awaiting approval",
      icon: Clock,
    },
    {
      id: "overdue-returns",
      title: "Overdue Returns",
      value: stats.overdue,
      delta: stats.overdue > 0 ? "Action required" : "All clear",
      icon: AlertTriangle,
    },
  ];

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatForReport = (dateValue, { dateOnly = false } = {}) => {
    if (!dateValue) return "N/A";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "N/A";
    if (dateOnly) return parsed.toLocaleDateString("en-IN");
    return parsed.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const toLocalDateKey = (dateValue) => {
    if (!dateValue) return "";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getOutpassReferenceDate = (doc) => {
    const raw =
      doc?.fromDate ||
      doc?.appliedAt ||
      doc?.toDate ||
      doc?.dateFrom ||
      doc?.dateTo ||
      doc?.createdAt ||
      doc?.updatedAt ||
      doc?.issuedAt ||
      null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const getReportPeriodMeta = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (reportRange === "today") {
      return { start, end, label: "today" };
    }

    if (reportRange === "week") {
      const day = now.getDay();
      const mondayDiff = day === 0 ? -6 : 1 - day;
      start.setDate(now.getDate() + mondayDiff);
      end.setDate(start.getDate() + 6);
      return { start, end, label: "week" };
    }

    if (reportRange === "month") {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 0);
      return { start, end, label: "month" };
    }

    if (reportRange === "year") {
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      return { start, end, label: "year" };
    }

    if (reportRange === "date") {
      if (!reportSpecificDate) return { start: null, end: null, label: "particular-date" };
      const exact = new Date(reportSpecificDate);
      if (Number.isNaN(exact.getTime())) return { start: null, end: null, label: "particular-date" };
      const exactStart = new Date(exact);
      const exactEnd = new Date(exact);
      exactStart.setHours(0, 0, 0, 0);
      exactEnd.setHours(23, 59, 59, 999);
      return { start: exactStart, end: exactEnd, label: "particular-date" };
    }

    return { start: null, end: null, label: "all" };
  };

  const getReportSourceOutpasses = () => {
    const periodMeta = getReportPeriodMeta();
    const { start, end } = periodMeta;

    const filtered = outpasses.filter((doc) => {
      const currentStatus = String(doc?.status || "").trim();
      if (reportStatusFilter !== "all" && currentStatus !== reportStatusFilter) return false;
      const referenceDate = getOutpassReferenceDate(doc);
      if (!start || !end) {
        return referenceDate ? true : reportRange === "all";
      }
      if (!referenceDate) return false;
      return referenceDate.getTime() >= start.getTime() && referenceDate.getTime() <= end.getTime();
    });

    return filtered.sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
  };

  const getReportRows = (sourceOutpasses) =>
    sourceOutpasses.map((doc, index) => ({
        "S.No": index + 1,
        "Outpass ID": getFirstNonEmpty(doc?.id, doc?._id, "N/A"),
        "Form Date": formatForReport(getFirstNonEmpty(doc?.formDate, doc?.fromDate), { dateOnly: true }),
        "Student Name": getFirstNonEmpty(doc?.student?.name, doc?.studentName, "N/A"),
        Enrollment: getFirstNonEmpty(doc?.student?.enrollmentNumber, "N/A"),
        Branch: getFirstNonEmpty(doc?.branchName, doc?.programName, "N/A"),
        "Room No": getFirstNonEmpty(doc?.roomNumber, doc?.room?.roomNumber, "N/A"),
        Hostel: getFirstNonEmpty(doc?.hostel?.name, "N/A"),
        Purpose: getFirstNonEmpty(doc?.category, "N/A"),
        Destination: getFirstNonEmpty(doc?.destination, "N/A"),
        Reason: getFirstNonEmpty(doc?.reason, "N/A"),
        "Allowed From": formatForReport(doc?.fromDate),
        "Allowed To": formatForReport(doc?.toDate),
        "Parent Contact": getFirstNonEmpty(doc?.parentContact, "N/A"),
        "Emergency Contact": getFirstNonEmpty(doc?.emergencyContact, "N/A"),
        Status: getFirstNonEmpty(doc?.status, "N/A"),
        "Applied At": formatForReport(doc?.appliedAt),
        "Approved At": formatForReport(doc?.approvedAt),
        "Rejected At": formatForReport(doc?.rejectedAt),
        "Approved By": getFirstNonEmpty(doc?.approvedByName, doc?.approvedBy, "N/A"),
        "Rejected By": getFirstNonEmpty(doc?.rejectedBy, "N/A"),
      }));

  const handleDownloadExcelReport = () => {
    try {
      setReportExporting("excel");
      if (reportRange === "date" && !reportSpecificDate) {
        toast.error("Select a particular date for report export.");
        return;
      }
      const sourceOutpasses = getReportSourceOutpasses();
      const rows = getReportRows(sourceOutpasses);
      if (!rows.length) {
        toast.error("No outpass data available for selected report period.");
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Outpass Report");
      const periodLabel = getReportPeriodMeta().label;
      const fileDate = toLocalDateKey(new Date()) || new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Warden_Student_Outpass_Report_${periodLabel}_${fileDate}.xlsx`);
      toast.success("Excel report downloaded.");
    } catch (_error) {
      toast.error("Failed to download Excel report.");
    } finally {
      setReportExporting("");
    }
  };

  const handleDownloadPdfReport = async () => {
    let fallbackWindow = null;
    let html = "";
    try {
      setReportExporting("pdf");
      if (reportRange === "date" && !reportSpecificDate) {
        toast.error("Select a particular date for report export.");
        return;
      }
      const sourceOutpasses = getReportSourceOutpasses();
      if (!sourceOutpasses.length) {
        toast.error("No outpass data available for selected report period.");
        return;
      }
      const esc = (value = "") =>
        String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const rows = getReportRows(sourceOutpasses);
      const headers = Object.keys(rows[0] || {});
      const bodyRows = rows
        .map((row) => `<tr>${headers.map((h) => `<td>${esc(row[h])}</td>`).join("")}</tr>`)
        .join("");
      const columnWidthByHeader = {
        "S.No": "50px",
        "Outpass ID": "210px",
        "Form Date": "74px",
        "Student Name": "70px",
        Enrollment: "112px",
        Branch: "94px",
        "Room No": "56px",
        Hostel: "70px",
        Purpose: "90px",
        Destination: "96px",
        Reason: "142px",
        "Allowed From": "82px",
        "Allowed To": "82px",
        "Parent Contact": "90px",
        "Emergency Contact": "90px",
        Status: "70px",
        "Applied At": "92px",
        "Approved At": "92px",
        "Rejected At": "92px",
        "Approved By": "78px",
        "Rejected By": "78px",
      };
      const colGroup = headers
        .map((header) => `<col style="width:${columnWidthByHeader[header] || "88px"}" />`)
        .join("");

      const periodMeta = getReportPeriodMeta();
      const periodLabelForUser =
        reportRange === "date" && reportSpecificDate
          ? `Particular Date (${reportSpecificDate})`
          : String(periodMeta.label || "all").replace("-", " ").toUpperCase();

      html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #111827; padding: 16px; }
              .meta { margin: 0 0 12px; color: #4b5563; font-size: 11px; }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                font-size: 11px;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 9px 8px;
                text-align: left;
                vertical-align: top;
                line-height: 1.25;
                word-break: keep-all;
                overflow-wrap: normal;
                white-space: normal;
              }
              th {
                background: #f3f4f6;
                font-size: 11px;
                font-weight: 700;
              }
              td:nth-child(2),
              td:nth-child(5),
              td:nth-child(7),
              td:nth-child(14),
              td:nth-child(15),
              td:nth-child(16),
              td:nth-child(17) {
                white-space: nowrap;
                overflow-wrap: normal;
              }
            </style>
          </head>
          <body>
            <p class="meta">Generated on: ${esc(new Date().toLocaleString("en-IN"))} | Report Period: ${esc(periodLabelForUser)} | Records: ${esc(sourceOutpasses.length)}</p>
            <table>
              <colgroup>${colGroup}</colgroup>
              <thead>
                <tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>
              </thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </body>
        </html>
      `;

      const periodLabel = periodMeta.label;
      const fileDate = toLocalDateKey(new Date()) || new Date().toISOString().slice(0, 10);
      const filePrefix = isGateSecurity ? "Gate_Security_Outpass_Report" : "Warden_Student_Outpass_Report";

      if (typeof window !== "undefined") {
        fallbackWindow = window.open("", "_blank", "width=1000,height=800");
      }

      await downloadPdfFromHtml(apiBase, {
        html,
        fileName: `${filePrefix}_${periodLabel}_${fileDate}.pdf`,
        options: {
          landscape: true,
          format: "A4",
          margin: { top: "12mm", right: "8mm", bottom: "12mm", left: "8mm" },
        },
        fallbackToPrint: false,
      });
      if (fallbackWindow) {
        fallbackWindow.close();
        fallbackWindow = null;
      }
      toast.success("PDF report downloaded.");
    } catch (_error) {
      if (fallbackWindow) {
        try {
          fallbackWindow.document.open();
          fallbackWindow.document.write(html);
          fallbackWindow.document.close();
          fallbackWindow.focus();
          fallbackWindow.print();
          toast.success("PDF opened in print dialog.");
          return;
        } catch (_fallbackError) {
          // ignore
        }
      }
      toast.error("Failed to download PDF report.");
    } finally {
      setReportExporting("");
    }
  };

  // Handle status change
  const handleStatusChange = (outpassId, newStatus, remarks) => {
    (async () => {
      try {
        const response = await updateWardenOutpassApi(outpassId, { status: newStatus, remarks });
        const updated = response?.outpass;
        if (!updated?.id) return;
        setOutpasses((prev) => prev.map((op) => (op.id === updated.id ? updated : op)));
        setSelectedOutpass((prevSelected) => (prevSelected?.id === updated.id ? updated : prevSelected));
        await fetchOutpasses();
      } catch (err) {
        alert(err?.response?.data?.message || "Failed to update outpass status.");
      }
    })();
  };

  const stopCameraScanner = () => {
    const toPromise = (value) =>
      value && typeof value.then === "function" ? value : Promise.resolve();

    const scanner = html5QrcodeRef.current;
    if (!scanner) {
      setIsDetectingQr(false);
      return Promise.resolve();
    }
    return (async () => {
      try {
        await toPromise(scanner.stop?.());
      } catch (_error) {
        // Ignore scanner stop errors to avoid blocking scan submission flow.
      }
      try {
        await toPromise(scanner.clear?.());
      } catch (_error) {
        // Ignore scanner clear errors.
      } finally {
        html5QrcodeRef.current = null;
        setIsDetectingQr(false);
      }
    })();
  };

  const verifyTokenDirect = async (token) => {
    if (scanProcessingRef.current) return;
    const normalizedToken = normalizeScannedToken(token);
    if (!normalizedToken) {
      setScanResult({
        ok: false,
        message: "Scanned QR does not contain a valid token",
        phase: "",
        outpass: null,
      });
      return;
    }
    scanProcessingRef.current = true;
    try {
      setScanLoading(true);
      const scanApiCall = isGateSecurity ? scanGateSecurityOutpassQrApi : scanWardenOutpassQrApi;
      const payload = await scanApiCall({ token: normalizedToken });
      setScanResult({
        ok: true,
        message: payload?.message || "Verification successful",
        phase: payload?.phase || "",
        outpass: payload?.outpassDocument || payload?.outpass || null,
      });
      await fetchOutpasses();
    } catch (err) {
      setScanResult({
        ok: false,
        message: err?.response?.data?.message || "Failed to verify QR token",
        phase: "",
        outpass: null,
      });
    } finally {
      setScanLoading(false);
      scanProcessingRef.current = false;
    }
  };

  const startCameraScanner = async () => {
    try {
      setCameraError("");
      await stopCameraScanner();

      const scanner = new Html5Qrcode(scannerRegionId);
      html5QrcodeRef.current = scanner;
      setIsDetectingQr(true);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 340, height: 340 } },
        async (decodedText) => {
          if (scanProcessingRef.current) return;
          const token = normalizeScannedToken(decodedText);
          if (!token) return;
          setIsCameraOpen(false);
          void stopCameraScanner();
          await verifyTokenDirect(token);
        },
        () => {
          // Ignore frame-level decode misses.
        }
      );
    } catch (_error) {
      setCameraError("Camera access denied or unavailable.");
      await stopCameraScanner();
    }
  };

  useEffect(() => {
    if (!isCameraOpen) {
      void stopCameraScanner();
      return;
    }
    void startCameraScanner();
    return () => {
      void stopCameraScanner();
    };
  }, [isCameraOpen]);

  // Filter outpasses
  const filteredOutpasses = useMemo(() => {
    let filtered = [...outpasses];

    if (statusFilter !== "all") {
      filtered = filtered.filter((op) => op.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter((op) => {
        const opDate = new Date(op.fromDate).toISOString().split("T")[0];
        return opDate >= dateFilter;
      });
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    return filtered;
  }, [outpasses, statusFilter, dateFilter]);

  const handleViewDetails = (outpass) => {
    setSelectedOutpass(outpass);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedOutpass(null), 300);
  };

  const getFirstNonEmpty = (...values) => {
    for (const value of values) {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return value;
      }
    }
    return "";
  };

  const getScannedOutpassView = (doc) => ({
    id: getFirstNonEmpty(doc?.id, doc?._id, "N/A"),
    studentName: getFirstNonEmpty(doc?.student?.name, doc?.student?.user?.name, doc?.studentName, "N/A"),
    enrollment: getFirstNonEmpty(doc?.student?.enrollmentNumber, "N/A"),
    branchName: getFirstNonEmpty(doc?.branchName, doc?.programName, "N/A"),
    status: getFirstNonEmpty(doc?.status, "N/A"),
    category: getFirstNonEmpty(doc?.category, "N/A"),
    destination: getFirstNonEmpty(doc?.destination, "N/A"),
    reason: getFirstNonEmpty(doc?.reason, "N/A"),
    emergencyContact: getFirstNonEmpty(doc?.emergencyContact, "N/A"),
    parentContact: getFirstNonEmpty(doc?.parentContact, "N/A"),
    fromDate: getFirstNonEmpty(doc?.fromDate, doc?.dateFrom, null),
    toDate: getFirstNonEmpty(doc?.toDate, doc?.dateTo, null),
    exitTime: getFirstNonEmpty(doc?.exitTime, null),
    entryTime: getFirstNonEmpty(doc?.entryTime, null),
    hostel: getFirstNonEmpty(doc?.hostel?.name, "N/A"),
    room: getFirstNonEmpty(doc?.roomNumber, doc?.room?.roomNumber, "N/A"),
    scanCount: Number(doc?.qr?.scanCount || 0),
    maxScans: Number(doc?.qr?.maxScans || 2),
    qrActive: Boolean(doc?.qr?.active),
  });

  const formatDatePart = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-IN");
  };

  const formatTimePart = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="warden-scope min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#eef4ff] to-[#f4f7fb] text-gray-900">
      <div className="min-h-screen">
        <TopNavbar
          currentDate={currentDate}
          profile={profile}
          onMobileMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)}
          dashboardTitle={isGateSecurity ? "Gate Security Dashboard" : "Warden Dashboard"}
          enableWardenPanels={!isGateSecurity}
          showSidebarToggle={false}
          enableProfileMenu
        />

        <main className="p-6">
            {/* Header */}
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Outpass Management</h1>
              <p className="text-sm text-gray-600">Monitor and manage student outpass requests</p>
            </header>

            {/* Summary Cards */}
            <section aria-label="Outpass Summary" className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <StatCard key={card.id} {...card} />
                ))}
              </div>
            </section>

            {isGateSecurity && (
            <section aria-label="QR Verification" className="mb-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Gate QR Verification</h3>
                </div>
                <p className="mb-3 text-sm text-gray-600">Use camera scan to verify student exit/entry QR.</p>
                <div className="flex flex-col gap-3 md:flex-row">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    disabled={scanLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                    {scanLoading ? "Verifying..." : "Scan Camera"}
                  </button>
                </div>
                {scanResult?.message ? (
                  <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${scanResult.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                    {scanResult.message}
                    {scanResult.phase ? ` (${scanResult.phase})` : ""}
                  </div>
                ) : null}
                {scanResult?.ok && scanResult?.outpass ? (
                  <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                      View scanned outpass document
                    </summary>
                    {(() => {
                      const view = getScannedOutpassView(scanResult.outpass);
                      return (
                        <div className="mt-3 rounded-lg border border-amber-300 bg-[#f8f2e2] p-4 text-[#2b2114]">
                          <div className="border-b border-dashed border-amber-700 pb-2 text-center">
                            <p className="text-2xl font-black tracking-wide">HARIDWAR UNIVERSITY</p>
                            <p className="mt-1 text-lg font-bold">STUDENT LEAVE / OUT PASS</p>
                            <p className="text-sm font-semibold">SECURITY GATE COPY</p>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-250 text-sm sm:grid-cols-2">
                            <p className="flex flex-row">
                              <span className="font-semibold pr-2">Sl.No:</span> {view.id}
                            </p>
                            <p>
                              <span className="font-semibold">Dated:</span> {view.fromDate ? formatDatePart(view.fromDate) : "N/A"}
                            </p>
                          </div>

                          <div className="mt-3 space-y-2 text-sm">
                            <p><span className="font-semibold">Name of Student:</span> {view.studentName}</p>
                            <p><span className="font-semibold">Enrollment:</span> {view.enrollment} | <span className="font-semibold">Branch:</span> {view.branchName}</p>
                            <p><span className="font-semibold">Room No:</span> {view.room} | <span className="font-semibold">Hostel:</span> {view.hostel}</p>
                            <p><span className="font-semibold">Purpose:</span> {view.category} | <span className="font-semibold">Destination:</span> {view.destination}</p>
                            <p>
                              <span className="font-semibold">From:</span> {view.fromDate ? `${formatTimePart(view.fromDate)} on ${formatDatePart(view.fromDate)}` : "N/A"}
                              {"  "}
                              <span className="font-semibold">To:</span> {view.toDate ? `${formatTimePart(view.toDate)} on ${formatDatePart(view.toDate)}` : "N/A"}
                            </p>
                            <p><span className="font-semibold">Return by:</span> {view.toDate ? `${formatTimePart(view.toDate)} on ${formatDatePart(view.toDate)}` : "N/A"}</p>
                            <p><span className="font-semibold">Parent/Emergency Consent Contact:</span> {view.parentContact !== "N/A" ? view.parentContact : view.emergencyContact}</p>
                            <p><span className="font-semibold">Contact No. during outpass:</span> {view.emergencyContact}</p>
                            <p><span className="font-semibold">Address During Leave/Out Pass:</span> {view.destination}</p>
                            <p><span className="font-semibold">Reason:</span> {view.reason}</p>
                          </div>

                          <div className="mt-3 border-t border-dashed border-amber-700 pt-2 text-sm">
                            <p><span className="font-semibold">Actual Time of Departure:</span> {view.exitTime ? formatDateTime(view.exitTime) : "Pending first scan"}</p>
                            <p><span className="font-semibold">Actual Time of Arrival:</span> {view.entryTime ? formatDateTime(view.entryTime) : "Pending second scan"}</p>
                          </div>

                        </div>
                      );
                    })()}
                  </details>
                ) : null}
                {cameraError ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {cameraError}
                  </div>
                ) : null}
              </div>
            </section>
            )}

            {/* Outpass History */}
	            <section aria-label="Outpass History">
	              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
	                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
	                  <div className="flex items-center gap-2">
	                    <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
	                    <h3 className="text-lg font-semibold text-gray-900">Outpass History</h3>
	                  </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!isGateSecurity && (
                        <select
                          value={reportRange}
                          onChange={(e) => setReportRange(e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          aria-label="Select report period"
                        >
                          <option value="all">All</option>
                          <option value="today">Today</option>
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                          <option value="year">Year</option>
                          <option value="date">Choose Date</option>
                        </select>
                      )}
                      {!isGateSecurity && (
                        <select
                          value={reportStatusFilter}
                          onChange={(e) => setReportStatusFilter(e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          aria-label="Select status for report download"
                        >
                          <option value="all">All Status</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      )}
                      {!isGateSecurity && reportRange === "date" ? (
                        <input
                          type="date"
                          value={reportSpecificDate}
                          onChange={(e) => setReportSpecificDate(e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          aria-label="Select particular report date"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={handleDownloadPdfReport}
                          disabled={
                            loading ||
                            reportExporting === "pdf" ||
                            reportExporting === "excel" ||
                            (reportRange === "date" && !reportSpecificDate)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {reportExporting === "pdf" ? "Downloading PDF..." : "Download PDF"}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadExcelReport}
                          disabled={
                            loading ||
                            reportExporting === "pdf" ||
                            reportExporting === "excel" ||
                            (reportRange === "date" && !reportSpecificDate)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {reportExporting === "excel" ? "Downloading Excel..." : "Download Excel"}
                      </button>
                    </div>
	                </div>

	                {error && (
	                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
	                    {error}
	                  </div>
	                )}

                {/* Filters */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="status-filter" className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-600">
                      <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                      Filter by Status
                    </label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Exited">Exited</option>
                      <option value="Returned">Returned</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="date-filter" className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-600">
                      <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      From Date
                    </label>
                    <input
                      type="date"
                      id="date-filter"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

	                {/* Table */}
	                <div className="overflow-x-auto">
	                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Student Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Room No
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          From Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          To Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Destination
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredOutpasses.map((outpass) => (
                        <tr key={outpass.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {outpass?.student?.name || outpass?.studentName || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {outpass?.roomNumber || outpass?.room?.roomNumber || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDateTime(outpass.fromDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDateTime(outpass.toDate)}
                          </td>
	                          <td className="px-4 py-3 text-sm text-gray-900">{outpass.destination || "-"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={outpass.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(outpass)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
	                  </table>

	                  {!loading && filteredOutpasses.length === 0 && (
	                    <div className="py-12 text-center">
	                      <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" aria-hidden="true" />
	                      <p className="text-lg font-semibold text-gray-600">No outpass records found</p>
	                      <p className="text-sm text-gray-500">Try adjusting your filters</p>
	                    </div>
	                  )}

	                  {loading && (
	                    <div className="py-12 text-center">
	                      <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden="true" />
	                      <p className="text-sm font-semibold text-gray-600">Loading outpasses...</p>
	                    </div>
	                  )}
	                </div>
	              </div>
	            </section>
        </main>
      </div>

      {/* Drawers and Modals */}
      <OutpassDrawer
        outpass={selectedOutpass}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onStatusChange={handleStatusChange}
      />

      {isGateSecurity && isCameraOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Scan Student QR</h3>
              <button
                type="button"
                onClick={() => setIsCameraOpen(false)}
                className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
                aria-label="Close scanner"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-black">
              <div id={scannerRegionId} className="min-h-[560px] w-full" />
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {isDetectingQr ? "Point camera at student QR code..." : "Starting camera..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default OutpassManagement;
