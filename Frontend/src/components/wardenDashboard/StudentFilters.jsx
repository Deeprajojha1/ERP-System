import React from "react";
import { Search, Filter, X } from "lucide-react";

function StudentFilters({
  searchQuery,
  setSearchQuery,
  selectedFloor,
  setSelectedFloor,
  selectedRoom,
  setSelectedRoom,
  selectedOutpass,
  setSelectedOutpass,
  selectedFeeStatus,
  setSelectedFeeStatus,
  onReset,
  students,
}) {
  // Get unique floors from students
  const floors = [...new Set(students.map((s) => s.floor))].sort((a, b) => a - b);

  // Get unique rooms from students
  const rooms = [...new Set(students.map((s) => s.room))].sort();

  const hasActiveFilters =
    searchQuery || selectedFloor !== "all" || selectedRoom !== "all" ||
    selectedOutpass !== "all" || selectedFeeStatus !== "all";

  return (
    <section aria-label="Student Filters" className="mb-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or student ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Floor Filter */}
        <div>
          <label htmlFor="floor-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Floor
          </label>
          <select
            id="floor-filter"
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All Floors</option>
            {floors.map((floor) => (
              <option key={floor} value={floor}>
                Floor {floor}
              </option>
            ))}
          </select>
        </div>

        {/* Room Filter */}
        <div>
          <label htmlFor="room-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Room
          </label>
          <select
            id="room-filter"
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All Rooms</option>
            {rooms.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </div>

        {/* Outpass Status Filter */}
        <div>
          <label htmlFor="outpass-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Outpass Status
          </label>
          <select
            id="outpass-filter"
            value={selectedOutpass}
            onChange={(e) => setSelectedOutpass(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All Status</option>
            <option value="No Outpass">No Outpass</option>
            <option value="Approved">Approved</option>
            <option value="Exited">Exited</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        {/* Fee Status Filter */}
        <div>
          <label htmlFor="fee-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Fee Status
          </label>
          <select
            id="fee-filter"
            value={selectedFeeStatus}
            onChange={(e) => setSelectedFeeStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Due">Due</option>
          </select>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              Search: {searchQuery}
              <button onClick={() => setSearchQuery("")} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedFloor !== "all" && (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              Floor {selectedFloor}
              <button onClick={() => setSelectedFloor("all")} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedRoom !== "all" && (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              Room: {selectedRoom}
              <button onClick={() => setSelectedRoom("all")} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedOutpass !== "all" && (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              {selectedOutpass}
              <button onClick={() => setSelectedOutpass("all")} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedFeeStatus !== "all" && (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              Fee: {selectedFeeStatus}
              <button onClick={() => setSelectedFeeStatus("all")} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}

export default StudentFilters;
