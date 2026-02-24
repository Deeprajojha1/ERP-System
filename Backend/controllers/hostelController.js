import Hostel from "../models/hostelModel.js";

/**
 * CREATE HOSTEL
 */
export const createHostel = async (req, res) => {
  try {
    const { name, type, totalFloors, warden, foodMenu } = req.body;

    const existingHostel = await Hostel.findOne({ name });
    if (existingHostel) {
      return res.status(400).json({ message: "Hostel already exists" });
    }

    const hostel = await Hostel.create({
      name,
      type,
      totalFloors,
      warden,
      foodMenu,
    });

    res.status(201).json({
      message: "Hostel created successfully",
      hostel,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET ALL HOSTELS
 */
export const getAllHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find()
      .populate("warden", "name email")
      .populate("rooms");

    res.status(200).json(hostels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET SINGLE HOSTEL
 */
export const getSingleHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id)
      .populate("warden", "name email")
      .populate("rooms");

    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    res.status(200).json(hostel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * UPDATE HOSTEL
 */
export const updateHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    res.status(200).json({
      message: "Hostel updated successfully",
      hostel,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE HOSTEL
 */
export const deleteHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findByIdAndDelete(req.params.id);

    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    res.status(200).json({ message: "Hostel deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHostelSummary = async (req, res) => {
  try {
    const hostels = await Hostel.find().populate({
      path: "rooms",
      populate: { path: "occupants" },
    });

    const summary = hostels.map((hostel) => {
      let totalCapacity = 0;
      let currentOccupancy = 0;
      let totalPotentialRevenue = 0;
      let currentRevenue = 0;

      hostel.rooms.forEach((room) => {
        totalCapacity += room.capacity || 0;

        const occupied = room.occupants?.length || 0;
        currentOccupancy += occupied;

        const potential = (room.capacity || 0) * (room.price || 0);
        const current = occupied * (room.price || 0);

        totalPotentialRevenue += potential;
        currentRevenue += current;
      });

      const availableBeds = totalCapacity - currentOccupancy;
      const vacancyLoss = totalPotentialRevenue - currentRevenue;

      const occupancyPercentage =
        totalCapacity === 0
          ? 0
          : ((currentOccupancy / totalCapacity) * 100).toFixed(2);

      return {
        id: hostel._id,
        name: hostel.name,
        totalCapacity,
        currentOccupancy,
        availableBeds,
        occupancyPercentage,
        totalPotentialRevenue,
        currentRevenue,
        vacancyLoss,
      };
    });

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};