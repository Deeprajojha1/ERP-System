import FacultyLeave from "../models/FacultyLeave.js";

export const applyFacultyLeave = async (req, res) => {
  try {
    const { faculty, dateFrom, dateTo, type, status, reason } = req.body;

    const leave = await FacultyLeave.create({
      faculty,
      dateFrom,
      dateTo,
      type,
      status,
      reason,
    });

    return res.status(201).json({
      message: "applied for leave succesfully",
      leave,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
