import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThreeDots } from "react-loader-spinner";
import { FiEdit3, FiLifeBuoy, FiTrash2 } from "react-icons/fi";
import {
  getHostelSummaryApi,
  getSingleHostelApi,
  createHostelApi,
  updateHostelApi,
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
import { deleteWardenApi } from "./constants/wardenApi";
import ClipLoader from "./components/ClipLoader";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "./constants/loadStates";
import "./Hostel.css";

const INITIAL_HOSTEL_FORM = {
  name: "",
  type: "Boys",
  totalFloors: "",
  // legacy (optional): faculty warden display/id
  warden: "",
  // new: warden accounts attached to hostel (max 5)
  wardens: [{ id: "", name: "", email: "", password: "" }],
};

const INITIAL_ROOM_FORM = {
  roomNumber: "",
  floorNumber: "",
  capacity: 1,
  price: "",
  priceType: "Yearly",
};

const Hostel = () => {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [selectedHostel, setSelectedHostel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [showHostelModal, setShowHostelModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);

  const [studentEnrollmentNumber, setStudentEnrollmentNumber] = useState("");
  const [newHostel, setNewHostel] = useState(INITIAL_HOSTEL_FORM);
  const [newRoom, setNewRoom] = useState(INITIAL_ROOM_FORM);

  const [createHostelLoading, setCreateHostelLoading] = useState(false);
  const [editHostelLoading, setEditHostelLoading] = useState(null);
  const [deleteHostelLoading, setDeleteHostelLoading] = useState(null);
  const [createRoomLoading, setCreateRoomLoading] = useState(false);
  const [deleteRoomLoading, setDeleteRoomLoading] = useState(null);
  const [allocateLoading, setAllocateLoading] = useState(false);
  const [vacateLoading, setVacateLoading] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingHostel, setEditingHostel] = useState(null);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const data = await getHostelSummaryApi();
      setHostels(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to load hostels";
      setLoadError(message);
      alert(message);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
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

  const closeHostelModal = () => {
    setShowHostelModal(false);
    setEditingHostel(null);
    setNewHostel(INITIAL_HOSTEL_FORM);
  };

  const handleOpenCreateHostelModal = () => {
    setEditingHostel(null);
    setNewHostel(INITIAL_HOSTEL_FORM);
    setShowHostelModal(true);
  };

  const handleOpenEditHostelModal = async (hostelId) => {
    if (!hostelId) return;

    try {
      setEditHostelLoading(hostelId);
      const hostelDetails = await getSingleHostelApi(hostelId);
      setEditingHostel({ id: hostelId });
      setNewHostel({
        name: hostelDetails?.name || "",
        type: hostelDetails?.type || "Boys",
        totalFloors:
          Number.isFinite(Number(hostelDetails?.totalFloors)) && Number(hostelDetails?.totalFloors) > 0
            ? String(Number(hostelDetails.totalFloors))
            : "",
        warden:
          String(hostelDetails?.wardenName || "").trim() ||
          String(hostelDetails?.warden?.employeeId || "").trim() ||
          String(hostelDetails?.warden?.user?.email || "").trim() ||
          String(hostelDetails?.warden?.user?.name || "").trim(),
        wardens: Array.isArray(hostelDetails?.wardens) && hostelDetails.wardens.length
          ? hostelDetails.wardens
              .map((w) => ({ id: w?._id || "", name: w?.name || "", email: w?.email || "", password: "" }))
              .slice(0, 5)
          : [{ id: "", name: "", email: "", password: "" }],
      });
      setShowHostelModal(true);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to load hostel details.");
    } finally {
      setEditHostelLoading(null);
    }
  };

  const handleSaveHostel = async () => {
    const trimmedName = String(newHostel.name || "").trim();
    const trimmedWarden = String(newHostel.warden || "").trim();
    const wardens = Array.isArray(newHostel.wardens) ? newHostel.wardens : [];
    const existingWardenIds = wardens
      .map((item) => String(item?.id || "").trim())
      .filter(Boolean);

    const wardenAccounts = wardens
      .map((item) => ({
        id: String(item?.id || "").trim(),
        name: String(item?.name || "").trim(),
        email: String(item?.email || "").toLowerCase().trim(),
        password: String(item?.password || ""),
      }))
      .filter((item) => !item.id)
      .filter((item) => item.name || item.email || item.password);
    const hasTotalFloors = String(newHostel.totalFloors || "").trim() !== "";
    const parsedTotalFloors = Number(newHostel.totalFloors);

    if (!trimmedName) {
      alert("Hostel name is required.");
      return;
    }

    const totalWardens = existingWardenIds.length + wardenAccounts.length;
    if (!totalWardens) {
      alert("At least 1 warden is required.");
      return;
    }
    if (totalWardens > 5) {
      alert("You can add at most 5 wardens.");
      return;
    }
    const invalidWarden = wardenAccounts.find((w) => !w.name || !w.email || !w.password);
    if (invalidWarden) {
      alert("Each warden must have Name, Email (Login ID) and Password.");
      return;
    }
    const shortPassword = wardenAccounts.find((w) => String(w.password).length < 8);
    if (shortPassword) {
      alert("Warden password must be at least 8 characters.");
      return;
    }
    if (hasTotalFloors && (!Number.isInteger(parsedTotalFloors) || parsedTotalFloors < 1)) {
      alert("Total floors must be a positive whole number.");
      return;
    }

    try {
      setCreateHostelLoading(true);
      const payload = {
        name: trimmedName,
        type: newHostel.type || "Boys",
        // legacy optional
        ...(trimmedWarden ? { warden: trimmedWarden } : {}),
        ...(editingHostel?.id
          ? {
              wardenIds: existingWardenIds,
              wardenAccounts,
            }
          : {
              // create supports legacy `wardens` as accounts
              wardens: wardenAccounts,
            }),
        ...(hasTotalFloors ? { totalFloors: parsedTotalFloors } : {}),
      };

      if (editingHostel?.id) {
        await updateHostelApi(editingHostel.id, payload);
      } else {
        await createHostelApi(payload);
      }
      closeHostelModal();
      await fetchHostels();
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          (editingHostel?.id ? "Failed to update hostel" : "Failed to create hostel")
      );
    } finally {
      setCreateHostelLoading(false);
    }
  };

  const updateWardenRow = (idx, key, value) => {
    setNewHostel((prev) => {
      const current = Array.isArray(prev.wardens) ? prev.wardens : [];
      const next = current.map((row, i) => (i === idx ? { ...row, [key]: value } : row));
      return { ...prev, wardens: next };
    });
  };

  const addWardenRow = () => {
    setNewHostel((prev) => {
      const current = Array.isArray(prev.wardens) ? prev.wardens : [];
      if (current.length >= 5) return prev;
      return { ...prev, wardens: [...current, { id: "", name: "", email: "", password: "" }] };
    });
  };

  const removeWardenRow = (idx) => {
    setNewHostel((prev) => {
      const current = Array.isArray(prev.wardens) ? prev.wardens : [];
      const next = current.filter((_, i) => i !== idx);
      return { ...prev, wardens: next.length ? next : [{ id: "", name: "", email: "", password: "" }] };
    });
  };

  const handleDeleteExistingWarden = async (wardenId) => {
    const id = String(wardenId || "").trim();
    if (!id) return;

    const ok = window.confirm(
      "Delete this warden account permanently?\n\nThis will remove it from this hostel and delete the login."
    );
    if (!ok) return;

    try {
      await deleteWardenApi(id);
      setNewHostel((prev) => {
        const current = Array.isArray(prev.wardens) ? prev.wardens : [];
        const next = current.filter((row) => String(row?.id || "").trim() !== id);
        return { ...prev, wardens: next.length ? next : [{ id: "", name: "", email: "", password: "" }] };
      });
      alert("Warden deleted successfully.");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete warden.");
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

  const loadState = useMemo(() => {
    if (!hasFetchedOnce && !loading) return ADMIN_LOAD_STATES.INITIAL;
    if (loading) return ADMIN_LOAD_STATES.PENDING;
    if (loadError) return ADMIN_LOAD_STATES.FAILURE;
    return ADMIN_LOAD_STATES.SUCCESS;
  }, [hasFetchedOnce, loading, loadError]);

  const loadStateText =
    ADMIN_LOAD_STATE_OPTIONS.find((option) => option.id === loadState)?.text || "Unknown";

  return (
    <div className="hostel-container">
      <div className="hostel-header">
        <div>
          <h2>Hostel Dashboard</h2>
          <p>Manage hostels, occupancy, and student allocation.</p>
        </div>
        <div className="hostel-header-meta">
          <span className={`hostel-load-chip ${loadState}`}>{loadStateText}</span>
          <span>{hostels.length} hostel(s)</span>
          <button type="button" onClick={handleOpenCreateHostelModal}>+ Create Hostel</button>
        </div>
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
        {loadState === ADMIN_LOAD_STATES.PENDING ? (
          <div className="hostel-state hostel-state-loading">
            <ThreeDots
              visible
              height={40}
              width={66}
              color="#2563eb"
              radius={8}
              ariaLabel="hostel-loading"
            />
          </div>
        ) : loadState === ADMIN_LOAD_STATES.FAILURE ? (
          <div className="hostel-state">{loadError || "Failed to load hostels."}</div>
        ) : hostels.length === 0 ? (
          <div className="hostel-state">No hostels found.</div>
        ) : (
          hostels.map((hostel) => (
            <div
              key={hostel.id}
              className={`hostel-card ${selectedHostel?.id === hostel.id ? "active-hostel" : ""}`}
              onClick={() => navigate(`/admin/hostel/${hostel.id}`)}
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

	              <div className="hostel-card-actions">
	                <button
	                  type="button"
	                  className="support-btn"
	                  onClick={(e) => {
	                    e.stopPropagation();
	                    navigate(`/admin/warden-support-tickets?hostelId=${hostel.id}`);
	                  }}
	                >
	                  <FiLifeBuoy />
	                  <span>Support</span>
	                </button>
	                <button
	                  type="button"
	                  className="edit-btn admin-btn-with-loader"
	                  disabled={deleteHostelLoading === hostel.id || editHostelLoading === hostel.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditHostelModal(hostel.id);
                  }}
	                >
	                  {editHostelLoading === hostel.id ? (
	                    <>
	                      <ClipLoader size={14} color="#2563eb" trackColor="rgba(37, 99, 235, 0.18)" />
	                      <span>Loading...</span>
	                    </>
	                  ) : (
	                    <>
	                      <FiEdit3 />
	                      <span>Edit</span>
	                    </>
	                  )}
	                </button>
                <button
                  type="button"
                  className="delete-btn admin-btn-with-loader"
                  disabled={deleteHostelLoading === hostel.id || editHostelLoading === hostel.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteHostel(hostel.id);
                  }}
	                >
	                  {deleteHostelLoading === hostel.id ? (
	                    <>
	                      <ClipLoader size={14} color="#dc2626" trackColor="rgba(220, 38, 38, 0.2)" />
	                      <span>Deleting...</span>
	                    </>
	                  ) : (
	                    <>
	                      <FiTrash2 />
	                      <span>Delete</span>
	                    </>
	                  )}
	                </button>
	              </div>
            </div>
          ))
        )}
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
                        className="admin-btn-with-loader"
                        disabled={vacateLoading === student._id}
                        onClick={() => handleVacateStudent(student._id)}
                      >
                        {vacateLoading === student._id ? (
                          <>
                            <ClipLoader size={12} color="#dc2626" trackColor="rgba(220, 38, 38, 0.2)" />
                            <span>Vacating...</span>
                          </>
                        ) : (
                          "Vacate"
                        )}
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
	                  <FiEdit3 />
	                  <span>Edit</span>
	                </button>

                <button
                  type="button"
                  className="delete-btn admin-btn-with-loader"
                  disabled={deleteRoomLoading === room._id}
                  onClick={() => handleDeleteRoom(room._id)}
	                >
	                  {deleteRoomLoading === room._id ? (
	                    <>
	                      <ClipLoader size={14} color="#dc2626" trackColor="rgba(220, 38, 38, 0.2)" />
	                      <span>Deleting...</span>
	                    </>
	                  ) : (
	                    <>
	                      <FiTrash2 />
	                      <span>Delete</span>
	                    </>
	                  )}
	                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHostelModal && (
        <div className="modal">
          <div className="modal-content hostel-modal-content">
            <div className="hostel-modal-title">
              <div>
                <h3>{editingHostel?.id ? "Edit Hostel" : "Create Hostel"}</h3>
                <p>Manage hostel details and warden logins (max 5 per hostel).</p>
              </div>
            </div>

            <div className="hostel-modal-section">
              <div className="hostel-modal-section-head">
                <strong>Hostel Details</strong>
              </div>
              <div className="hostel-modal-grid">
                <label>
                  Hostel Name
                  <input
                    placeholder="e.g. KD Bhawan"
                    value={newHostel.name}
                    onChange={(e) => setNewHostel({ ...newHostel, name: e.target.value })}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={newHostel.type}
                    onChange={(e) => setNewHostel({ ...newHostel, type: e.target.value })}
                  >
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                  </select>
                </label>
                <label>
                  Total Floors
                  <input
                    type="number"
                    placeholder="e.g. 4"
                    value={newHostel.totalFloors}
                    onChange={(e) => setNewHostel({ ...newHostel, totalFloors: e.target.value })}
                  />
                </label>
                <label>
                  Faculty Warden (optional)
                  <input
                    placeholder="Name / Employee ID / Email"
                    value={newHostel.warden}
                    onChange={(e) => setNewHostel({ ...newHostel, warden: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="hostel-modal-section hostel-warden-block">
              <div className="hostel-warden-head">
                <div>
                  <strong>Wardens</strong>
                  <span className="hostel-warden-sub">Login IDs & passwords for warden dashboard.</span>
                </div>
                <button
                  type="button"
                  onClick={addWardenRow}
                  disabled={(newHostel.wardens || []).length >= 5}
                >
                  + Add Warden
                </button>
              </div>
              {(Array.isArray(newHostel.wardens)
                ? newHostel.wardens
                : [{ id: "", name: "", email: "", password: "" }]
              ).map((row, idx) => {
                const isExisting = Boolean(String(row?.id || "").trim());
                return (
                  <div key={row.id || idx} className="hostel-warden-row">
                    <label>
                      Name
                      <input
                        placeholder="e.g. Ram Kumar"
                        value={row.name}
                        onChange={(e) => updateWardenRow(idx, "name", e.target.value)}
                      />
                    </label>
                    <label>
                      Email (Login ID)
                      <input
                        placeholder="warden@example.com"
                        value={row.email}
                        onChange={(e) => updateWardenRow(idx, "email", e.target.value)}
                        disabled={isExisting}
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        placeholder={isExisting ? "•••••••• (unchanged)" : "Min 8 characters"}
                        value={row.password}
                        onChange={(e) => updateWardenRow(idx, "password", e.target.value)}
                        disabled={isExisting}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeWardenRow(idx)}
                      disabled={(newHostel.wardens || []).length <= 1}
                    >
                      {isExisting ? "Unassign" : "Remove"}
                    </button>
                    {isExisting ? (
                      <button
                        type="button"
                        className="hostel-warden-delete"
                        onClick={() => handleDeleteExistingWarden(row.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                );
              })}
              {editingHostel?.id ? (
                <div className="hostel-warden-note">
                  Existing wardens’ login IDs/passwords are unchanged. Remove to unassign, or add a new warden.
                </div>
              ) : (
                <div className="hostel-warden-note">
                  Warden password must be at least 8 characters.
                </div>
              )}
            </div>

            <button type="button" className="admin-btn-with-loader" disabled={createHostelLoading} onClick={handleSaveHostel}>
              {createHostelLoading ? (
                <>
                  <ClipLoader size={14} />
                  <span>{editingHostel?.id ? "Updating..." : "Creating..."}</span>
                </>
              ) : (
                editingHostel?.id ? "Update" : "Create"
              )}
            </button>
            <button type="button" onClick={closeHostelModal}>Cancel</button>
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
            <button type="button" className="admin-btn-with-loader" disabled={createRoomLoading} onClick={handleSaveRoom}>
              {createRoomLoading ? (
                <>
                  <ClipLoader size={14} />
                  <span>{editingRoom ? "Updating..." : "Creating..."}</span>
                </>
              ) : (
                editingRoom ? "Update" : "Create"
              )}
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
            <button type="button" className="admin-btn-with-loader" disabled={allocateLoading} onClick={handleAllocateStudent}>
              {allocateLoading ? (
                <>
                  <ClipLoader size={14} />
                  <span>Allocating...</span>
                </>
              ) : (
                "Allocate"
              )}
            </button>
            <button type="button" onClick={() => setShowAllocateModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hostel;
