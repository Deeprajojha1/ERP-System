import { AlertCircle, Bed, DoorOpen, IndianRupee, Users } from "lucide-react";

const STATUS_STYLES = {
  Available: "border-green-500 bg-green-50/50",
  Full: "border-red-500 bg-red-50/50",
  Maintenance: "border-yellow-500 bg-yellow-50/50",
};

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

function RoomCard({ room, onClick }) {
  const statusStyle = STATUS_STYLES[room.status] || "border-gray-300 bg-white";
  const statusBadgeStyle = STATUS_BADGE_STYLES[room.status] || "bg-gray-100 text-gray-700";
  const typeBadgeStyle = TYPE_BADGE_STYLES[room.type] || "bg-gray-100 text-gray-700";

  const capacity = Number(room.capacity || 0);
  const occupied = Number(room.occupied || 0);
  const occupancyPercentage = capacity > 0 ? (occupied / capacity) * 100 : 0;
  const baseFee = Number(room.baseFee || 0);

  return (
    <article
      onClick={() => onClick(room)}
      className={`group relative cursor-pointer rounded-xl border-2 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${statusStyle}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick(room);
        }
      }}
      aria-label={`Room ${room.roomNumber} - ${room.status}`}
    >
      {/* Room Number */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h3 className="text-2xl font-bold text-gray-900">{room.roomNumber}</h3>
        </div>
        {room.hasComplaints && (
          <div className="flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{room.complaintCount}</span>
          </div>
        )}
      </div>

      {/* Room Type & Capacity */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadgeStyle}`}>
          {room.type}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-600">
          <Bed className="h-3.5 w-3.5" aria-hidden="true" />
          {room.capacity} Seater
        </span>
      </div>

      {/* Occupancy Bar */}
      <div className="mb-3">
	        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-medium text-gray-700">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Occupancy
          </span>
	          <span className="font-semibold text-gray-900">
	            {occupied} / {capacity}
	          </span>
	        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${
              occupancyPercentage === 100
                ? "bg-red-500"
                : occupancyPercentage > 66
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
	            style={{ width: `${occupancyPercentage}%` }}
	            role="progressbar"
	            aria-valuenow={occupied}
	            aria-valuemin={0}
	            aria-valuemax={capacity}
	          />
        </div>
      </div>

      {/* Base Fee */}
	      <div className="mb-3 flex items-center gap-1 text-sm text-gray-700">
	        <IndianRupee className="h-4 w-4" aria-hidden="true" />
	        <span className="font-semibold">{baseFee.toLocaleString("en-IN")}</span>
	        <span className="text-xs text-gray-500">/ semester</span>
	      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeStyle}`}>
          {room.status}
        </span>
        <span className="text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
          View Details →
        </span>
      </div>
    </article>
  );
}

export default RoomCard;
