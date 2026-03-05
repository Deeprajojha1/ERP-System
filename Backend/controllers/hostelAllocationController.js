import HostelAllocation from "../models/hostelAllocationModel.js";
import Room from "../models/roomModel.js";
import Hostel from "../models/hostelModel.js";
import Student from "../models/Student.js";
import { bumpNamespaceVersion } from "../utils/cacheNamespace.js";

/**
 * ALLOCATE STUDENT TO ROOM
 */
export const allocateStudent = async (req, res) => {
  try {
    const { enrollmentNumber, roomId } = req.body;

    // 1️⃣ Find student using enrollment number
    const student = await Student.findOne({ enrollmentNumber });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const studentId = student._id;

    // 2️⃣ Find room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // 3️⃣ Check existing allocation
    const existingAllocation = await HostelAllocation.findOne({
      student: studentId,
      status: "Active",
    });

    if (existingAllocation) {
      return res.status(400).json({
        message: "Student already allocated to a room",
      });
    }

    // 4️⃣ Check capacity
    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({
        message: "Room is already full",
      });
    }

    // 5️⃣ Add student to room
    room.occupants.push(studentId);

    if (room.occupants.length === room.capacity) {
      room.status = "Full";
    }

    await room.save();

    // 6️⃣ Update hostel occupancy
    const hostel = await Hostel.findById(room.hostel);
    hostel.currentOccupancy += 1;
    await hostel.save();

    // 7️⃣ Create allocation
    const allocation = await HostelAllocation.create({
      student: studentId,
      hostel: hostel._id,
      room: roomId,
    });

    await bumpNamespaceVersion("hostels");

    res.status(201).json({
      message: "Student allocated successfully",
      allocation,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * VACATE STUDENT
 */
export const vacateStudent = async (req, res) => {
  try {
    const { studentId } = req.body;

    const allocation = await HostelAllocation.findOne({
      student: studentId,
      status: "Active",
    });

    if (!allocation) {
      return res.status(404).json({
        message: "No active allocation found",
      });
    }

    const room = await Room.findById(allocation.room);

    // Remove student from room
    room.occupants.pull(studentId);

    if (room.status === "Full") {
      room.status = "Available";
    }

    await room.save();

    // Update hostel occupancy
    const hostel = await Hostel.findById(allocation.hostel);
    hostel.currentOccupancy -= 1;
    await hostel.save();

    allocation.status = "Vacated";
    allocation.vacatedAt = new Date();
    await allocation.save();

    await bumpNamespaceVersion("hostels");

    res.status(200).json({
      message: "Student vacated successfully",
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getActiveAllocations = async (req, res) => {
  try {
    const allocations = await HostelAllocation.find({ status: "Active" })
      .populate({
        path: "student",
        populate: { path: "user", select: "name email" }
      })
      .populate("room", "roomNumber")
      .populate("hostel", "name");

    res.status(200).json(allocations);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentByEnrollmentNumber = async (req, res) => {
  try {
    const student = await Student.findOne({
      enrollmentNumber: req.params.enrollmentNumber,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
