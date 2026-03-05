import HostelOutpass from "../models/hostelOutpassModel.js";
import HostelAllocation from "../models/hostelAllocationModel.js";
import Student from "../models/Student.js";

const CATEGORY_OPTIONS = new Set([
  "Holiday",
  "Weekend",
  "Festival",
  "Medical",
  "Emergency",
  "Other",
]);

const parseDateOnly = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getStudentProfileByUser = async (userId) =>
  Student.findOne({ user: userId }).select("_id enrollmentNumber user");

export const createMyHostelOutpass = async (req, res) => {
  try {
    const studentProfile = await getStudentProfileByUser(req.userId);
    if (!studentProfile?._id) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const activeAllocation = await HostelAllocation.findOne({
      student: studentProfile._id,
      status: "Active",
    }).select("_id hostel room");

    if (!activeAllocation?._id) {
      return res.status(400).json({
        message: "No active hostel allocation found for this student.",
      });
    }

    const category = String(req.body?.category || "").trim();
    const dateFrom = parseDateOnly(req.body?.dateFrom);
    const dateTo = parseDateOnly(req.body?.dateTo);
    const reason = String(req.body?.reason || "").trim();
    const destination = String(req.body?.destination || "").trim();
    const emergencyContact = String(req.body?.emergencyContact || "").trim();
    const parentContact = String(req.body?.parentContact || "").trim();

    if (!CATEGORY_OPTIONS.has(category)) {
      return res.status(400).json({
        message:
          "Invalid category. Allowed: Holiday, Weekend, Festival, Medical, Emergency, Other.",
      });
    }
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        message: "Valid dateFrom and dateTo are required.",
      });
    }
    if (dateFrom.getTime() > dateTo.getTime()) {
      return res.status(400).json({
        message: "dateFrom must be before or equal to dateTo.",
      });
    }
    if (!destination || destination.length < 3) {
      return res.status(400).json({
        message: "Destination is required (min 3 characters).",
      });
    }

    const outpass = await HostelOutpass.create({
      student: studentProfile._id,
      hostel: activeAllocation.hostel,
      room: activeAllocation.room,
      category,
      destination,
      emergencyContact,
      parentContact,
      dateFrom,
      dateTo,
      reason,
      status: "Pending",
      logs: [
        {
          action: "Pending",
          by: studentProfile?.enrollmentNumber || "Student",
          remarks: "Request submitted",
        },
      ],
    });

    return res.status(201).json({
      message: "Holiday request submitted successfully.",
      outpass,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to submit holiday request." });
  }
};

export const getMyHostelOutpasses = async (req, res) => {
  try {
    const studentProfile = await getStudentProfileByUser(req.userId);
    if (!studentProfile?._id) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const outpasses = await HostelOutpass.find({ student: studentProfile._id })
      .sort({ createdAt: -1 })
      .populate("hostel", "name type")
      .populate("room", "roomNumber floorNumber");

    return res.status(200).json({ outpasses });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch holiday requests." });
  }
};
