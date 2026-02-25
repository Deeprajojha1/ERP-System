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
import { allocateStudentApi, vacateStudentApi } from "./constants/allocationApi";
import { getStudentByEnrollmentApi } from "./constants/studentApi";
import "./Hostel.css";

const INITIAL_HOSTEL_FORM = {
  name: "",
  type: "Boys",
  totalFloors: "",
  warden: "",
};

const INITIAL_ROOM_FORM = {
  roomNumber: "",
  floorNumber: "",
  capacity: 1,
  price: "",
  priceType: "Yearly",
};

const Hostel = () => {
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedHostel, setSelectedHostel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [showHostelModal, setShowHostelModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);

  const [studentEnrollmentNumber, setStudentEnrollmentNumber] = useState("");
  const [newHostel, setNewHostel] = useState(INITIAL_HOSTEL_FORM);
  const [newRoom, setNewRoom] = useState(INITIAL_ROOM_FORM);

  const [createHostelLoading, setCreateHostelLoading] = useState(false);
  const [deleteHostelLoading, setDeleteHostelLoading] = useState(null);
  const [createRoomLoading, setCreateRoomLoading] = useState(false);
  const [deleteRoomLoading, setDeleteRoomLoading] = useState(null);
  const [allocateLoading, setAllocateLoading] = useState(false);
  const [vacateLoading, setVacateLoading] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);

  const fetchHostels = async () => {
    try {
      const data = await getHostelSummaryApi();
      setHostels(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to load hostels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchRooms = async (hostelId) => {
    try {
      const data = await getRoomsByHostelApi(hostelId);
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to load rooms");
      setRooms([]);
    }
  };

  const handleCreateHostel = async () => {
    try {
      setCreateHostelLoading(true);
      await createHostelApi(newHostel);
      setShowHostelModal(false);
      setNewHostel(INITIAL_HOSTEL_FORM);
      await fetchHostels();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to create hostel");
    } finally {
      setCreateHostelLoading(false);
    }
  };

  const handleDeleteHostel = async (id) => {
    try {
      setDeleteHostelLoading(id);
      await deleteHostelApi(id);
      setSelectedHostel((prev) => (prev?.id === id ? null : prev));
      setRooms((prev) => (selectedHostel?.id === id ? [] : prev));
      await fetchHostels();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete hostel");
    } finally {
      setDeleteHostelLoading(null);
    }
  };

  const handleSaveRoom = async () => {
    if (!selectedHostel?.id && !editingRoom) return;

    try {
      setCreateRoomLoading(true);

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
      setNewRoom(INITIAL_ROOM_FORM);

      await fetchRooms(selectedHostel.id);
      await fetchHostels();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to save room");
    } finally {
      setCreateRoomLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!selectedHostel?.id) return;

    try {
      setDeleteRoomLoading(roomId);
      await deleteRoomApi(roomId);
      await fetchRooms(selectedHostel.id);
      await fetchHostels();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete room");
    } finally {
      setDeleteRoomLoading(null);
    }
  };

  const handleAllocateStudent = async () => {
    if (!selectedRoom?._id || !studentEnrollmentNumber.trim()) return;

    try {
      setAllocateLoading(true);
      await getStudentByEnrollmentApi(studentEnrollmentNumber.trim());
      await allocateStudentApi({
        enrollmentNumber: studentEnrollmentNumber.trim(),
        roomId: selectedRoom._id,
      });

      setShowAllocateModal(false);
      setStudentEnrollmentNumber("");

      await fetchRooms(selectedHostel.id);
      await fetchHostels();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to allocate student");
    } finally {
      setAllocateLoading(false);
    }
  };

  const handleVacateStudent = async (studentId) => {
    if (!selectedHostel?.id) return;

    try {
      setVacateLoading(studentId);
      await vacateStudentApi(studentId);
      await fetchRooms(selectedHostel.id);
      await fetchHostels();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to vacate student");
    } finally {
      setVacateLoading(null);
    }
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

  if (loading) return <div className="hostel-loading">Loading...</div>;

  return (
    <div className="hostel-container">
      <div className="hostel-header">
        <h2>Hostel Dashboard</h2>
        <button type="button" onClick={() => setShowHostelModal(true)}>+ Create Hostel</button>
      </div>

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
          <p>INR {totals.totalCurrentRevenue.toLocaleString()}</p>
        </div>
        <div className="summary-card red">
          <h4>Total Vacancy Loss</h4>
          <p>INR {totals.totalVacancyLoss.toLocaleString()}</p>
        </div>
      </div>

      <div className="hostel-grid">
        {hostels.map((hostel) => (
          <div
            key={hostel.id}
            className={`hostel-card ${selectedHostel?.id === hostel.id ? "active-hostel" : ""}`}
            onClick={() => {
              setSelectedHostel(hostel);
              fetchRooms(hostel.id);
            }}
          >
            <h3>{hostel.name}</h3>
            <p>Total Capacity: {hostel.totalCapacity}</p>
            <p>Occupied: {hostel.currentOccupancy}</p>
            <p>Available Beds: {hostel.availableBeds}</p>
            <p>Occupancy: {hostel.occupancyPercentage}%</p>

            <hr />

            <p>Potential Revenue: INR {Number(hostel.totalPotentialRevenue || 0).toLocaleString()}</p>
            <p style={{ color: "#059669", fontWeight: 600 }}>
              Current Revenue: INR {Number(hostel.currentRevenue || 0).toLocaleString()}
            </p>
            <p style={{ color: "#dc2626", fontWeight: 600 }}>
              Vacancy Loss: INR {Number(hostel.vacancyLoss || 0).toLocaleString()}
            </p>

            <button
              type="button"
              className="delete-btn"
              disabled={deleteHostelLoading === hostel.id}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteHostel(hostel.id);
              }}
            >
              {deleteHostelLoading === hostel.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))}
      </div>

      {selectedHostel && (
        <div className="room-section">
          <h3>Rooms - {selectedHostel.name}</h3>
          <button type="button" onClick={() => setShowRoomModal(true)}>+ Add Room</button>

          <div className="room-grid">
            {rooms.map((room) => (
              <div key={room._id} className="room-card">
                <h4>Room {room.roomNumber}</h4>
                <p>Price: INR {room.price} ({room.priceType})</p>
                <p>Floor: {room.floorNumber}</p>
                <p>Capacity: {room.capacity}</p>
                <p>Status: {room.status}</p>

                {(() => {
                  const occupied = room.occupants?.length || 0;
                  const percentage = room.capacity ? Math.round((occupied / room.capacity) * 100) : 0;
                  let barColor = "#059669";
                  if (percentage > 80) barColor = "#dc2626";
                  else if (percentage > 50) barColor = "#d97706";

                  return (
                    <div className="occupancy-wrapper">
                      <div className="occupancy-label">
                        {occupied}/{room.capacity} Beds Occupied ({percentage}%)
                      </div>
                      <div className="occupancy-bar">
                        <div className="occupancy-fill" style={{ width: `${percentage}%`, background: barColor }} />
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <p>Occupants: {room.occupants?.length || 0}</p>
                  {room.occupants?.map((student) => (
                    <div key={student._id} className="occupant-item">
                      <span>{student?.user?.name || "Unknown Student"}</span>
                      <button
                        type="button"
                        disabled={vacateLoading === student._id}
                        onClick={() => handleVacateStudent(student._id)}
                      >
                        {vacateLoading === student._id ? "Vacating..." : "Vacate"}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowAllocateModal(true);
                  }}
                >
                  Allocate Student
                </button>

                <button
                  type="button"
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
                  type="button"
                  className="delete-btn"
                  disabled={deleteRoomLoading === room._id}
                  onClick={() => handleDeleteRoom(room._id)}
                >
                  {deleteRoomLoading === room._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHostelModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Create Hostel</h3>
            <input
              placeholder="Hostel Name"
              value={newHostel.name}
              onChange={(e) => setNewHostel({ ...newHostel, name: e.target.value })}
            />
            <select
              value={newHostel.type}
              onChange={(e) => setNewHostel({ ...newHostel, type: e.target.value })}
            >
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </select>
            <input
              type="number"
              placeholder="Total Floors"
              value={newHostel.totalFloors}
              onChange={(e) => setNewHostel({ ...newHostel, totalFloors: e.target.value })}
            />
            <input
              placeholder="Warden ID"
              value={newHostel.warden}
              onChange={(e) => setNewHostel({ ...newHostel, warden: e.target.value })}
            />
            <button type="button" disabled={createHostelLoading} onClick={handleCreateHostel}>
              {createHostelLoading ? "Creating..." : "Create"}
            </button>
            <button type="button" onClick={() => setShowHostelModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showRoomModal && selectedHostel && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingRoom ? "Edit Room" : "Add Room"} - {selectedHostel.name}</h3>
            <input
              placeholder="Room Number"
              value={newRoom.roomNumber}
              onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
            />
            <input
              type="number"
              placeholder="Floor Number"
              value={newRoom.floorNumber}
              onChange={(e) => setNewRoom({ ...newRoom, floorNumber: e.target.value })}
            />
            <select
              value={newRoom.capacity}
              onChange={(e) => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })}
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
              onChange={(e) => setNewRoom({ ...newRoom, price: Number(e.target.value) })}
            />
            <select
              value={newRoom.priceType}
              onChange={(e) => setNewRoom({ ...newRoom, priceType: e.target.value })}
            >
              <option value="Yearly">Yearly</option>
              <option value="Semester">Semester</option>
            </select>
            <button type="button" disabled={createRoomLoading} onClick={handleSaveRoom}>
              {createRoomLoading ? (editingRoom ? "Updating..." : "Creating...") : (editingRoom ? "Update" : "Create")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRoomModal(false);
                setEditingRoom(null);
                setNewRoom(INITIAL_ROOM_FORM);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showAllocateModal && selectedRoom && (
        <div className="modal">
          <div className="modal-content">
            <h3>Allocate Student - Room {selectedRoom.roomNumber}</h3>
            <input
              placeholder="Enter Enrollment Number"
              value={studentEnrollmentNumber}
              onChange={(e) => setStudentEnrollmentNumber(e.target.value)}
            />
            <button type="button" disabled={allocateLoading} onClick={handleAllocateStudent}>
              {allocateLoading ? "Allocating..." : "Allocate"}
            </button>
            <button type="button" onClick={() => setShowAllocateModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hostel;
