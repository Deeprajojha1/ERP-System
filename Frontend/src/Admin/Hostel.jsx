import { useEffect, useState } from "react";
import {
  getHostelSummaryApi,
  createHostelApi,
  deleteHostelApi,
} from "./constants/hostelApi";
import {
  getRoomsByHostelApi,
  createRoomApi,
  updateRoomApi,
  deleteRoomApi,
} from "./constants/roomApi";
import {
  allocateStudentApi,
  vacateStudentApi,
} from "./constants/allocationApi";
import "./Hostel.css";

const Hostel = () => {
  // ================= STATE =================

  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedHostel, setSelectedHostel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);

  const [studentIdInput, setStudentIdInput] = useState("");

  const [newHostel, setNewHostel] = useState({
    name: "",
    type: "Boys",
    totalFloors: "",
    warden: "",
  });

  const [newRoom, setNewRoom] = useState({
    roomNumber: "",
    floorNumber: "",
    capacity: 1,
    price: "",
    priceType: "Yearly",
  });

  // ================= 🔥 NEW LOADER STATES (ADDED) =================
  const [createHostelLoading, setCreateHostelLoading] = useState(false); // loader for create hostel
  const [deleteHostelLoading, setDeleteHostelLoading] = useState(null); // loader for specific hostel delete
  const [createRoomLoading, setCreateRoomLoading] = useState(false); // loader for create room
  const [deleteRoomLoading, setDeleteRoomLoading] = useState(null); // loader for specific room delete
  const [allocateLoading, setAllocateLoading] = useState(false); // loader for allocation
  const [vacateLoading, setVacateLoading] = useState(null); // loader for specific student vacate
  const [editingRoom, setEditingRoom] = useState(null);

  // ================= FETCH HOSTELS =================

  const fetchHostels = async () => {
    const data = await getHostelSummaryApi();
    const normalizedHostels = Array.isArray(data)
      ? data
      : Array.isArray(data?.hostels)
      ? data.hostels
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.summary)
      ? data.summary
      : [];
    setHostels(normalizedHostels);
    setLoading(false);
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  // ================= HOSTEL ACTIONS =================

  const handleCreateHostel = async () => {
    setCreateHostelLoading(true); // 🔥 START LOADER

    await createHostelApi(newHostel);

    setCreateHostelLoading(false); // 🔥 STOP LOADER
    setShowModal(false);

    setNewHostel({
      name: "",
      type: "Boys",
      totalFloors: "",
      warden: "",
    });

    fetchHostels();
  };

  const handleDeleteHostel = async (id) => {
    setDeleteHostelLoading(id); // 🔥 START LOADER FOR THIS HOSTEL

    await deleteHostelApi(id);

    setDeleteHostelLoading(null); // 🔥 STOP LOADER
    setSelectedHostel(null);

    fetchHostels();
  };

  const totals = hostels.reduce(
  (acc, hostel) => {
    acc.totalHostels += 1;
    acc.totalCapacity += hostel.totalCapacity || 0;
    acc.totalOccupied += hostel.currentOccupancy || 0;
    acc.totalPotentialRevenue += hostel.totalPotentialRevenue || 0;
    acc.totalCurrentRevenue += hostel.currentRevenue || 0;
    acc.totalVacancyLoss += hostel.vacancyLoss || 0;
    return acc;
  },
  {
    totalHostels: 0,
    totalCapacity: 0,
    totalOccupied: 0,
    totalPotentialRevenue: 0,
    totalCurrentRevenue: 0,
    totalVacancyLoss: 0,
  }
);

  // ================= ROOM ACTIONS =================

  const fetchRooms = async (hostelId) => {
    const data = await getRoomsByHostelApi(hostelId);
    const normalizedRooms = Array.isArray(data)
      ? data
      : Array.isArray(data?.rooms)
      ? data.rooms
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.list)
      ? data.list
      : [];
    setRooms(normalizedRooms);
  };

  const handleSaveRoom = async () => {
  setCreateRoomLoading(true);

  try {
    if (editingRoom) {
      await updateRoomApi(editingRoom._id, newRoom);
    } else {
      await createRoomApi({
        ...newRoom,
        hostel: selectedHostel.id,
      });
    }

    setShowRoomModal(false);
    setEditingRoom(null);

    setNewRoom({
      roomNumber: "",
      floorNumber: "",
      capacity: 1,
      price: "",
      priceType: "Yearly",
    });

    fetchRooms(selectedHostel.id);
    fetchHostels();

  } catch (error) {
  console.log(error.response);
  alert(error.response?.data?.message || error.message);
}

  setCreateRoomLoading(false);
};

  const handleDeleteRoom = async (roomId) => {
    setDeleteRoomLoading(roomId); // 🔥 START LOADER

    await deleteRoomApi(roomId);

    setDeleteRoomLoading(null); // 🔥 STOP LOADER

    fetchRooms(selectedHostel.id);
    fetchHostels();
  };

  // ================= ALLOCATION ACTIONS =================

  const handleAllocateStudent = async () => {
    setAllocateLoading(true); // 🔥 START LOADER

    await allocateStudentApi({
      enrollmentNumber: studentIdInput,
      roomId: selectedRoom._id,
    });

    setAllocateLoading(false); // 🔥 STOP LOADER
    setShowAllocateModal(false);
    setStudentIdInput("");

    fetchRooms(selectedHostel.id);
    fetchHostels();
  };

  const handleVacateStudent = async (studentId) => {
    setVacateLoading(studentId); // 🔥 START LOADER

    await vacateStudentApi(studentId);

    setVacateLoading(null); // 🔥 STOP LOADER

    fetchRooms(selectedHostel.id);
    fetchHostels();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="hostel-container">
      <div className="hostel-header">
        <h2>Hostel Dashboard</h2>
        <button onClick={() => setShowModal(true)}>+ Create Hostel</button>
      </div>

      {/* ================= SUMMARY GRID ================= */}
      <div className="summary-grid">
        <div className="summary-card">
          <h4>Total Hostels</h4>
          <p>{totals.totalHostels}</p>
        </div>
        <div className="summary-card">
          <h4>Total Capacity</h4>
          <p>{totals.totalCapacity}</p>
        </div>
        <div className="summary-card green">
          <h4>Total Current Revenue</h4>
          <p>₹{totals.totalCurrentRevenue.toLocaleString()}</p>
        </div>
        <div className="summary-card red">
          <h4>Total Vacancy Loss</h4>
          <p>₹{totals.totalVacancyLoss.toLocaleString()}</p>
        </div>
      </div>

      {/* ================= HOSTEL CARDS ================= */}
      <div className="hostel-grid">
        {hostels.map((hostel) => (
          <div
            key={hostel.id}
            className={`hostel-card ${
              selectedHostel?.id === hostel.id ? "active-hostel" : ""
            }`}
            onClick={() => {
              setSelectedHostel(hostel);
              fetchRooms(hostel.id);
            }}
          >
            <h3>{hostel.name}</h3>
            {hostel.vacancyLoss > 0 && (
  <span
    style={{
      fontSize: "11px",
      color: "#dc2626",
      fontWeight: 600,
    }}
  >
    ⚠ Revenue Leakage Detected
  </span>
)}
            <p>Total Capacity: {hostel.totalCapacity}</p>
            <p>Occupied: {hostel.currentOccupancy}</p>
            <p>Available Beds: {hostel.availableBeds}</p>
            <p>Occupancy: {hostel.occupancyPercentage}%</p>

<hr style={{ margin: "10px 0", opacity: 0.1 }} />

<p>
  Potential Revenue: ₹
  {hostel.totalPotentialRevenue.toLocaleString()}
</p>

<p style={{ color: "#059669", fontWeight: 600 }}>
  Current Revenue: ₹
  {hostel.currentRevenue.toLocaleString()}
</p>

<p style={{ color: "#dc2626", fontWeight: 600 }}>
  Vacancy Loss: ₹
  {hostel.vacancyLoss.toLocaleString()}
</p>

            <button
              className="delete-btn"
              disabled={deleteHostelLoading === hostel.id}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteHostel(hostel.id);
              }}
            >
              {deleteHostelLoading === hostel.id
                ? "Deleting..."
                : "Delete"}
            </button>
          </div>
        ))}
      </div>

      {/* ================= ROOM SECTION ================= */}
      {selectedHostel && (
        <div className="room-section">
          <h3>Rooms - {selectedHostel.name}</h3>
          <button onClick={() => setShowRoomModal(true)}>+ Add Room</button>

          <div className="room-grid">
            {rooms.map((room) => (
              <div key={room._id} className="room-card">
                <h4>Room {room.roomNumber}</h4>
                <p>Price: ₹{room.price} ({room.priceType})</p>
                <p>Floor: {room.floorNumber}</p>
                <p>Capacity: {room.capacity}</p>
                <p>Status: {room.status}</p>

                {/* 🔥 Occupancy Progress */}
{(() => {
  const occupied = room.occupants?.length || 0;
  const percentage =
    room.capacity === 0
      ? 0
      : Math.round((occupied / room.capacity) * 100);

  let barColor = "#059669"; // green

  if (percentage > 80) barColor = "#dc2626"; // red
  else if (percentage > 50) barColor = "#d97706"; // yellow

  return (
    <div className="occupancy-wrapper">
      <div className="occupancy-label">
        {occupied}/{room.capacity} Beds Occupied ({percentage}%)
      </div>
      <div className="occupancy-bar">
        <div
          className="occupancy-fill"
          style={{
            width: `${percentage}%`,
            background: barColor,
          }}
        />
      </div>
    </div>
  );
})()}

                <div>
                  <p>Occupants: {room.occupants?.length}</p>

                  {room.occupants?.map((student) => (
                    <div key={student._id} className="occupant-item">
                      <span>{student.user.name}</span>

                      <button
                        disabled={vacateLoading === student._id}
                        onClick={() =>
                          handleVacateStudent(student._id)
                        }
                      >
                        {vacateLoading === student._id
                          ? "Vacating..."
                          : "Vacate"}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowAllocateModal(true);
                  }}
                >
                  Allocate Student
                </button>

                <button
  onClick={() => {
    setEditingRoom(room);
    setNewRoom({
      roomNumber: room.roomNumber,
      floorNumber: room.floorNumber,
      capacity: room.capacity,
      price: room.price,
      priceType: room.priceType,
    });
    setShowRoomModal(true);
  }}
>
  Edit
                 </button>

                <button
                  disabled={deleteRoomLoading === room._id}
                  onClick={() => handleDeleteRoom(room._id)}
                  className="delete-btn"
                >
                  {deleteRoomLoading === room._id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= CREATE HOSTEL MODAL ================= */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Create Hostel</h3>

            <input
              placeholder="Hostel Name"
              value={newHostel.name}
              onChange={(e) =>
                setNewHostel({ ...newHostel, name: e.target.value })
              }
            />

            <select
              value={newHostel.type}
              onChange={(e) =>
                setNewHostel({ ...newHostel, type: e.target.value })
              }
            >
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </select>

            <input
              type="number"
              placeholder="Total Floors"
              value={newHostel.totalFloors}
              onChange={(e) =>
                setNewHostel({ ...newHostel, totalFloors: e.target.value })
              }
            />

            <input
              placeholder="Warden ID"
              value={newHostel.warden}
              onChange={(e) =>
                setNewHostel({ ...newHostel, warden: e.target.value })
              }
            />

            <button
              disabled={createHostelLoading}
              onClick={handleCreateHostel}
            >
              {createHostelLoading ? "Creating..." : "Create"}
            </button>

            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ================= ADD ROOM MODAL ================= */}
      {showRoomModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>
  {editingRoom ? "Edit Room" : "Add Room"} - {selectedHostel.name}
</h3>

            <input
              placeholder="Room Number"
              value={newRoom.roomNumber}
              onChange={(e) =>
                setNewRoom({ ...newRoom, roomNumber: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Floor Number"
              value={newRoom.floorNumber}
              onChange={(e) =>
                setNewRoom({ ...newRoom, floorNumber: e.target.value })
              }
            />

            <select
              value={newRoom.capacity}
              onChange={(e) =>
                setNewRoom({ ...newRoom, capacity: Number(e.target.value) })
              }
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
            <input
               type="number"
               placeholder="Room Price"
               value={newRoom.price}
               onChange={(e) =>
               setNewRoom({ ...newRoom, price: Number(e.target.value) })
          }
            />

<select
  value={newRoom.priceType}
  onChange={(e) =>
    setNewRoom({ ...newRoom, priceType: e.target.value })
  }
>
  <option value="Yearly">Yearly</option>
  <option value="Semester">Semester</option>
</select>

            <button
              disabled={createRoomLoading}
              onClick={handleSaveRoom}
            >
              {createRoomLoading
  ? editingRoom
    ? "Updating..."
    : "Creating..."
  : editingRoom
  ? "Update"
  : "Create"}
            </button>

            <button onClick={() => setShowRoomModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ================= ALLOCATE STUDENT MODAL ================= */}
      {showAllocateModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>
              Allocate Student - Room {selectedRoom?.roomNumber}
            </h3>

            <input
              placeholder="Enter Enrollment Number"
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value)}
            />

            <button
              disabled={allocateLoading}
              onClick={handleAllocateStudent}
            >
              {allocateLoading ? "Allocating..." : "Allocate"}
            </button>

            <button onClick={() => setShowAllocateModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hostel;
