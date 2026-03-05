import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Building2,
  BedDouble,
  DoorOpen,
  Wrench,
  Users,
  Search,
  Filter,
  SortAsc,
} from "lucide-react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import StatCard from "./StatCard";
import FloorSection from "./FloorSection";
import RoomDrawer from "./RoomDrawer";
import "./wardenScope.css";
import { getRoomsSummary } from "./roomMockData";
import { sidebarItems } from "./mockData";
import { fetchWardenProfile } from "../../redux/wardenSlice";
import { getWardenRoomsApi } from "./constants/wardenApi";

function RoomManagement() {
  const dispatch = useDispatch();
  const profileState = useSelector((state) => state.warden.profile);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("room"); // room, occupancy, floor

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

  // Filter and sort rooms
  const filteredRooms = useMemo(() => {
    let filtered = [...rooms];

    // Filter by floor
    if (selectedFloor !== "all") {
      filtered = filtered.filter((room) => room.floor === parseInt(selectedFloor));
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((room) => room.status === selectedStatus);
    }

    // Search by room number
    if (searchQuery) {
      filtered = filtered.filter((room) =>
        room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "room") {
        return a.roomNumber.localeCompare(b.roomNumber);
      } else if (sortBy === "occupancy") {
        return b.occupied - a.occupied;
      } else if (sortBy === "floor") {
        return a.floor - b.floor;
      }
      return 0;
    });

    return filtered;
  }, [rooms, selectedFloor, selectedStatus, searchQuery, sortBy]);

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const grouped = {};
    filteredRooms.forEach((room) => {
      if (!grouped[room.floor]) {
        grouped[room.floor] = [];
      }
      grouped[room.floor].push(room);
    });
    return grouped;
  }, [filteredRooms]);

  const floors = Object.keys(roomsByFloor).sort((a, b) => parseInt(a) - parseInt(b));

  const summary = useMemo(() => getRoomsSummary(rooms), [rooms]);

  const profile = useMemo(
    () => ({
      name: profileState?.name || "Warden",
      role: profileState?.role || "warden",
    }),
    [profileState]
  );

  useEffect(() => {
    dispatch(fetchWardenProfile());
  }, [dispatch]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await getWardenRoomsApi();
        setRooms(Array.isArray(payload?.rooms) ? payload.rooms : []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load rooms.");
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const summaryCards = [
    {
      id: "total-rooms",
      title: "Total Rooms",
      value: summary.totalRooms,
      delta: `${summary.totalCapacity} bed capacity`,
      icon: Building2,
    },
    {
      id: "available-rooms",
      title: "Available Rooms",
      value: summary.availableRooms,
      delta: "Ready for allocation",
      icon: DoorOpen,
    },
    {
      id: "full-rooms",
      title: "Full Rooms",
      value: summary.fullRooms,
      delta: "At max capacity",
      icon: BedDouble,
    },
    {
      id: "maintenance-rooms",
      title: "Under Maintenance",
      value: summary.maintenanceRooms,
      delta: "Temporarily unavailable",
      icon: Wrench,
    },
    {
      id: "occupied-beds",
      title: "Occupied Beds",
      value: summary.totalOccupiedBeds,
      delta: `of ${summary.totalCapacity} total`,
      icon: Users,
    },
  ];

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedRoom(null), 300);
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
            {/* Header Section */}
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
              <p className="text-sm text-gray-600">Monitor occupancy and room details</p>
            </header>

            {/* Summary Cards */}
            <section aria-label="Room Summary" className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map((card) => (
                  <StatCard key={card.id} {...card} />
                ))}
              </div>
            </section>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Filters Section */}
            <section
              aria-label="Filters"
              className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Filter className="h-4 w-4" aria-hidden="true" />
                Filters & Search
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Floor Filter */}
                <div>
                  <label htmlFor="floor-filter" className="mb-2 block text-xs font-medium text-gray-600">
                    Floor
                  </label>
                  <select
                    id="floor-filter"
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">All Floors</option>
                    <option value="1">Floor 1</option>
                    <option value="2">Floor 2</option>
                    <option value="3">Floor 3</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label htmlFor="status-filter" className="mb-2 block text-xs font-medium text-gray-600">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">All Status</option>
                    <option value="Available">Available</option>
                    <option value="Full">Full</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label htmlFor="room-search" className="mb-2 block text-xs font-medium text-gray-600">
                    Search Room
                  </label>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      aria-hidden="true"
                    />
                    <input
                      id="room-search"
                      type="text"
                      placeholder="Room number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label htmlFor="sort-by" className="mb-2 block text-xs font-medium text-gray-600">
                    Sort By
                  </label>
                  <div className="relative">
                    <SortAsc
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      aria-hidden="true"
                    />
                    <select
                      id="sort-by"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="room">Room Number</option>
                      <option value="occupancy">Occupancy</option>
                      <option value="floor">Floor</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filters Display */}
              {(selectedFloor !== "all" || selectedStatus !== "all" || searchQuery) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-600">Active filters:</span>
                  {selectedFloor !== "all" && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      Floor {selectedFloor}
                    </span>
                  )}
                  {selectedStatus !== "all" && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {selectedStatus}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      Search: {searchQuery}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFloor("all");
                      setSelectedStatus("all");
                      setSearchQuery("");
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </section>

            {/* Rooms by Floor */}
            {loading ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-blue-50/40 p-12 text-center">
                <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-gray-600">Loading rooms...</p>
              </div>
            ) : floors.length > 0 ? (
              <section aria-label="Rooms by Floor">
                {floors.map((floor) => (
                  <FloorSection
                    key={floor}
                    floor={parseInt(floor)}
                    rooms={roomsByFloor[floor]}
                    onRoomClick={handleRoomClick}
                  />
                ))}
              </section>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-400" aria-hidden="true" />
                <p className="text-lg font-semibold text-gray-600">No rooms found</p>
                <p className="text-sm text-gray-500">Try adjusting your filters</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Room Details Drawer */}
      <RoomDrawer room={selectedRoom} isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
    </div>
  );
}

export default RoomManagement;
