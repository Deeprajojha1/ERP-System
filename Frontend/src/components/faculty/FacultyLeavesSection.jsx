import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import { facultyUi } from "./uiTokens";
import { EmptyState, LoadingState } from "./SectionState";
import {
  fetchFacultyLeaves,
  applyFacultyLeave,
  selectFacultyLeaves,
  selectLeavesLoadState,
  selectApplyLeaveState,
  resetApplyLeaveState,
} from "../../redux/facultyDashboardSlice";

const LEAVE_TYPES = [
  { id: "casual", label: "Casual Leave" },
  { id: "sick", label: "Sick Leave" },
  { id: "annual", label: "Annual Leave" },
  { id: "special", label: "Special Leave" },
  { id: "other", label: "Other" },
];

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-amber-100 text-amber-800",
  },
  approved: {
    icon: CheckCircle,
    label: "Approved",
    className: "bg-emerald-100 text-emerald-800",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "bg-rose-100 text-rose-800",
  },
};

export default function FacultyLeavesSection({ facultyData }) {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const leaves = useSelector(selectFacultyLeaves);
  const loadState = useSelector(selectLeavesLoadState);
  const applyState = useSelector(selectApplyLeaveState);

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "casual",
    dateFrom: "",
    dateTo: "",
    reason: "",
  });

  const isLoading = loadState === ADMIN_LOAD_STATES.PENDING;
  const isApplying = applyState === ADMIN_LOAD_STATES.PENDING;
  const todayIso = new Date().toISOString().split("T")[0];
  const recentLeaves = [...leaves]
    .sort((a, b) => {
      const aDate = new Date(a?.createdAt || a?.dateFrom || 0).getTime();
      const bDate = new Date(b?.createdAt || b?.dateFrom || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 10);

  useEffect(() => {
    if (apiBase && loadState === ADMIN_LOAD_STATES.INITIAL) {
      dispatch(fetchFacultyLeaves({ apiBase }));
    }
  }, [apiBase, loadState, dispatch]);

  const closeLeaveForm = () => {
    setShowApplyForm(false);
    setFormData({ type: "casual", dateFrom: "", dateTo: "", reason: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dateFrom || !formData.dateTo || !formData.reason.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    if (formData.dateFrom < todayIso) {
      toast.error("Leave start date cannot be in the past");
      return;
    }
    if (formData.dateTo < formData.dateFrom) {
      toast.error("Leave end date cannot be before start date");
      return;
    }

    const facultyId = facultyData?.facultyDetails?._id || facultyData?.roleDetails?._id;
    if (!facultyId) {
      toast.error("Faculty ID not found");
      return;
    }

    const formatDate = (isoDate) => {
      const [y, m, d] = isoDate.split("-");
      return `${d}.${m}.${y}`;
    };

    try {
      await dispatch(
        applyFacultyLeave({
          apiBase,
          payload: {
            faculty: facultyId,
            type: formData.type,
            dateFrom: formatDate(formData.dateFrom),
            dateTo: formatDate(formData.dateTo),
            reason: formData.reason.trim(),
            status: "pending",
          },
        })
      ).unwrap();
      toast.success("Leave application submitted successfully");
      closeLeaveForm();
      dispatch(resetApplyLeaveState());
    } catch {
      toast.error("Failed to submit leave application");
      dispatch(resetApplyLeaveState());
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "N/A";
    if (dateStr.includes(".")) {
      const [d, m, y] = dateStr.split(".");
      return new Date(`${y}-${m}-${d}`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLeaveTypeLabel = (type) =>
    LEAVE_TYPES.find((t) => t.id === type)?.label || type;

  if (showApplyForm) {
    return (
      <section className={facultyUi.page}>
        <div className="mx-auto max-w-3xl">
          <div className={facultyUi.panel}>
            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={closeLeaveForm}
            >
              <ArrowLeft size={16} />
              <span>Back to Leave Management</span>
            </button>

            <div className="mb-4">
              <h3 className="m-0 text-xl font-bold text-slate-900">Apply for Leave</h3>
              <p className="mt-1 text-sm text-slate-600">
                Fill in leave details to submit your request for approval.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Leave Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">From Date</label>
                  <input
                    type="date"
                    value={formData.dateFrom}
                    onChange={(e) => {
                      const nextFrom = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        dateFrom: nextFrom,
                        dateTo: prev.dateTo && prev.dateTo < nextFrom ? nextFrom : prev.dateTo,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                    min={todayIso}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">To Date</label>
                  <input
                    type="date"
                    value={formData.dateTo}
                    onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                    min={formData.dateFrom || todayIso}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  placeholder="Please provide a reason for your leave..."
                  rows={5}
                  required
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeLeaveForm}
                  disabled={isApplying}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <>
                      <ClipLoader size={16} color="#fff" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={facultyUi.page}>
      <div className={facultyUi.pageHeader}>
        <div>
          <h2 className={facultyUi.title}>Leave Management</h2>
          <p className={facultyUi.subtitle}>Apply and track your leave requests</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700"
          onClick={() => setShowApplyForm(true)}
        >
          <Plus size={18} />
          <span>Apply Leave</span>
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Leaves</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-100">
              <Calendar size={20} color="#2563eb" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            {leaves.length}
          </p>
        </div>
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Pending</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-amber-100">
              <Clock size={20} color="#f59e0b" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            {leaves.filter((l) => l.status === "pending").length}
          </p>
        </div>
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Approved</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-emerald-100">
              <CheckCircle size={20} color="#10b981" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            {leaves.filter((l) => l.status === "approved").length}
          </p>
        </div>
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Rejected</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-rose-100">
              <XCircle size={20} color="#ef4444" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            {leaves.filter((l) => l.status === "rejected").length}
          </p>
        </div>
      </div>

      <div className={facultyUi.panel}>
        <h3 className="m-0 mb-4 text-lg font-bold tracking-[0.2px] text-slate-900">Leave History</h3>
        {isLoading ? (
          <LoadingState message="Loading leave applications..." minHeight="min-h-56" />
        ) : recentLeaves.length === 0 ? (
          <EmptyState message="No leave applications found" minHeight="min-h-56" />
        ) : (
          <div className="flex flex-col gap-3">
            {recentLeaves.map((leave) => {
              const statusConfig = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={leave._id}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-600" />
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                        <FileText size={12} className="mr-1 inline" />
                        {getLeaveTypeLabel(leave.type)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
                      >
                        <StatusIcon size={14} />
                        <span>{statusConfig.label}</span>
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p className="m-0 inline-flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span className="font-medium text-slate-700">From:</span>{" "}
                        {formatDisplayDate(leave.dateFrom)}
                      </p>
                      <p className="m-0 inline-flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span className="font-medium text-slate-700">To:</span>{" "}
                        {formatDisplayDate(leave.dateTo)}
                      </p>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {leave.reason || "No reason provided."}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
