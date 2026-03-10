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
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import StatCard from "./StatCard";
import OutpassDrawer from "./OutpassDrawer";
import StatusBadge from "./StatusBadge";
import { getOutpassStats } from "./outpassMockData";
import { sidebarItems } from "./mockData";
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
  const isGateSecurity = String(portalRole || "").toLowerCase() === "gatesecurity";
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
      role: profileState?.role || userData?.user?.role || (isGateSecurity ? "gateSecurity" : "warden"),
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
      delta: stats.overdue > 0 ? "⚠️ Action required" : "All clear",
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
        { fps: 10, qrbox: { width: 260, height: 260 } },
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
      <div className="flex">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
          items={sidebarItems}
        />

        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            />
            <div className="relative h-full w-72 border-r border-gray-200 bg-white p-4 shadow-xl">
              <Sidebar
                isCollapsed={false}
                onToggle={() => setIsMobileSidebarOpen(false)}
                items={sidebarItems}
                mobile
              />
            </div>
          </div>
        )}

        <div className="min-h-screen flex-1">
          <TopNavbar
            currentDate={currentDate}
            profile={profile}
            onMobileMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)}
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

            {/* Outpass History */}
	            <section aria-label="Outpass History">
	              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
	                <div className="mb-5 flex items-center justify-between">
	                  <div className="flex items-center gap-2">
	                    <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
	                    <h3 className="text-lg font-semibold text-gray-900">Outpass History</h3>
	                  </div>
	                  <span className="text-sm text-gray-600">
	                    {loading ? "Loading..." : `${filteredOutpasses.length} records`}
	                  </span>
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
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Coming Status
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
                            {formatDateTime(outpass.fromDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDateTime(outpass.toDate)}
                          </td>
	                          <td className="px-4 py-3 text-sm text-gray-900">{outpass.destination || "—"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={outpass.status} />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700">
                            {todayOutpassMap[outpass.id] || "—"}
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
	                      <p className="text-sm font-semibold text-gray-600">Loading outpasses…</p>
	                    </div>
	                  )}
	                </div>
	              </div>
	            </section>
          </main>
        </div>
      </div>

      {/* Drawers and Modals */}
      <OutpassDrawer
        outpass={selectedOutpass}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onStatusChange={handleStatusChange}
      />

      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-2xl">
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
              <div id={scannerRegionId} className="min-h-[420px] w-full" />
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
