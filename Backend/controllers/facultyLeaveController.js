import FacultyLeave from "../models/FacultyLeave.js";

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
