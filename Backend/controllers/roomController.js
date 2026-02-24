import Room from "../models/roomModel.js";
import Hostel from "../models/hostelModel.js";

/**
 * CREATE ROOM
 */
export const createRoom = async (req, res) => {
  try {
    const { hostel, roomNumber, floorNumber, capacity, price, priceType } = req.body;

    // Check hostel exists
    const hostelExists = await Hostel.findById(hostel);
    if (!hostelExists) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    // Check duplicate room number inside same hostel
    const existingRoom = await Room.findOne({ hostel, roomNumber });
    if (existingRoom) {
      return res.status(400).json({ message: "Room already exists in this hostel" });
    }

    const room = await Room.create({
      hostel,
      roomNumber,
      floorNumber,
      capacity,
      price,
      priceType,
    });

    // Update hostel
    hostelExists.rooms.push(room._id);
    hostelExists.totalCapacity += capacity;
    await hostelExists.save();

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

    const oldCapacity = room.capacity;

    Object.assign(room, req.body);
    await room.save();

    if (req.body.capacity && req.body.capacity !== oldCapacity) {
      const hostel = await Hostel.findById(room.hostel);
      hostel.totalCapacity += (req.body.capacity - oldCapacity);
      await hostel.save();
    }

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