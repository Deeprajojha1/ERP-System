import { useEffect, useState } from "react";
import { X, Phone, Mail, MapPin, Calendar, AlertCircle, History, FileText, DollarSign } from "lucide-react";
import { getOutpassHistory, getComplaintHistory } from "./studentMockData";

function StudentDrawer({ student, isOpen, onClose }) {
  const [outpassHistory, setOutpassHistory] = useState([]);
  const [complaintHistory, setComplaintHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !student) return;
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const studentId = student?._id || student?.id;
        const [outpasses, complaints] = await Promise.all([
          getOutpassHistory(studentId),
          getComplaintHistory(studentId),
        ]);
        if (!isMounted) return;
        setOutpassHistory(Array.isArray(outpasses) ? outpasses : []);
        setComplaintHistory(Array.isArray(complaints) ? complaints : []);
      } catch (error) {
        void error;
        if (!isMounted) return;
        setOutpassHistory([]);
        setComplaintHistory([]);
      } finally {
        if (isMounted) setHistoryLoading(false);
      }
    };
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [isOpen, student]);

  if (!student) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl lg:rounded-xl shadow-2xl transform transition-all duration-300 ${
          isOpen ? "scale-100" : "scale-95"
        }`}>
          {/* Header */}
          <div className="sticky top-0 border-b border-gray-200 bg-white px-6 py-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
                <p className="mt-1 text-sm text-gray-600">{student.id}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close drawer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-6">
          {/* Section 1: Student Info */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Email</p>
                <div className="mt-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">{student.email}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Phone</p>
                <div className="mt-2 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">{student.phone}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Guardian Name</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{student.guardianName}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Guardian Contact</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{student.guardianPhone}</p>
              </div>
            </div>
            {student.disciplinaryFlag && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-900">Disciplinary Flag Active</p>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Room Allocation */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">Room Allocation</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Hostel</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{student.hostel}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Room Number</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{student.room}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Floor</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{student.floor}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Bed Type</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{student.bed}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 sm:col-span-2">
                <p className="text-sm text-gray-600">Allocation Date</p>
                <div className="mt-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">{student.allocationDate}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Outpass Overview */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Outpass Status</h3>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                student.outpassStatus === "Approved" ? "bg-green-100 text-green-800" :
                student.outpassStatus === "Exited" ? "bg-blue-100 text-blue-800" :
                student.outpassStatus === "Overdue" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {student.outpassStatus}
              </span>
	            </div>
	            <div className="space-y-2">
	              {historyLoading ? (
	                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
	                  Loading outpass history…
	                </div>
	              ) : (
	                outpassHistory.slice(0, 3).map((record) => (
	                  <div key={record.id} className="rounded-lg bg-gray-50 p-3 text-sm">
	                    <div className="flex items-center justify-between">
	                      <p className="font-medium text-gray-900">{record.date}</p>
	                      <span
	                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
	                          record.status === "Returned"
	                            ? "bg-green-100 text-green-800"
	                            : "bg-blue-100 text-blue-800"
	                        }`}
	                      >
	                        {record.status}
	                      </span>
	                    </div>
	                    {record.returnTime && (
	                      <p className="mt-1 text-gray-600">Returned: {record.returnTime}</p>
	                    )}
	                  </div>
	                ))
	              )}
	            </div>
            <button
              type="button"
              className="w-full rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              View Outpass History
            </button>
          </section>

          {/* Section 4: Complaint Overview */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Complaints</h3>
              <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                {student.complaintCount} Total
              </span>
            </div>
            <div className="space-y-2">
              {complaintHistory.slice(0, 3).map((complaint) => (
                <div 
                  key={complaint.id} 
                  className={`rounded-lg p-3 text-sm ${
                    complaint.status === "Resolved" ? "bg-green-50 border border-green-200" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{complaint.issueType}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      complaint.status === "Resolved" ? "bg-green-100 text-green-800" :
                      complaint.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {complaint.status}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600">{complaint.createdAt}</p>
                  {complaint.status === "Resolved" && (
                    <p className="mt-2 text-xs text-green-700 font-medium">✓ This complaint cannot be modified</p>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-not-allowed opacity-60"
              disabled
            >
              View All Complaints (Read-only)
            </button>
          </section>

          {/* Section 5: Fee Overview */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">Fee Status</h3>
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Current Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                    student.feeStatus === "Paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {student.feeStatus}
                  </span>
                </div>
              </div>
              {student.dueAmount > 0 && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                  <p className="text-sm text-gray-600">Amount Due</p>
                  <p className="mt-2 text-2xl font-bold text-red-900">₹{student.dueAmount.toLocaleString()}</p>
                </div>
              )}
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Last Payment</p>
                <p className="mt-2 text-sm font-medium text-gray-900">{student.lastPaymentDate}</p>
              </div>
            </div>
          </section>

          {/* Section 6: Quick Actions */}
          <section className="space-y-3 border-t border-gray-200 pt-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <button
              type="button"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Add Disciplinary Note
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            >
              View Full Profile
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            >
              Request Room Change
            </button>
          </section>
        </div>
      </div>
      </div>
    </>
  )
}

export default StudentDrawer;
