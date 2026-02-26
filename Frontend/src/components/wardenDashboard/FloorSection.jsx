import { Building2 } from "lucide-react";
import RoomCard from "./RoomCard";

function FloorSection({ floor, rooms, onRoomClick }) {
  const availableCount = rooms.filter((r) => r.status === "Available").length;
  const fullCount = rooms.filter((r) => r.status === "Full").length;
  const maintenanceCount = rooms.filter((r) => r.status === "Maintenance").length;

  return (
    <section className="mb-8">
      {/* Floor Header */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-100 p-2 text-blue-700">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Floor {floor}</h2>
            <p className="text-sm text-gray-600">{rooms.length} rooms on this floor</p>
          </div>
        </div>

        {/* Floor Statistics */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-600">Available</p>
            <p className="text-lg font-bold text-green-600">{availableCount}</p>
          </div>
          <div className="h-8 w-px bg-gray-300" aria-hidden="true" />
          <div className="text-center">
            <p className="text-xs text-gray-600">Full</p>
            <p className="text-lg font-bold text-red-600">{fullCount}</p>
          </div>
          <div className="h-8 w-px bg-gray-300" aria-hidden="true" />
          <div className="text-center">
            <p className="text-xs text-gray-600">Maintenance</p>
            <p className="text-lg font-bold text-yellow-600">{maintenanceCount}</p>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} onClick={onRoomClick} />
        ))}
      </div>
    </section>
  );
}

export default FloorSection;
