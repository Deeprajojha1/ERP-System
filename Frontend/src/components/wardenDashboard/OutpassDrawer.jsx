import { useEffect, useState } from "react";
import {
  X,
  FileText,
	  Calendar,
	  Tag,
	  MapPin,
	  Phone,
	  User,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  LogIn,
  MessageSquare,
  Save,
  XCircle as CancelIcon,
} from "lucide-react";
import Timeline from "./Timeline";
import StatusBadge from "./StatusBadge";

function OutpassDrawer({ outpass, isOpen, onClose, onStatusChange }) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(outpass?.status || "");
  const [remarksText, setRemarksText] = useState("");

  // Get available next statuses
  const getAvailableStatuses = () => {
    if (!outpass) return [];
    const statusProgression = {
      "Pending": ["Approved", "Rejected"],
      "Approved": ["Exited", "Rejected"],
      "Exited": ["Returned", "Rejected"],
      "Rejected": [],
      "Returned": [],
    };
    return statusProgression[outpass.status] || [];
  };

  // Handle save status change
  const handleSaveStatus = () => {
    if (onStatusChange && newStatus) {
      onStatusChange(outpass.id, newStatus, remarksText);
      setIsEditingStatus(false);
      setNewStatus(outpass.status);
      setRemarksText("");
    }
  };

  // Cancel status edit
  const handleCancelEdit = () => {
    setIsEditingStatus(false);
    setNewStatus(outpass.status);
    setRemarksText("");
  };

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!outpass) return null;

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl transform transition-all duration-300 flex flex-col ${
          isOpen ? "scale-100" : "scale-95"
        }`}>
          {/* Header */}
          <header className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-blue-100 p-2 text-blue-700">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="drawer-title" className="text-xl font-bold text-gray-900">
                  Outpass Details
                </h2>
                <p className="text-sm text-gray-600">ID: {outpass.id}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Status Banner */}
            <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50/30 p-4">
              <div>
                <p className="text-sm text-gray-600">Current Status</p>
                <StatusBadge status={outpass.status} />
              </div>
              {outpass.status === "Approved" && (
                <CheckCircle className="h-8 w-8 text-green-500" aria-hidden="true" />
              )}
              {outpass.status === "Rejected" && (
                <XCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
              )}
              {outpass.status === "Exited" && (
                <LogOut className="h-8 w-8 text-blue-500" aria-hidden="true" />
              )}
              {outpass.status === "Returned" && (
                <LogIn className="h-8 w-8 text-gray-500" aria-hidden="true" />
              )}
            </div>

            {/* Outpass Information */}
            <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Outpass Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-gray-600" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">From Date & Time</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDateTime(outpass.fromDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-gray-600" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">To Date & Time</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDateTime(outpass.toDate)}</p>
                  </div>
                </div>

	                <div className="flex items-start gap-3">
	                  <Tag className="mt-0.5 h-5 w-5 text-gray-600" aria-hidden="true" />
	                  <div className="flex-1">
	                    <p className="text-xs text-gray-600">Purpose</p>
	                    <p className="text-sm font-semibold text-gray-900">{outpass.category || "—"}</p>
	                  </div>
	                </div>

	                <div className="flex items-start gap-3">
	                  <MapPin className="mt-0.5 h-5 w-5 text-gray-600" aria-hidden="true" />
	                  <div className="flex-1">
	                    <p className="text-xs text-gray-600">Destination</p>
	                    <p className="text-sm font-semibold text-gray-900">
	                      {outpass.destination || "Not provided"}
	                    </p>
	                  </div>
	                </div>

                <div className="flex items-start gap-3">
	                  <FileText className="mt-0.5 h-5 w-5 text-gray-600" aria-hidden="true" />
	                  <div className="flex-1">
	                    <p className="text-xs text-gray-600">Reason</p>
	                    <p className="text-sm text-gray-900">{outpass.reason || "—"}</p>
	                  </div>
	                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-600" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Emergency Contact</p>
                    <p className="text-sm font-semibold text-gray-900">{outpass.emergencyContact}</p>
                  </div>
                </div>

                {outpass.parentContact && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-600" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">Parent Contact</p>
                      <p className="text-sm font-semibold text-gray-900">{outpass.parentContact}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Approval Information */}
            {outpass.status !== "Pending" && (
              <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {outpass.status === "Rejected" ? "Rejection" : "Approval"} Information
                </h3>
                <div className="space-y-3">
                  {outpass.approvedBy && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-600" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">
                          {outpass.status === "Rejected" ? "Rejected By" : "Approved By"}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">{outpass.approvedBy}</p>
                      </div>
                    </div>
                  )}

                  {outpass.rejectedBy && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-600" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">Rejected By</p>
                        <p className="text-sm font-semibold text-gray-900">{outpass.rejectedBy}</p>
                      </div>
                    </div>
                  )}

                  {outpass.approvedAt && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-gray-600" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">
                          {outpass.status === "Rejected" ? "Rejected At" : "Approved At"}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDateTime(outpass.approvedAt || outpass.rejectedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {outpass.rejectionReason && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-800">Rejection Reason:</p>
                      <p className="mt-1 text-sm text-red-700">{outpass.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Exit/Entry Information */}
            {(outpass.exitTime || outpass.entryTime) && (
              <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Exit/Entry Information
                </h3>
                <div className="space-y-3">
                  {outpass.exitTime && (
                    <div className="flex items-center gap-3">
                      <LogOut className="h-4 w-4 text-purple-600" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">Exit Time</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDateTime(outpass.exitTime)}</p>
                      </div>
                    </div>
                  )}

                  {outpass.entryTime && (
                    <div className="flex items-center gap-3">
                      <LogIn className="h-4 w-4 text-green-600" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">Entry Time</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDateTime(outpass.entryTime)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Status Change Section */}
            <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Update Status
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">Change outpass status and add remarks</p>
                </div>
                {!isEditingStatus && getAvailableStatuses().length > 0 && (
                  <button
                    onClick={() => setIsEditingStatus(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Update
                  </button>
                )}
              </div>

              {isEditingStatus && getAvailableStatuses().length > 0 && (
                <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                  {/* Current Status Display */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Current Status</label>
                    <div className="mt-2">
                      <StatusBadge status={outpass.status} />
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div>
                    <label htmlFor="outpass-status" className="block text-xs font-medium text-gray-700">
                      New Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="outpass-status"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select new status</option>
                      {getAvailableStatuses().map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remarks Textarea */}
                  <div>
                    <label htmlFor="outpass-remarks" className="block text-xs font-medium text-gray-700">
                      Remarks for Status Update
                    </label>
                    <textarea
                      id="outpass-remarks"
                      value={remarksText}
                      onChange={(e) => setRemarksText(e.target.value)}
                      placeholder="Add any remarks or notes about this status change..."
                      rows="3"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 border-t border-gray-200 pt-4">
                    <button
                      onClick={handleSaveStatus}
                      disabled={!newStatus}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <CancelIcon className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Timeline */}
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Activity Timeline
              </h3>
              <Timeline logs={outpass.logs} />
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}

export default OutpassDrawer;
