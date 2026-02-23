import FacultyLeave from "../models/FacultyLeave.js";
import Faculty from "../models/Faculty.js";

// Parse a date string in format DD.MM.YYYY to a JS Date
const parseDDMMYYYY = (value) => {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (!day || !month || !year) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
};

// Format JS Date to DD.MM.YYYY string
const formatDDMMYYYY = (date) => {
  if (!(date instanceof Date)) return null;
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

export const applyFacultyLeave = async (req, res) => {
  try {
    const { faculty, dateFrom, dateTo, type, status, reason } = req.body;

    const parsedDateFrom = parseDDMMYYYY(dateFrom);
    const parsedDateTo = parseDDMMYYYY(dateTo);

    if (!parsedDateFrom || !parsedDateTo) {
      return res.status(400).json({
        message: "Invalid date format. Use DD.MM.YYYY (e.g. 12.02.2026)",
      });
    }

    const leave = await FacultyLeave.create({
      faculty,
      dateFrom: parsedDateFrom,
      dateTo: parsedDateTo,
      type,
      status,
      reason,
    });

    const leaveObj = leave.toObject();
    // Overwrite dates in response with formatted strings
    leaveObj.dateFrom = formatDDMMYYYY(leave.dateFrom);
    leaveObj.dateTo = formatDDMMYYYY(leave.dateTo);

    return res.status(201).json({
      message: "applied for leave succesfully",
      leave: leaveObj,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// Faculty/Admin: get leaves (faculty gets own leaves)
export const getFacultyLeaves = async (req, res) => {
  try {
    let facultyId = req.query.faculty || null;

    if (req.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: req.userId });
      if (!facultyDoc) {
        return res.status(404).json({
          message: "Faculty profile not found",
        });
      }
      facultyId = facultyDoc._id;
    }

    const filter = facultyId ? { faculty: facultyId } : {};
    const leaves = await FacultyLeave.find(filter)
      .sort({ createdAt: -1 })
      .populate("faculty");

    const mapped = leaves.map((leave) => {
      const obj = leave.toObject();
      obj.dateFrom = formatDDMMYYYY(leave.dateFrom);
      obj.dateTo = formatDDMMYYYY(leave.dateTo);
      return obj;
    });

    return res.json({
      message: "Faculty leaves fetched successfully",
      count: mapped.length,
      leaves: mapped,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// Admin: get all faculty leaves (without timestamps)
export const getAllFacultyLeaves = async (req, res) => {
  try {
    const leaves = await FacultyLeave.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "faculty",
        populate: [
          { path: "user", select: "name email status" },
          { path: "department", select: "name" },
        ],
      });

    const mapped = leaves.map((leave) => {
      const obj = leave.toObject();
      // Format dates as DD.MM.YYYY
      obj.dateFrom = formatDDMMYYYY(leave.dateFrom);
      obj.dateTo = formatDDMMYYYY(leave.dateTo);
      return obj;
    });

    return res.json({
      message: "Faculty leaves fetched successfully",
      count: mapped.length,
      leaves: mapped,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// Admin: update faculty leave status
export const updateFacultyLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["approved", "pending", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Use approved, pending, or rejected.",
      });
    }

    const leave = await FacultyLeave.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate({
        path: "faculty",
        populate: [
          { path: "user", select: "name email status" },
          { path: "department", select: "name" },
        ],
      });

    if (!leave) {
      return res.status(404).json({
        message: "Leave request not found",
      });
    }

    const leaveObj = leave.toObject();
    leaveObj.dateFrom = formatDDMMYYYY(leave.dateFrom);
    leaveObj.dateTo = formatDDMMYYYY(leave.dateTo);

    return res.json({
      message: "Leave status updated successfully",
      leave: leaveObj,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
