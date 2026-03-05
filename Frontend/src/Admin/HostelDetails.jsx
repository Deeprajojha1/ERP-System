import { useMemo, useState, useEffect, useCallback } from "react";
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
import { ThreeDots } from "react-loader-spinner";
import toast from "react-hot-toast";
import ClipLoader from "./components/ClipLoader";
import "./HostelDetails.css";
import {
  DAY_ORDER,
  getInitials,
  percent,
} from "./hostelData";
import {
  getSingleHostelApi,
  getHostelComplaintsApi,
  updateHostelComplaintStatusApi,
  updateHostelMenuApi,
} from "./constants/hostelApi";
import { allocateStudentApi } from "./constants/allocationApi";
import { createRoomApi, updateRoomApi } from "./constants/roomApi";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "./constants/loadStates";

const INITIAL_STUDENT_FORM = {
  studentName: "",
  studentId: "",
  course: "",
  year: "1st Year",
  floorId: "",
  roomId: "",
};

const INITIAL_MENU_DRAFT = {
  breakfast: "",
  lunch: "",
  snacks: "",
  dinner: "",
  breakfastTime: "07:30 AM",
  lunchTime: "01:00 PM",
  snacksTime: "05:00 PM",
  dinnerTime: "08:00 PM",
  notes: "",
};

const BED_TIER_OPTIONS = [
  { value: "single", label: "Single", capacity: 1 },
  { value: "two-tier", label: "Two Tier", capacity: 2 },
  { value: "three-tier", label: "Three Tier", capacity: 3 },
  { value: "four-tier", label: "Four Tier", capacity: 4 },
];

const INITIAL_ROOM_FORM = {
  roomNumber: "",
  floorId: "",
  bedTier: "two-tier",
  price: "",
  priceType: "Yearly",
};

const INITIAL_EDIT_ROOM_FORM = {
  roomId: "",
  roomNumber: "",
  floorId: "",
  bedTier: "two-tier",
  price: "",
  priceType: "Yearly",
  status: "Available",
};

const COMPLAINT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const isRoomAssignable = (room) => {
  const status = String(room?.status || "").trim().toLowerCase();
  if (status === "maintenance") return false;
  const occupiedCount = Array.isArray(room?.occupants) ? room.occupants.length : 0;
  const vacancy = Number(room?.seatCapacity || 0) - occupiedCount;
  return vacancy > 0;
};

const getFloorIdFromNumber = (floorNumber) => `floor-${Number(floorNumber || 1)}`;
const getFloorNumberFromId = (floorId) => Number(String(floorId || "").replace("floor-", "")) || 1;
const getFloorNumberFromOptionId = (options = [], floorId = "") => {
  const selectedOption = options.find((option) => option.id === floorId);
  const optionFloor = Number(selectedOption?.floorNumber);
  if (Number.isInteger(optionFloor) && optionFloor > 0) return optionFloor;
  const parsedFloor = Number(String(floorId || "").replace("floor-", ""));
  if (Number.isInteger(parsedFloor) && parsedFloor > 0) return parsedFloor;
  return null;
};

const getFloorOptionIdByNumber = (options = [], floorNumber) => {
  const numericFloor = Number(floorNumber);
  if (!Number.isInteger(numericFloor) || numericFloor < 1) return "";
  return options.find((option) => Number(option.floorNumber) === numericFloor)?.id || "";
};

const getBedTierMeta = (tierValue) =>
  BED_TIER_OPTIONS.find((option) => option.value === tierValue) || BED_TIER_OPTIONS[0];

const getBedTierFromCapacity = (capacity) => {
  if (Number(capacity) === 4) return "four-tier";
  if (Number(capacity) === 3) return "three-tier";
  if (Number(capacity) === 2) return "two-tier";
  return "single";
};

const formatBedTierLabel = (tierValue, capacity) => {
  const label = BED_TIER_OPTIONS.find((option) => option.value === tierValue)?.label;
  if (label) return label;
  if (Number(capacity) === 2) return "Two Tier";
  if (Number(capacity) === 3) return "Three Tier";
  if (Number(capacity) === 4) return "Four Tier";
  return "Single";
};

const HostelDetails = () => {
  const navigate = useNavigate();
  const { hostelId } = useParams();

  const [hostelData, setHostelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [floors, setFloors] = useState([]);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState(INITIAL_STUDENT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState(INITIAL_ROOM_FORM);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomForm, setEditRoomForm] = useState(INITIAL_EDIT_ROOM_FORM);
  const [updatingRoom, setUpdatingRoom] = useState(false);
  const [menuDraft, setMenuDraft] = useState(INITIAL_MENU_DRAFT);
  const [menuSaving, setMenuSaving] = useState(false);
  const [complaintUpdatingId, setComplaintUpdatingId] = useState("");

  const fetchHostelData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [data, complaintPayload] = await Promise.all([
        getSingleHostelApi(hostelId),
        getHostelComplaintsApi(hostelId).catch(() => ({ complaints: [] })),
      ]);
      // Map backend response to expected frontend structure
      // If floors are not present, create a default floor from rooms
      let floors = [];
      if (Array.isArray(data.rooms) && data.rooms.length > 0) {
        // Group rooms by floorNumber
        const floorMap = {};
        data.rooms.forEach(room => {
          const floorKey = room.floorNumber || "1";
          if (!floorMap[floorKey]) {
            floorMap[floorKey] = {
              id: `floor-${floorKey}`,
              name: `Floor ${floorKey}`,
              rooms: [],
              totalBeds: 0,
              occupiedBeds: 0,
              maintenanceRooms: 0,
            };
          }
          floorMap[floorKey].rooms.push({
            id: room._id,
            roomNo: room.roomNumber,
            roomType: formatBedTierLabel(room.bedTier, room.capacity),
            bedTier: room.bedTier || getBedTierFromCapacity(room.capacity),
            floorNumber: Number(floorKey) || 1,
            seatCapacity: room.capacity,
            capacityClass: room.priceType || "Yearly",
            fee: Number(room.price || 0),
            occupants: Array.isArray(room.occupants) ? room.occupants : [],
            status: room.status,
            maintenanceNote: "",
            floorName: `Floor ${floorKey}`,
          });
          floorMap[floorKey].totalBeds += room.capacity;
          floorMap[floorKey].occupiedBeds += (Array.isArray(room.occupants) ? room.occupants.length : 0);
          if (room.status === "Maintenance") floorMap[floorKey].maintenanceRooms += 1;
        });
        floors = Object.values(floorMap);
      }
      // Map foodMenu array to expected object
      let foodMenu = {};
      if (Array.isArray(data.foodMenu)) {
        data.foodMenu.forEach(menu => {
          foodMenu[menu.day] = {
            breakfast: menu.breakfast || "",
            lunch: menu.lunch || "",
            snacks: menu.snacks || "",
            dinner: menu.dinner || "",
            notes: menu.notes || "",
            time: {
              breakfast: menu.breakfastTime || "07:30 AM",
              lunch: menu.lunchTime || "01:00 PM",
              snacks: menu.snacksTime || "05:00 PM",
              dinner: menu.dinnerTime || "08:00 PM",
            },
          };
        });
      }
      const mappedComplaints = Array.isArray(complaintPayload?.complaints)
        ? complaintPayload.complaints.map((complaint) => ({
            id: complaint.id,
            issueType: complaint.issueType || "General",
            roomNo: complaint?.room?.roomNumber || "N/A",
            description: complaint.description || "",
            status: String(complaint.status || "pending").toLowerCase(),
            studentName: complaint?.student?.name || complaint?.student?.enrollmentNumber || "Unknown",
            remarks: complaint.remarks || "",
          }))
        : [];

      setHostelData({
        ...data,
        floors,
        foodMenu,
        totalRooms: data.rooms?.length || 0,
        occupiedRooms: data.currentOccupancy || 0,
        category: data.type || "Boys",
        code: data.code || data._id?.slice(-6)?.toUpperCase() || "N/A",
        block: data.block || "Main Block",
        warden:
          data.warden?.user?.name ||
          data.warden?.user?.email ||
          data.warden?.employeeId ||
          data.wardenName ||
          "Not Assigned",
      });
      setFloors(floors);
      setComplaints(mappedComplaints);
      setSelectedFloorId((prev) => prev || floors?.[0]?.id || "");
    } catch (error) {
      const message = error?.response?.data?.message || "Hostel not found or failed to load.";
      setLoadError(message);
      toast.error(message);
      setHostelData(null);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchHostelData();
  }, [fetchHostelData]);

  const hostel = useMemo(
    () => ({
      ...(hostelData || {}),
      floors: Array.isArray(floors) ? floors : [],
    }),
    [hostelData, floors]
  );

  const selectedFloor = useMemo(() => {
    const safeFloors = Array.isArray(hostel.floors) ? hostel.floors : [];
    return safeFloors.find((floor) => floor.id === selectedFloorId) || safeFloors[0] || null;
  }, [hostel.floors, selectedFloorId]);

  const floorRooms = useMemo(() => {
    const rooms = Array.isArray(selectedFloor?.rooms) ? selectedFloor.rooms : [];
    const query = roomSearch.trim().toLowerCase();
    if (!query) return rooms;

    return rooms.filter((room) => {
      const occupants = Array.isArray(room?.occupants)
        ? room.occupants
            .map((occupant) =>
              typeof occupant === "string"
                ? occupant
                : occupant?.name || occupant?.user?.name || ""
            )
            .filter(Boolean)
            .join(" ")
        : "";
      const allText = `${room?.roomNo || ""} ${room?.roomType || ""} ${room?.capacityClass || ""} ${occupants}`;
      return allText.toLowerCase().includes(query);
    });
  }, [selectedFloor, roomSearch]);

  const assignFloorOptions = useMemo(() => {
    const safeFloors = Array.isArray(hostel.floors) ? hostel.floors : [];
    const numericFloorCount = Number(hostel?.totalFloors || 0);

    if (Number.isInteger(numericFloorCount) && numericFloorCount > 0) {
      return Array.from({ length: numericFloorCount }, (_, index) => {
        const floorNumber = index + 1;
        return {
          id: getFloorIdFromNumber(floorNumber),
          name: `Floor ${floorNumber}`,
          floorNumber,
        };
      });
    }

    return safeFloors.map((floor, index) => ({
      id: floor.id,
      name: floor.name || `Floor ${index + 1}`,
      floorNumber: getFloorNumberFromId(floor.id),
    }));
  }, [hostel.floors, hostel.totalFloors]);

  const floorRoomLookup = useMemo(() => {
    const safeFloors = Array.isArray(hostel.floors) ? hostel.floors : [];
    return new Map(safeFloors.map((floor) => [floor.id, floor]));
  }, [hostel.floors]);

  const selectedAssignFloor = useMemo(() => {
    if (!assignFloorOptions.length) return null;
    return (
      assignFloorOptions.find((floor) => floor.id === studentForm.floorId) ||
      assignFloorOptions[0]
    );
  }, [assignFloorOptions, studentForm.floorId]);

  const assignableRooms = useMemo(() => {
    const selectedFloorFromBackend = selectedAssignFloor
      ? floorRoomLookup.get(selectedAssignFloor.id)
      : null;
    const rooms = Array.isArray(selectedFloorFromBackend?.rooms)
      ? selectedFloorFromBackend.rooms
      : [];
    return rooms.filter((room) => isRoomAssignable(room));
  }, [selectedAssignFloor, floorRoomLookup]);

  const occupancy = percent(Number(hostel.occupiedRooms || 0), Number(hostel.totalRooms || 0));
  const openComplaints = complaints.filter((complaint) =>
    ["pending", "in-progress"].includes(String(complaint.status || "").toLowerCase())
  ).length;

  const loadState = useMemo(() => {
    if (!hasFetchedOnce && !loading) return ADMIN_LOAD_STATES.INITIAL;
    if (loading) return ADMIN_LOAD_STATES.PENDING;
    if (loadError) return ADMIN_LOAD_STATES.FAILURE;
    return ADMIN_LOAD_STATES.SUCCESS;
  }, [hasFetchedOnce, loading, loadError]);

  const loadStateText =
    ADMIN_LOAD_STATE_OPTIONS.find((option) => option.id === loadState)?.text || "Unknown";

  useEffect(() => {
    const selectedMenu = hostel?.foodMenu?.[selectedDay];
    if (!selectedMenu) {
      setMenuDraft(INITIAL_MENU_DRAFT);
      return;
    }

    setMenuDraft({
      breakfast: selectedMenu.breakfast || "",
      lunch: selectedMenu.lunch || "",
      snacks: selectedMenu.snacks || "",
      dinner: selectedMenu.dinner || "",
      breakfastTime: selectedMenu.time?.breakfast || "07:30 AM",
      lunchTime: selectedMenu.time?.lunch || "01:00 PM",
      snacksTime: selectedMenu.time?.snacks || "05:00 PM",
      dinnerTime: selectedMenu.time?.dinner || "08:00 PM",
      notes: selectedMenu.notes || "",
    });
  }, [hostel, selectedDay]);

  if (loadState === ADMIN_LOAD_STATES.PENDING) {
    return (
      <section className="hostel-details-page">
        <div className="hd-state hd-state-loading app-loader-state">
          <ThreeDots
            visible
            height={40}
            width={66}
            color="#2563eb"
            radius={8}
            ariaLabel="hostel-details-loading"
          />
        </div>
      </section>
    );
  }

  if (loadState === ADMIN_LOAD_STATES.FAILURE) {
    return (
      <section className="hostel-details-page">
        <div className="hostel-not-found">
          <h2>Failed to load hostel details</h2>
          <p>{loadError || "Please try again in a moment."}</p>
          <button type="button" className="hostel-btn hostel-btn-primary" onClick={() => navigate("/admin/hostel")}>
            <FiArrowLeft /> Back to Hostels
          </button>
        </div>
      </section>
    );
  }

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

  const handleMenuDraftChange = (field, value) => {
    setMenuDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSelectedDayMenu = async () => {
    if (!hostelId) return;
    try {
      setMenuSaving(true);
      const currentMenu = hostel?.foodMenu || {};
      const nextMenuByDay = { ...currentMenu };
      nextMenuByDay[selectedDay] = {
        breakfast: menuDraft.breakfast,
        lunch: menuDraft.lunch,
        snacks: menuDraft.snacks,
        dinner: menuDraft.dinner,
        notes: menuDraft.notes,
        time: {
          breakfast: menuDraft.breakfastTime,
          lunch: menuDraft.lunchTime,
          snacks: menuDraft.snacksTime,
          dinner: menuDraft.dinnerTime,
        },
      };

      const payload = {
        foodMenu: DAY_ORDER.map((day) => ({
          day,
          breakfast: nextMenuByDay?.[day]?.breakfast || "",
          lunch: nextMenuByDay?.[day]?.lunch || "",
          snacks: nextMenuByDay?.[day]?.snacks || "",
          dinner: nextMenuByDay?.[day]?.dinner || "",
          breakfastTime: nextMenuByDay?.[day]?.time?.breakfast || "07:30 AM",
          lunchTime: nextMenuByDay?.[day]?.time?.lunch || "01:00 PM",
          snacksTime: nextMenuByDay?.[day]?.time?.snacks || "05:00 PM",
          dinnerTime: nextMenuByDay?.[day]?.time?.dinner || "08:00 PM",
          notes: nextMenuByDay?.[day]?.notes || "",
        })),
      };

      await updateHostelMenuApi(hostelId, payload);
      setHostelData((prev) => ({
        ...(prev || {}),
        foodMenu: nextMenuByDay,
      }));
      toast.success(`${selectedDay} menu updated successfully.`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update menu.");
    } finally {
      setMenuSaving(false);
    }
  };

  const handleComplaintStatusChange = async (complaintId, nextStatus) => {
    if (!complaintId || !nextStatus) return;
    try {
      setComplaintUpdatingId(complaintId);
      const response = await updateHostelComplaintStatusApi(complaintId, {
        status: nextStatus,
      });
      const updatedComplaint = response?.complaint;
      setComplaints((prev) =>
        prev.map((item) =>
          item.id === complaintId
            ? {
                ...item,
                status: String(updatedComplaint?.status || nextStatus).toLowerCase(),
                remarks: updatedComplaint?.remarks || item.remarks || "",
              }
            : item
        )
      );
      toast.success("Complaint status updated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update complaint status.");
    } finally {
      setComplaintUpdatingId("");
    }
  };

  const openAddStudentModal = () => {
    const floorWithVacancy =
      assignFloorOptions.find((floor) =>
        Array.isArray(floorRoomLookup.get(floor.id)?.rooms) &&
        floorRoomLookup.get(floor.id).rooms.some((room) => isRoomAssignable(room))
      ) || assignFloorOptions[0] || null;

    const initialRooms = Array.isArray(floorRoomLookup.get(floorWithVacancy?.id)?.rooms)
      ? floorRoomLookup.get(floorWithVacancy.id).rooms.filter((room) => isRoomAssignable(room))
      : [];

    setStudentForm({
      ...INITIAL_STUDENT_FORM,
      floorId: floorWithVacancy?.id || "",
      roomId: initialRooms[0]?.id || "",
    });
    setShowAddStudentModal(true);
  };

  const closeAddStudentModal = () => {
    setShowAddStudentModal(false);
    setStudentForm(INITIAL_STUDENT_FORM);
  };

  const handleStudentFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "floorId") {
      const floor = floorRoomLookup.get(value);
      const floorRooms = Array.isArray(floor?.rooms)
        ? floor.rooms.filter((room) => isRoomAssignable(room))
        : [];
      setStudentForm((prev) => ({
        ...prev,
        floorId: value,
        roomId: floorRooms[0]?.id || "",
      }));
      return;
    }
    setStudentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const name = studentForm.studentName.trim();
    const studentId = studentForm.studentId.trim();
    const floorId = studentForm.floorId;
    const roomId = studentForm.roomId;

    if (!studentId) {
      toast.error("Enrollment number is required.");
      return;
    }
    if (!roomId) {
      toast.error("Please select a room.");
      return;
    }
    if (!floorId) {
      toast.error("Please select a floor.");
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedFloor = assignFloorOptions.find((floor) => floor.id === floorId);
      const assignedRoom = (Array.isArray(floorRoomLookup.get(assignedFloor?.id)?.rooms)
        ? floorRoomLookup.get(assignedFloor.id).rooms
        : []
      ).find((room) => room.id === roomId);

      await allocateStudentApi({
        enrollmentNumber: studentId,
        roomId,
      });
      await fetchHostelData();

      toast.success(`${name || studentId} added to Room ${assignedRoom?.roomNo || "Selected Room"}`);
      closeAddStudentModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add student. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddRoomModal = () => {
    setRoomForm({
      ...INITIAL_ROOM_FORM,
      floorId: assignFloorOptions[0]?.id || "",
    });
    setShowAddRoomModal(true);
  };

  const closeAddRoomModal = () => {
    setShowAddRoomModal(false);
    setRoomForm(INITIAL_ROOM_FORM);
  };

  const handleRoomFormChange = (e) => {
    const { name, value } = e.target;
    setRoomForm((prev) => ({ ...prev, [name]: value }));
  };

  const openEditRoomModal = (room) => {
    if (!room?.id) return;
    const resolvedFloorId =
      getFloorOptionIdByNumber(assignFloorOptions, room.floorNumber) ||
      room.floorId ||
      selectedFloor?.id ||
      assignFloorOptions[0]?.id ||
      "";

    setEditRoomForm({
      roomId: room.id,
      roomNumber: room.roomNo || "",
      floorId: resolvedFloorId,
      bedTier: room.bedTier || getBedTierFromCapacity(room.seatCapacity),
      price: Number(room.fee || 0),
      priceType: room.capacityClass || "Yearly",
      status: room.status || "Available",
    });
    setShowEditRoomModal(true);
  };

  const closeEditRoomModal = () => {
    setShowEditRoomModal(false);
    setEditRoomForm(INITIAL_EDIT_ROOM_FORM);
  };

  const handleEditRoomFormChange = (e) => {
    const { name, value } = e.target;
    setEditRoomForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    const roomNumber = String(editRoomForm.roomNumber || "").trim();
    const floorId = String(editRoomForm.floorId || "").trim();

    if (!editRoomForm.roomId) {
      toast.error("Invalid room selected.");
      return;
    }
    if (!roomNumber) {
      toast.error("Room number is required.");
      return;
    }
    if (!floorId) {
      toast.error("Please select floor.");
      return;
    }

    const floorNumber = getFloorNumberFromOptionId(assignFloorOptions, floorId);
    if (!floorNumber) {
      toast.error("Invalid floor selected.");
      return;
    }
    const bedTierMeta = getBedTierMeta(editRoomForm.bedTier);

    try {
      setUpdatingRoom(true);
      await updateRoomApi(editRoomForm.roomId, {
        roomNumber,
        floorNumber,
        bedTier: bedTierMeta.value,
        capacity: bedTierMeta.capacity,
        price: Number(editRoomForm.price || 0),
        priceType: editRoomForm.priceType || "Yearly",
        status: editRoomForm.status || "Available",
      });
      await fetchHostelData();
      closeEditRoomModal();
      toast.success(`Room ${roomNumber} updated successfully.`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update room.");
    } finally {
      setUpdatingRoom(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const roomNumber = String(roomForm.roomNumber || "").trim();
    const floorId = String(roomForm.floorId || "").trim();

    if (!roomNumber) {
      toast.error("Room number is required.");
      return;
    }
    if (!floorId) {
      toast.error("Please select floor.");
      return;
    }

    const duplicateRoomOnFloor = (Array.isArray(floorRoomLookup.get(floorId)?.rooms)
      ? floorRoomLookup.get(floorId).rooms
      : []
    ).find((room) => String(room.roomNo || "").toLowerCase() === roomNumber.toLowerCase());

    if (duplicateRoomOnFloor) {
      toast.error("This room number already exists on selected floor.");
      return;
    }

    const floorNumber = getFloorNumberFromOptionId(assignFloorOptions, floorId);
    if (!floorNumber) {
      toast.error("Invalid floor selected.");
      return;
    }
    const bedTierMeta = getBedTierMeta(roomForm.bedTier);

    try {
      setCreatingRoom(true);
      await createRoomApi({
        hostel: hostelId,
        roomNumber,
        floorNumber,
        bedTier: bedTierMeta.value,
        capacity: bedTierMeta.capacity,
        price: Number(roomForm.price || 0),
        priceType: roomForm.priceType || "Yearly",
      });
      await fetchHostelData();
      closeAddRoomModal();
      toast.success(`Room ${roomNumber} created on Floor ${floorNumber}.`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create room.");
    } finally {
      setCreatingRoom(false);
    }
  };

  const formatComplaintStatusLabel = (status = "") => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "in-progress") return "In Progress";
    if (normalized === "resolved") return "Resolved";
    if (normalized === "rejected") return "Rejected";
    return "Pending";
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
        <span className={`hd-load-chip ${loadState}`}>{loadStateText}</span>
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
        <button type="button" className="hostel-btn hostel-btn-light" onClick={openAddRoomModal}>
          + Create Room
        </button>
        <button type="button" className="hostel-btn hostel-btn-primary" onClick={openAddStudentModal}>
          <FiUserPlus /> Add Student
        </button>
      </div>

      <div className="hd-room-grid">
        {floorRooms.length === 0 ? (
          <div className="hd-empty">No rooms found.</div>
        ) : (
          floorRooms.map((room) => {
            const occupants = Array.isArray(room.occupants) ? room.occupants : [];
            const roomFee = Number(room.fee || 0);
            const vacancy = Math.max(Number(room.seatCapacity || 0) - occupants.length, 0);
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
                <p>{room.capacityClass} | {room.seatCapacity} Seater | INR {roomFee.toLocaleString("en-IN")}</p>
                <div className="hd-room-actions">
                  <button
                    type="button"
                    className="hd-room-action-btn"
                    onClick={() => openEditRoomModal(room)}
                  >
                    <FiEdit3 /> Edit Room
                  </button>
                </div>
                {isMaintenance ? (
                  <div className="hd-room-warning">
                    <FiAlertTriangle />
                    <span>{room.maintenanceNote}</span>
                  </div>
                ) : (
                  <div className="hd-occupants">
                    {occupants.length === 0 ? (
                      <span className="hd-no-student">No student assigned</span>
                    ) : (
                      occupants.map((occupant, idx) => {
                        const displayName = typeof occupant === "string" 
                          ? `Student ${idx + 1}` 
                          : (occupant?.name || occupant?.user?.name || `Student ${idx + 1}`);
                        return (
                          <div key={typeof occupant === "string" ? occupant : occupant?._id || idx} className="hd-occupant">
                            <span className="hd-avatar">{getInitials(displayName)}</span>
                            <span>{displayName}</span>
                          </div>
                        );
                      })
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
            {hostel.foodMenu?.[selectedDay] ? (
              <>
                <div className="hd-meal">
                  <h4><FiSun /> Breakfast</h4>
                  <p>{hostel.foodMenu[selectedDay].breakfast || "N/A"}</p>
                  <span>{hostel.foodMenu[selectedDay].time?.breakfast || "07:30 AM"}</span>
                </div>
                <div className="hd-meal">
                  <h4><FiUsers /> Lunch</h4>
                  <p>{hostel.foodMenu[selectedDay].lunch || "N/A"}</p>
                  <span>{hostel.foodMenu[selectedDay].time?.lunch || "01:00 PM"}</span>
                </div>
                <div className="hd-meal">
                  <h4><FiCoffee /> Snacks</h4>
                  <p>{hostel.foodMenu[selectedDay].snacks || "N/A"}</p>
                  <span>{hostel.foodMenu[selectedDay].time?.snacks || "05:00 PM"}</span>
                </div>
                <div className="hd-meal">
                  <h4><FiMoon /> Dinner</h4>
                  <p>{hostel.foodMenu[selectedDay].dinner || "N/A"}</p>
                  <span>{hostel.foodMenu[selectedDay].time?.dinner || "08:00 PM"}</span>
                </div>
              </>
            ) : (
              <div className="hd-empty-small">No menu available for {selectedDay}.</div>
            )}
            <div className="hd-menu-editor">
              <h4>Update {selectedDay} Menu</h4>
              <div className="hd-menu-grid">
                <label>
                  Breakfast
                  <input
                    type="text"
                    value={menuDraft.breakfast}
                    onChange={(e) => handleMenuDraftChange("breakfast", e.target.value)}
                    placeholder="Breakfast items"
                  />
                </label>
                <label>
                  Breakfast Time
                  <input
                    type="text"
                    value={menuDraft.breakfastTime}
                    onChange={(e) => handleMenuDraftChange("breakfastTime", e.target.value)}
                    placeholder="07:30 AM"
                  />
                </label>
                <label>
                  Lunch
                  <input
                    type="text"
                    value={menuDraft.lunch}
                    onChange={(e) => handleMenuDraftChange("lunch", e.target.value)}
                    placeholder="Lunch items"
                  />
                </label>
                <label>
                  Lunch Time
                  <input
                    type="text"
                    value={menuDraft.lunchTime}
                    onChange={(e) => handleMenuDraftChange("lunchTime", e.target.value)}
                    placeholder="01:00 PM"
                  />
                </label>
                <label>
                  Snacks
                  <input
                    type="text"
                    value={menuDraft.snacks}
                    onChange={(e) => handleMenuDraftChange("snacks", e.target.value)}
                    placeholder="Snacks items"
                  />
                </label>
                <label>
                  Snacks Time
                  <input
                    type="text"
                    value={menuDraft.snacksTime}
                    onChange={(e) => handleMenuDraftChange("snacksTime", e.target.value)}
                    placeholder="05:00 PM"
                  />
                </label>
                <label>
                  Dinner
                  <input
                    type="text"
                    value={menuDraft.dinner}
                    onChange={(e) => handleMenuDraftChange("dinner", e.target.value)}
                    placeholder="Dinner items"
                  />
                </label>
                <label>
                  Dinner Time
                  <input
                    type="text"
                    value={menuDraft.dinnerTime}
                    onChange={(e) => handleMenuDraftChange("dinnerTime", e.target.value)}
                    placeholder="08:00 PM"
                  />
                </label>
              </div>
              <label className="hd-menu-notes">
                Notes
                <textarea
                  value={menuDraft.notes}
                  onChange={(e) => handleMenuDraftChange("notes", e.target.value)}
                  rows={2}
                  placeholder="Optional notes for this day menu"
                />
              </label>
              <button
                type="button"
                className="hostel-btn hostel-btn-primary admin-btn-with-loader"
                disabled={menuSaving}
                onClick={handleSaveSelectedDayMenu}
              >
                {menuSaving ? (
                  <>
                    <ClipLoader size={14} />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Menu"
                )}
              </button>
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
                      {complaint.status === "resolved" ? (
                        <FiCheckCircle />
                      ) : complaint.status === "in-progress" ? (
                        <FiClock />
                      ) : complaint.status === "rejected" ? (
                        <FiX />
                      ) : (
                        <FiTool />
                      )}
                      {formatComplaintStatusLabel(complaint.status)}
                    </span>
                  </div>
                  <p>{complaint.description}</p>
                  <small>Student: {complaint.studentName}</small>
                  {!!complaint.remarks && (
                    <small>Remarks: {complaint.remarks}</small>
                  )}
                  <label className="hd-resolution-field">
                    Status
                    <select
                      value={complaint.status || "pending"}
                      disabled={complaintUpdatingId === complaint.id}
                      onChange={(e) => handleComplaintStatusChange(complaint.id, e.target.value)}
                    >
                      {COMPLAINT_STATUS_OPTIONS.map((opt) => (
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

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className="hd-modal-overlay" onClick={closeAddRoomModal}>
          <div className="hd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hd-modal-header">
              <h2>Create Room in {hostel.name}</h2>
              <button type="button" className="hd-modal-close" onClick={closeAddRoomModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="hd-modal-form">
              <div className="hd-form-group">
                <label>Room Number *</label>
                <input
                  type="text"
                  name="roomNumber"
                  value={roomForm.roomNumber}
                  onChange={handleRoomFormChange}
                  placeholder="e.g., 101"
                  required
                />
              </div>

              <div className="hd-form-row">
                <div className="hd-form-group">
                  <label>Floor *</label>
                  <select
                    name="floorId"
                    value={roomForm.floorId}
                    onChange={handleRoomFormChange}
                    required
                  >
                    <option value="">-- Select Floor --</option>
                    {assignFloorOptions.map((floor) => (
                      <option key={floor.id} value={floor.id}>
                        {floor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hd-form-group">
                  <label>Bed Tier *</label>
                  <select
                    name="bedTier"
                    value={roomForm.bedTier}
                    onChange={handleRoomFormChange}
                    required
                  >
                    {BED_TIER_OPTIONS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label} ({tier.capacity} Seater)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hd-form-row">
                <div className="hd-form-group">
                  <label>Room Price</label>
                  <input
                    type="number"
                    min="0"
                    name="price"
                    value={roomForm.price}
                    onChange={handleRoomFormChange}
                    placeholder="e.g., 45000"
                  />
                </div>
                <div className="hd-form-group">
                  <label>Fee Type</label>
                  <select
                    name="priceType"
                    value={roomForm.priceType}
                    onChange={handleRoomFormChange}
                  >
                    <option value="Yearly">Yearly</option>
                    <option value="Semester">Semester</option>
                  </select>
                </div>
              </div>

              <div className="hd-modal-actions">
                <button
                  type="button"
                  className="hostel-btn hostel-btn-light"
                  onClick={closeAddRoomModal}
                  disabled={creatingRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hostel-btn hostel-btn-primary admin-btn-with-loader"
                  disabled={creatingRoom || assignFloorOptions.length === 0}
                >
                  {creatingRoom ? (
                    <>
                      <ClipLoader size={15} color="#000000" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    "Create Room"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <label>Student Name (Optional)</label>
                <input
                  type="text"
                  name="studentName"
                  value={studentForm.studentName}
                  onChange={handleStudentFormChange}
                  placeholder="Enter student's full name"
                />
              </div>
              <div className="hd-form-group">
                <label>Enrollment Number *</label>
                <input
                  type="text"
                  name="studentId"
                  value={studentForm.studentId}
                  onChange={handleStudentFormChange}
                  placeholder="e.g., HU24CS0012"
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
                <div className="hd-form-row">
                  <div className="hd-form-group">
                    <label>Floor *</label>
                    <select
                      name="floorId"
                      value={studentForm.floorId}
                      onChange={handleStudentFormChange}
                      required
                    >
                      <option value="">-- Select Floor --</option>
                      {assignFloorOptions.map((floor) => (
                        <option key={floor.id} value={floor.id}>
                          {floor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="hd-form-group">
                    <label>Room Number *</label>
                    <select
                      name="roomId"
                      value={studentForm.roomId}
                      onChange={handleStudentFormChange}
                      required
                    >
                      <option value="">-- Select Room --</option>
                      {assignableRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          Room {room.roomNo} ({selectedAssignFloor?.name || room.floorName || "Floor"}) - {Math.max(Number(room.seatCapacity || 0) - (Array.isArray(room.occupants) ? room.occupants.length : 0), 0)} beds available
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {assignFloorOptions.length === 0 ? (
                  <small className="hd-form-hint warning">No floors found for this hostel.</small>
                ) : assignableRooms.length === 0 ? (
                  <small className="hd-form-hint warning">No rooms available on selected floor.</small>
                ) : null}
              </div>
              <div className="hd-modal-actions">
                <button type="button" className="hostel-btn hostel-btn-light" onClick={closeAddStudentModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="hostel-btn hostel-btn-primary admin-btn-with-loader" disabled={assignableRooms.length === 0 || isSubmitting}>
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

      {/* Edit Room Modal */}
      {showEditRoomModal && (
        <div className="hd-modal-overlay" onClick={closeEditRoomModal}>
          <div className="hd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hd-modal-header">
              <h2>Edit Room in {hostel.name}</h2>
              <button type="button" className="hd-modal-close" onClick={closeEditRoomModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleUpdateRoom} className="hd-modal-form">
              <div className="hd-form-group">
                <label>Room Number *</label>
                <input
                  type="text"
                  name="roomNumber"
                  value={editRoomForm.roomNumber}
                  onChange={handleEditRoomFormChange}
                  placeholder="e.g., 101"
                  required
                />
              </div>

              <div className="hd-form-row">
                <div className="hd-form-group">
                  <label>Floor *</label>
                  <select
                    name="floorId"
                    value={editRoomForm.floorId}
                    onChange={handleEditRoomFormChange}
                    required
                  >
                    <option value="">-- Select Floor --</option>
                    {assignFloorOptions.map((floor) => (
                      <option key={floor.id} value={floor.id}>
                        {floor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hd-form-group">
                  <label>Bed Tier *</label>
                  <select
                    name="bedTier"
                    value={editRoomForm.bedTier}
                    onChange={handleEditRoomFormChange}
                    required
                  >
                    {BED_TIER_OPTIONS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label} ({tier.capacity} Seater)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hd-form-row">
                <div className="hd-form-group">
                  <label>Room Price</label>
                  <input
                    type="number"
                    min="0"
                    name="price"
                    value={editRoomForm.price}
                    onChange={handleEditRoomFormChange}
                    placeholder="e.g., 45000"
                  />
                </div>
                <div className="hd-form-group">
                  <label>Fee Type</label>
                  <select
                    name="priceType"
                    value={editRoomForm.priceType}
                    onChange={handleEditRoomFormChange}
                  >
                    <option value="Yearly">Yearly</option>
                    <option value="Semester">Semester</option>
                  </select>
                </div>
              </div>

              <div className="hd-form-group">
                <label>Room Status</label>
                <select
                  name="status"
                  value={editRoomForm.status}
                  onChange={handleEditRoomFormChange}
                >
                  <option value="Available">Available</option>
                  <option value="Full">Full</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div className="hd-modal-actions">
                <button
                  type="button"
                  className="hostel-btn hostel-btn-light"
                  onClick={closeEditRoomModal}
                  disabled={updatingRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hostel-btn hostel-btn-primary admin-btn-with-loader"
                  disabled={updatingRoom || assignFloorOptions.length === 0}
                >
                  {updatingRoom ? (
                    <>
                      <ClipLoader size={15} color="#000000" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Changes"
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
