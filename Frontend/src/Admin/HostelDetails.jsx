import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiCoffee,
  FiEdit3,
  FiMapPin,
  FiMoon,
  FiSearch,
  FiSun,
  FiTool,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import ClipLoader from "./components/ClipLoader";
import "./HostelDetails.css";
import {
  DAY_ORDER,
  INITIAL_HOSTELS,
  RESOLUTION_OPTIONS,
  getInitials,
  percent,
} from "./hostelData";

const INITIAL_STUDENT_FORM = {
  studentName: "",
  studentId: "",
  course: "",
  year: "1st Year",
  roomId: "",
};

const HostelDetails = () => {
  const navigate = useNavigate();
  const { hostelId } = useParams();

  // Find the hostel matching the URL parameter
  const hostelData = INITIAL_HOSTELS.find((h) => h.id === hostelId);

  const [roomSearch, setRoomSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [selectedFloorId, setSelectedFloorId] = useState(hostelData?.floors[0]?.id || "");
  const [complaints, setComplaints] = useState(hostelData?.complaints || []);
  
  // Mutable floors state for adding students
  const [floors, setFloors] = useState(hostelData?.floors || []);
  
  // Add Student Modal state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState(INITIAL_STUDENT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If hostel not found, redirect back
  if (!hostelData) {
    return (
      <section className="hostel-details-page">
        <div className="hostel-not-found">
          <h2>Hostel Not Found</h2>
          <p>The hostel you're looking for doesn't exist.</p>
          <button type="button" className="hostel-btn hostel-btn-primary" onClick={() => navigate("/admin/hostel")}>
            <FiArrowLeft /> Back to Hostels
          </button>
        </div>
      </section>
    );
  }

  // Use hostelData for static info, floors state for mutable room data
  const hostel = { ...hostelData, floors };
  const selectedFloor = floors.find((f) => f.id === selectedFloorId) || floors[0];

  const floorRooms = useMemo(() => {
    if (!selectedFloor) return [];
    const query = roomSearch.trim().toLowerCase();
    if (!query) return selectedFloor.rooms;
    return selectedFloor.rooms.filter((room) => {
      const allText = `${room.roomNo} ${room.roomType} ${room.capacityClass} ${room.occupants.join(" ")}`;
      return allText.toLowerCase().includes(query);
    });
  }, [selectedFloor, roomSearch]);

  const occupancy = percent(hostel.occupiedRooms, hostel.totalRooms);
  const openComplaints = complaints.filter((c) => c.status !== "resolved").length;

  const handleResolutionChange = (complaintId, resolutionOption) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, resolutionOption } : c))
    );
    toast.success("Resolution updated.");
  };

  // Get available rooms (not full, not in maintenance)
  const availableRooms = useMemo(() => {
    if (!selectedFloor) return [];
    return selectedFloor.rooms.filter((room) => {
      if (room.status === "Maintenance") return false;
      const vacancy = room.seatCapacity - room.occupants.length;
      return vacancy > 0;
    });
  }, [selectedFloor]);

  const openAddStudentModal = () => {
    setStudentForm({ ...INITIAL_STUDENT_FORM, roomId: availableRooms[0]?.id || "" });
    setShowAddStudentModal(true);
  };

  const closeAddStudentModal = () => {
    setShowAddStudentModal(false);
    setStudentForm(INITIAL_STUDENT_FORM);
  };

  const handleStudentFormChange = (e) => {
    const { name, value } = e.target;
    setStudentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const name = studentForm.studentName.trim();
    const studentId = studentForm.studentId.trim();
    const roomId = studentForm.roomId;

    if (!name) {
      toast.error("Student name is required.");
      return;
    }
    if (!studentId) {
      toast.error("Student ID is required.");
      return;
    }
    if (!roomId) {
      toast.error("Please select a room.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Update the floors state to add student to the selected room
      setFloors((prevFloors) =>
        prevFloors.map((floor) => {
          if (floor.id !== selectedFloorId) return floor;
          return {
            ...floor,
            occupiedBeds: floor.occupiedBeds + 1,
            rooms: floor.rooms.map((room) => {
              if (room.id !== roomId) return room;
              const newOccupants = [...room.occupants, name];
              const newStatus = newOccupants.length >= room.seatCapacity ? "Full" : "Vacant";
              return { ...room, occupants: newOccupants, status: newStatus };
            }),
          };
        })
      );

      toast.success(`${name} added to Room ${availableRooms.find((r) => r.id === roomId)?.roomNo}`);
      closeAddStudentModal();
    } catch (error) {
      toast.error("Failed to add student. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="hostel-details-page">
      {/* Header */}
      <header className="hd-header">
        <button type="button" className="hd-back-btn" onClick={() => navigate("/admin/hostel")}>
          <FiArrowLeft />
          <span>All Hostels</span>
        </button>
        <div className="hd-header-info">
          <div className="hd-title-row">
            <h1>{hostel.name}</h1>
            <span className={`hd-category-chip ${hostel.category === "Female" ? "female" : ""}`}>
              {hostel.category}
            </span>
          </div>
          <p className="hd-subtitle">
            <FiMapPin /> {hostel.code} | {hostel.block} | Warden: {hostel.warden}
          </p>
        </div>
        <button type="button" className="hostel-btn hostel-btn-light">
          <FiEdit3 /> Edit Hostel
        </button>
      </header>

      {/* Stats for this hostel only */}
      <section className="hd-stats">
        <article>
          <span>Total Rooms</span>
          <strong>{hostel.totalRooms}</strong>
        </article>
        <article>
          <span>Occupied</span>
          <strong>{hostel.occupiedRooms}</strong>
        </article>
        <article>
          <span>Occupancy Rate</span>
          <strong>{occupancy}%</strong>
          <div className="hd-stat-bar">
            <span className={hostel.category === "Female" ? "female" : ""} style={{ width: `${occupancy}%` }} />
          </div>
        </article>
        <article>
          <span>Open Complaints</span>
          <strong className={openComplaints > 0 ? "warning" : ""}>{openComplaints}</strong>
        </article>
      </section>

      {/* Floor Tabs */}
      <div className="hd-floor-section">
        <div className="hd-floor-tabs">
          {hostel.floors.map((floor) => (
            <button
              key={floor.id}
              type="button"
              className={selectedFloor?.id === floor.id ? "active" : ""}
              onClick={() => setSelectedFloorId(floor.id)}
            >
              {floor.name}
            </button>
          ))}
        </div>
      </div>

      {/* Floor KPIs */}
      {selectedFloor && (
        <section className="hd-floor-kpis">
          <article>
            <span>Floor Beds</span>
            <strong>{selectedFloor.occupiedBeds}/{selectedFloor.totalBeds}</strong>
          </article>
          <article>
            <span>Available</span>
            <strong>{Math.max(selectedFloor.totalBeds - selectedFloor.occupiedBeds, 0)} Beds</strong>
          </article>
          <article>
            <span>Under Maintenance</span>
            <strong>{selectedFloor.maintenanceRooms} Rooms</strong>
          </article>
        </section>
      )}

      {/* Room Search & Grid */}
      <div className="hd-room-toolbar">
        <label className="hd-search">
          <FiSearch />
          <input
            value={roomSearch}
            onChange={(e) => setRoomSearch(e.target.value)}
            placeholder="Search room or student..."
          />
        </label>
        <button type="button" className="hostel-btn hostel-btn-primary" onClick={openAddStudentModal}>
          <FiUserPlus /> Add Student
        </button>
      </div>

      <div className="hd-room-grid">
        {floorRooms.length === 0 ? (
          <div className="hd-empty">No rooms found.</div>
        ) : (
          floorRooms.map((room) => {
            const vacancy = Math.max(room.seatCapacity - room.occupants.length, 0);
            const isMaintenance = room.status === "Maintenance";
            const isFull = room.status === "Full" || vacancy === 0;
            return (
              <article key={room.id} className="hd-room-card">
                <div className="hd-room-top">
                  <span className="hd-room-type">{room.roomType}</span>
                  <span className={`hd-room-state ${isMaintenance ? "maintenance" : isFull ? "full" : "vacant"}`}>
                    {isMaintenance ? "Maintenance" : isFull ? "Full" : `${vacancy} Vacant`}
                  </span>
                </div>
                <h3>Room {room.roomNo}</h3>
                <p>{room.capacityClass} | {room.seatCapacity} Seater | ₹{room.fee.toLocaleString("en-IN")}</p>
                {isMaintenance ? (
                  <div className="hd-room-warning">
                    <FiAlertTriangle />
                    <span>{room.maintenanceNote}</span>
                  </div>
                ) : (
                  <div className="hd-occupants">
                    {room.occupants.length === 0 ? (
                      <span className="hd-no-student">No student assigned</span>
                    ) : (
                      room.occupants.map((name) => (
                        <div key={name} className="hd-occupant">
                          <span className="hd-avatar">{getInitials(name)}</span>
                          <span>{name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Bottom Panels: Menu + Complaints */}
      <section className="hd-bottom-panels">
        {/* Food Menu */}
        <article className="hd-menu-card">
          <div className="hd-panel-head">
            <h3>Food Menu</h3>
            <span>Weekly</span>
          </div>
          <div className="hd-day-tabs">
            {DAY_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                className={selectedDay === day ? "active" : ""}
                onClick={() => setSelectedDay(day)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="hd-meal-list">
            <div className="hd-meal">
              <h4><FiSun /> Breakfast</h4>
              <p>{hostel.foodMenu[selectedDay].breakfast}</p>
              <span>{hostel.foodMenu[selectedDay].time.breakfast}</span>
            </div>
            <div className="hd-meal">
              <h4><FiUsers /> Lunch</h4>
              <p>{hostel.foodMenu[selectedDay].lunch}</p>
              <span>{hostel.foodMenu[selectedDay].time.lunch}</span>
            </div>
            <div className="hd-meal">
              <h4><FiCoffee /> Snacks</h4>
              <p>{hostel.foodMenu[selectedDay].snacks}</p>
              <span>{hostel.foodMenu[selectedDay].time.snacks}</span>
            </div>
            <div className="hd-meal">
              <h4><FiMoon /> Dinner</h4>
              <p>{hostel.foodMenu[selectedDay].dinner}</p>
              <span>{hostel.foodMenu[selectedDay].time.dinner}</span>
            </div>
          </div>
        </article>

        {/* Complaints */}
        <article className="hd-complaint-card">
          <div className="hd-panel-head">
            <h3>Complaints</h3>
            <span>{complaints.length} Total</span>
          </div>
          <div className="hd-complaint-list">
            {complaints.length === 0 ? (
              <div className="hd-empty-small">No complaints for this hostel.</div>
            ) : (
              complaints.map((complaint) => (
                <div key={complaint.id} className="hd-complaint-item">
                  <div className="hd-complaint-top">
                    <h4>{complaint.issueType} | Room {complaint.roomNo}</h4>
                    <span className={`hd-complaint-status ${complaint.status}`}>
                      {complaint.status === "resolved" ? <FiCheckCircle /> : complaint.status === "in-progress" ? <FiClock /> : <FiTool />}
                      {complaint.status === "in-progress" ? "In Progress" : complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}
                    </span>
                  </div>
                  <p>{complaint.description}</p>
                  <small>Student: {complaint.studentName}</small>
                  <label className="hd-resolution-field">
                    Resolution
                    <select
                      value={complaint.resolutionOption || "root-cause-permanent-fix"}
                      onChange={(e) => handleResolutionChange(complaint.id, e.target.value)}
                    >
                      {RESOLUTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="hd-modal-overlay" onClick={closeAddStudentModal}>
          <div className="hd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hd-modal-header">
              <h2><FiUserPlus /> Add Student to {hostel.name}</h2>
              <button type="button" className="hd-modal-close" onClick={closeAddStudentModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="hd-modal-form">
              <div className="hd-form-group">
                <label>Student Name *</label>
                <input
                  type="text"
                  name="studentName"
                  value={studentForm.studentName}
                  onChange={handleStudentFormChange}
                  placeholder="Enter student's full name"
                  required
                />
              </div>
              <div className="hd-form-group">
                <label>Student ID *</label>
                <input
                  type="text"
                  name="studentId"
                  value={studentForm.studentId}
                  onChange={handleStudentFormChange}
                  placeholder="e.g., STU-2024-001"
                  required
                />
              </div>
              <div className="hd-form-row">
                <div className="hd-form-group">
                  <label>Course *</label>
                  <input
                    type="text"
                    name="course"
                    value={studentForm.course}
                    onChange={handleStudentFormChange}
                    placeholder="e.g., B.Tech CSE"
                    required
                  />
                </div>
                <div className="hd-form-group">
                  <label>Year</label>
                  <select
                    name="year"
                    value={studentForm.year}
                    onChange={handleStudentFormChange}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                  </select>
                </div>
              </div>
              <div className="hd-form-group">
                <label>Select Room *</label>
                <select
                  name="roomId"
                  value={studentForm.roomId}
                  onChange={handleStudentFormChange}
                  required
                >
                  <option value="">-- Select a room with vacancy --</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNo} ({room.floorName}) - {room.seatCapacity - room.occupants.length} beds available
                    </option>
                  ))}
                </select>
                {availableRooms.length === 0 && (
                  <small className="hd-form-hint warning">No rooms available in this hostel.</small>
                )}
              </div>
              <div className="hd-modal-actions">
                <button type="button" className="hostel-btn hostel-btn-light" onClick={closeAddStudentModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="hostel-btn hostel-btn-primary admin-btn-with-loader" disabled={availableRooms.length === 0 || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <ClipLoader size={15} color="#000000" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <FiUserPlus /> Add Student
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default HostelDetails;
