import React, { useState } from 'react';
import { X, MapPin, Clock, MessageSquare, Image as ImageIcon, CheckCircle, AlertCircle, Loader, Save, XCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

const ComplaintDrawer = ({ complaint, isOpen, onClose, onStatusChange }) => {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(complaint?.status || '');
  const [remarks, setRemarks] = useState(complaint?.remarks || '');

  if (!isOpen || !complaint) return null;

  // Get available next statuses
  const getAvailableStatuses = () => {
    const allStatuses = ['Pending', 'In Progress', 'Resolved'];
    return allStatuses.filter(status => status !== complaint.status);
  };

  // Handle save status change
  const handleSaveStatus = () => {
    if (onStatusChange && newStatus) {
      onStatusChange(complaint.id, newStatus, remarks);
      setIsEditingStatus(false);
      // Reset form for potential future edits
      setNewStatus(complaint.status);
      setRemarks(complaint.remarks || '');
    }
  };

  // Cancel status edit
  const handleCancelEdit = () => {
    setIsEditingStatus(false);
    setNewStatus(complaint.status);
    setRemarks(complaint.remarks || '');
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Timeline icon mapping
  const getTimelineIcon = (status) => {
    switch (status) {
      case 'Pending':
        return Clock;
      case 'In Progress':
        return Loader;
      case 'Resolved':
        return CheckCircle;
      default:
        return AlertCircle;
    }
  };

  // Timeline color mapping
  const getTimelineColors = (status) => {
    switch (status) {
      case 'Pending':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          line: 'bg-yellow-300',
        };
      case 'In Progress':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          line: 'bg-blue-300',
        };
      case 'Resolved':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          line: 'bg-green-300',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          line: 'bg-gray-300',
        };
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}>
        <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl transform transition-all duration-300 ${
          isOpen ? "scale-100" : "scale-95"
        }`}>
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Complaint Details</h2>
              <p className="text-sm text-gray-600">{complaint.id}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">
              Basic Information
            </h3>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-600">Room Number</p>
                  <div className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <p className="font-semibold text-gray-900">{complaint.room}</p>
                  </div>
                </div>
                <StatusBadge status={complaint.status} />
              </div>

              <div>
                <p className="text-xs text-gray-600">Issue Type</p>
                <p className="mt-1 font-medium text-gray-900">{complaint.issueType}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600">Date Created</p>
                <p className="mt-1 text-sm text-gray-700">{formatDateTime(complaint.createdAt)}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600">Last Updated</p>
                <p className="mt-1 text-sm text-gray-700">{formatDateTime(complaint.updatedAt)}</p>
              </div>
            </div>
          </section>

          {/* Description */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">
              Description
            </h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm leading-relaxed text-gray-700">{complaint.description}</p>
            </div>
          </section>

          {/* Image Preview */}
          {complaint.imageUrl && (
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">
                Uploaded Image
              </h3>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <img
                  src={complaint.imageUrl}
                  alt="Complaint"
                  className="h-auto w-full rounded-lg"
                />
              </div>
            </section>
          )}

          {/* Admin/Warden Remarks */}
          {complaint.remarks && !isEditingStatus && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-600">
                <MessageSquare className="h-4 w-4" />
                Remarks
              </h3>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm leading-relaxed text-blue-900">{complaint.remarks}</p>
              </div>
            </section>
          )}

          {/* Status Change Section */}
          <section>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                    Update Status
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">Change complaint status and add notes</p>
                </div>
                {!isEditingStatus && (
                  <button
                    onClick={() => setIsEditingStatus(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Update
                  </button>
                )}
              </div>

              {isEditingStatus && (
                <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                  {/* Current Status Display */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Current Status</label>
                    <div className="mt-2">
                      <StatusBadge status={complaint.status} />
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div>
                    <label htmlFor="status" className="block text-xs font-medium text-gray-700">
                      New Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="status"
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
                    <label htmlFor="remarks" className="block text-xs font-medium text-gray-700">
                      Notes for Status Update
                    </label>
                    <textarea
                      id="remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add any notes or remarks about this status change..."
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
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Timeline */}
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
              Status Timeline
            </h3>
            <div className="relative space-y-6">
              {complaint.timeline.map((item, index) => {
                const Icon = getTimelineIcon(item.status);
                const colors = getTimelineColors(item.status);
                const isLast = index === complaint.timeline.length - 1;

                return (
                  <div key={index} className="relative flex gap-4">
                    {/* Connecting Line */}
                    {!isLast && (
                      <div className="absolute left-5 top-10 h-full w-0.5 -translate-x-1/2">
                        <div className={`h-full w-full ${colors.line}`} />
                      </div>
                    )}

                    {/* Icon */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className={`rounded-full p-2.5 ${colors.bg} ${colors.text}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.status}</h4>
                            <p className="text-xs text-gray-600">
                              {formatDateTime(item.timestamp)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{item.note}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      </div>
    </>
  );
};

export default ComplaintDrawer;
