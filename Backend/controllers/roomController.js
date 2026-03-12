import Room from "../models/roomModel.js";
import Hostel from "../models/hostelModel.js";
import { bumpNamespaceVersion } from "../utils/cacheNamespace.js";

const BED_TIER_CAPACITY = Object.freeze({
  single: 1,
  "two-tier": 2,
  "three-tier": 3,
  "four-tier": 4,
});
const ALLOWED_CAPACITY_MIN = 1;
const ALLOWED_CAPACITY_MAX = 20;

const normalizeBedTier = (value = "") => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "single";

  const normalized = raw.replace(/\s+/g, "-");
  const digitTierMatch = normalized.match(/^(\d+)-tier$/);
  if (digitTierMatch) return `${Number(digitTierMatch[1])}-tier`;

  if (normalized === "2-tier" || normalized === "two-tier") return "two-tier";
  if (normalized === "3-tier" || normalized === "three-tier") return "three-tier";
  if (normalized === "4-tier" || normalized === "four-tier") return "four-tier";

  const seaterMatch = raw.match(/^(\d+)\s*(seater|seat|bed|beds?)$/);
  if (seaterMatch) return `${Number(seaterMatch[1])}-tier`;

  if (raw === "single" || raw === "1-seater" || raw === "1 seater") return "single";
  if (raw === "five-tier" || raw === "5-tier") return "5-tier";
  if (raw === "six-tier" || raw === "6-tier") return "6-tier";
  return "single";
};

const getCapacityFromBedTier = (bedTier = "") => {
  const mapped = BED_TIER_CAPACITY[String(bedTier || "").trim().toLowerCase()];
  if (Number.isFinite(mapped) && mapped > 0) return mapped;
  const match = String(bedTier || "").trim().toLowerCase().match(/^(\d+)-tier$/);
  if (!match) return null;
  const capacity = Number(match[1]);
  return Number.isInteger(capacity) && capacity > 0 ? capacity : null;
};

const parseFloorNumber = (value) => {
  const floor = Number(value);
  if (!Number.isInteger(floor) || floor < 1) return null;
  return floor;
};

/**
 * CREATE ROOM
 */
export const createRoom = async (req, res) => {
  try {
    const {
      hostel,
      roomNumber,
      floorNumber,
      capacity,
      bedTier,
      price,
      priceType,
    } = req.body;

    // Check hostel exists
    const hostelExists = await Hostel.findById(hostel);
    if (!hostelExists) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    const normalizedRoomNumber = String(roomNumber || "").trim();
    if (!normalizedRoomNumber) {
      return res.status(400).json({ message: "Room number is required" });
    }

    const normalizedFloorNumber = parseFloorNumber(floorNumber);
    if (!normalizedFloorNumber) {
      return res.status(400).json({ message: "Valid floor number is required" });
    }

    const hostelFloorLimit = Number(hostelExists.totalFloors || 0);
    if (hostelFloorLimit > 0 && normalizedFloorNumber > hostelFloorLimit) {
      return res.status(400).json({
        message: `Invalid floor number. This hostel has only ${hostelFloorLimit} floor(s).`,
      });
    }

    const normalizedBedTier = normalizeBedTier(bedTier);
    const resolvedCapacityFromTier = getCapacityFromBedTier(normalizedBedTier) || 1;
    const normalizedCapacity =
      Number.isFinite(Number(capacity)) && Number(capacity) > 0
        ? Number(capacity)
        : resolvedCapacityFromTier;
    if (
      !Number.isInteger(Number(normalizedCapacity)) ||
      Number(normalizedCapacity) < ALLOWED_CAPACITY_MIN ||
      Number(normalizedCapacity) > ALLOWED_CAPACITY_MAX
    ) {
      return res.status(400).json({
        message: `Invalid capacity. Allowed values are ${ALLOWED_CAPACITY_MIN}-${ALLOWED_CAPACITY_MAX}.`,
      });
    }

    // Check duplicate room number inside same hostel
    const existingRoom = await Room.findOne({ hostel, roomNumber: normalizedRoomNumber });
    if (existingRoom) {
      return res.status(400).json({ message: "Room already exists in this hostel" });
    }

    const room = await Room.create({
      hostel,
      roomNumber: normalizedRoomNumber,
      floorNumber: normalizedFloorNumber,
      bedTier: normalizedBedTier,
      capacity: normalizedCapacity,
      price,
      priceType,
    });

    // Update hostel
    hostelExists.rooms.push(room._id);
    hostelExists.totalCapacity += normalizedCapacity;
    await hostelExists.save();
    await bumpNamespaceVersion("hostels");

    res.status(201).json({
      message: "Room created successfully",
      room,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * GET ROOMS BY HOSTEL
 */
export const getRoomsByHostel = async (req, res) => {
  try {
    const rooms = await Room.find({ hostel: req.params.hostelId })
      .populate({
        path: "occupants",
        populate: { path: "user", select: "name email" }
      });

    res.status(200).json(rooms);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const hostel = await Hostel.findById(room.hostel).select("_id totalFloors totalCapacity");
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found for this room" });
    }

    const oldCapacity = room.capacity;
    const updatePayload = { ...req.body };

    if (Object.prototype.hasOwnProperty.call(updatePayload, "roomNumber")) {
      const normalizedRoomNumber = String(updatePayload.roomNumber || "").trim();
      if (!normalizedRoomNumber) {
        return res.status(400).json({ message: "Room number is required" });
      }

      const duplicateRoom = await Room.findOne({
        _id: { $ne: room._id },
        hostel: room.hostel,
        roomNumber: normalizedRoomNumber,
      }).select("_id");

      if (duplicateRoom?._id) {
        return res.status(400).json({ message: "Room already exists in this hostel" });
      }
      updatePayload.roomNumber = normalizedRoomNumber;
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, "floorNumber")) {
      const normalizedFloorNumber = parseFloorNumber(updatePayload.floorNumber);
      if (!normalizedFloorNumber) {
        return res.status(400).json({ message: "Valid floor number is required" });
      }
      const hostelFloorLimit = Number(hostel.totalFloors || 0);
      if (hostelFloorLimit > 0 && normalizedFloorNumber > hostelFloorLimit) {
        return res.status(400).json({
          message: `Invalid floor number. This hostel has only ${hostelFloorLimit} floor(s).`,
        });
      }
      updatePayload.floorNumber = normalizedFloorNumber;
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, "bedTier")) {
      updatePayload.bedTier = normalizeBedTier(updatePayload.bedTier);
      if (!Object.prototype.hasOwnProperty.call(updatePayload, "capacity")) {
        updatePayload.capacity = getCapacityFromBedTier(updatePayload.bedTier) || room.capacity;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, "capacity")) {
      const parsedCapacity = Number(updatePayload.capacity);
      if (
        !Number.isInteger(parsedCapacity) ||
        parsedCapacity < ALLOWED_CAPACITY_MIN ||
        parsedCapacity > ALLOWED_CAPACITY_MAX
      ) {
        return res.status(400).json({
          message: `Invalid capacity. Allowed values are ${ALLOWED_CAPACITY_MIN}-${ALLOWED_CAPACITY_MAX}.`,
        });
      }
      updatePayload.capacity = parsedCapacity;
    }

    Object.assign(room, updatePayload);
    await room.save();

    if (updatePayload.capacity && Number(updatePayload.capacity) !== Number(oldCapacity)) {
      hostel.totalCapacity += (Number(updatePayload.capacity) - Number(oldCapacity));
      await hostel.save();
    }
    await bumpNamespaceVersion("hostels");

    res.status(200).json({
      message: "Room updated successfully",
      room,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * DELETE ROOM
 */
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Remove room from hostel
    const hostel = await Hostel.findById(room.hostel);
    if (hostel) {
      hostel.rooms.pull(room._id);
      hostel.totalCapacity -= room.capacity;
      await hostel.save();
    }

    await room.deleteOne();
    await bumpNamespaceVersion("hostels");

    res.status(200).json({ message: "Room deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAvailableRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: "Available" })
      .populate("hostel", "name")
      .populate({
        path: "occupants",
        populate: { path: "user", select: "name email" }
      });

    res.status(200).json(rooms);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFullRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: "Full" })
      .populate("hostel", "name");

    res.status(200).json(rooms);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
