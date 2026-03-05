import { useEffect } from "react";
import {
  X,
  DoorOpen,
  Users,
  Bed,
  IndianRupee,
  AlertCircle,
  FileText,
  History,
  Wrench,
  Eye,
} from "lucide-react";

const STATUS_BADGE_STYLES = {
  Available: "bg-green-100 text-green-800",
  Full: "bg-red-100 text-red-800",
  Maintenance: "bg-yellow-100 text-yellow-800",
};

const TYPE_BADGE_STYLES = {
  Normal: "bg-gray-100 text-gray-700",
  "Semi-Deluxe": "bg-blue-100 text-blue-700",
  Deluxe: "bg-purple-100 text-purple-700",
};

function RoomDrawer({ room, isOpen, onClose }) {
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

  if (!room) return null;

  const statusBadgeStyle = STATUS_BADGE_STYLES[room.status] || "bg-gray-100 text-gray-700";
  const typeBadgeStyle = TYPE_BADGE_STYLES[room.type] || "bg-gray-100 text-gray-700";
  const baseFee = Number(room.baseFee || 0);

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
                <DoorOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="drawer-title" className="text-xl font-bold text-gray-900">
                  Room {room.roomNumber}
                </h2>
                <p className="text-sm text-gray-600">Floor {room.floor}</p>
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
            {/* Room Details Card */}
            <section className="mb-6 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50/30 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Room Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs text-gray-600">Room Type</p>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${typeBadgeStyle}`}>
                    {room.type}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-xs text-gray-600">Status</p>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeStyle}`}>
                    {room.status}
                  </span>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs text-gray-600">
                    <Bed className="h-3.5 w-3.5" aria-hidden="true" />
                    Capacity
                  </p>
                  <p className="text-lg font-bold text-gray-900">{room.capacity} Seater</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs text-gray-600">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Occupancy
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {room.occupied} / {room.capacity}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="mb-1 flex items-center gap-1 text-xs text-gray-600">
                    <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
                    Base Fee
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    ₹{baseFee.toLocaleString("en-IN")}
                    <span className="ml-2 text-sm font-normal text-gray-500">per semester</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Occupants Section */}
            <section className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <Users className="h-4 w-4" aria-hidden="true" />
                Current Occupants ({room.occupants.length})
              </h3>
              {room.occupants.length > 0 ? (
                <ul className="space-y-2">
                  {room.occupants.map((occupant) => (
                    <li
                      key={occupant.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{occupant.name}</p>
                        <p className="text-xs text-gray-600">ID: {occupant.id}</p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {occupant.enrollmentYear}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-gray-400" aria-hidden="true" />
                  <p className="text-sm text-gray-600">No occupants currently</p>
                </div>
              )}
            </section>

            {/* Complaint Summary */}
            {room.hasComplaints && (
              <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" aria-hidden="true" />
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-red-800">Active Complaints</h3>
                    <p className="text-sm text-red-700">
                      {room.complaintCount} complaint{room.complaintCount !== 1 ? "s" : ""} pending for this room
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Quick Actions */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50"
                  onClick={() => {
                    // Integration: Navigate to occupants view
                    console.log("View occupants for room:", room.roomNumber);
                  }}
                >
                  <Eye className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">View Occupants</p>
                    <p className="text-xs text-gray-600">See detailed student information</p>
                  </div>
                </button>

                <button
                  type="button"
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-orange-300 hover:bg-orange-50"
                  onClick={() => {
                    // Integration: Navigate to complaints view
                    console.log("View complaints for room:", room.roomNumber);
                  }}
                >
                  <FileText className="h-5 w-5 text-orange-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">View Complaints</p>
                    <p className="text-xs text-gray-600">Check complaint history</p>
                  </div>
                </button>

                <button
                  type="button"
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-purple-300 hover:bg-purple-50"
                  onClick={() => {
                    // Integration: View allocation history
                    console.log("View history for room:", room.roomNumber);
                  }}
                >
                  <History className="h-5 w-5 text-purple-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">Allocation History</p>
                    <p className="text-xs text-gray-600">Past occupant records</p>
                  </div>
                </button>

                {room.status !== "Maintenance" && (
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-left transition-all hover:border-yellow-400 hover:bg-yellow-100"
                    onClick={() => {
                      // Integration: Update room status
                      console.log("Mark as maintenance:", room.roomNumber);
                      alert(`Room ${room.roomNumber} marked for maintenance (Mock action)`);
                    }}
                  >
                    <Wrench className="h-5 w-5 text-yellow-700" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-yellow-900">Mark as Maintenance</p>
                      <p className="text-xs text-yellow-700">Temporarily close this room</p>
                    </div>
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}

export default RoomDrawer;
