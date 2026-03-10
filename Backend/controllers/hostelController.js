import Hostel from "../models/hostelModel.js";
import Faculty from "../models/Faculty.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";
import {
  bumpNamespaceVersion,
  getOrSetVersionedJsonCache,
} from "../utils/cacheNamespace.js";

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const { isEmail } = validator;

const resolveWardenId = async (wardenInput) => {
  const rawValue = String(wardenInput || "").trim();
  if (!rawValue) return null;

  if (mongoose.Types.ObjectId.isValid(rawValue)) {
    const facultyById = await Faculty.findById(rawValue).select("_id");
    if (facultyById?._id) return facultyById._id;
  }

  const facultyByEmployeeId = await Faculty.findOne({ employeeId: rawValue }).select("_id");
  if (facultyByEmployeeId?._id) return facultyByEmployeeId._id;

  const safeValue = escapeRegex(rawValue);
  const linkedUsers = await User.find({
    $or: [
      { name: { $regex: `^${safeValue}$`, $options: "i" } },
      { email: { $regex: `^${safeValue}$`, $options: "i" } },
    ],
  }).select("_id");

  if (!linkedUsers.length) return null;

  const facultyByUser = await Faculty.findOne({
    user: { $in: linkedUsers.map((userDoc) => userDoc._id) },
  }).select("_id");

  return facultyByUser?._id || null;
};

const resolveWardenPayload = async (wardenInput, { required = false } = {}) => {
  const rawValue = String(wardenInput || "").trim();

  if (!rawValue) {
    if (required) {
      return {
        ok: false,
        message: "Warden name is required.",
      };
    }
    return {
      ok: true,
      warden: null,
      wardenName: "",
    };
  }

  const resolvedWardenId = await resolveWardenId(rawValue);
  return {
    ok: true,
    warden: resolvedWardenId || null,
    wardenName: rawValue,
  };
};

const normalizeWardenAccountsInput = (input) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => ({
      name: String(entry?.name || "").trim(),
      email: String(entry?.email || "").toLowerCase().trim(),
      password: String(entry?.password || ""),
    }))
    .filter((entry) => entry.name || entry.email || entry.password);
};

const createWardenAccounts = async (wardenAccounts = []) => {
  const sanitized = normalizeWardenAccountsInput(wardenAccounts);
  if (!sanitized.length) {
    return { ok: false, message: "At least 1 warden is required." };
  }
  if (sanitized.length > 5) {
    return { ok: false, message: "You can add at most 5 wardens for a hostel." };
  }

  for (const item of sanitized) {
    if (!item.name || !item.email || !item.password) {
      return { ok: false, message: "Each warden must have name, email and password." };
    }
    if (!isEmail(item.email)) {
      return { ok: false, message: `Invalid warden email: ${item.email}` };
    }
    if (String(item.password).length < 8) {
      return { ok: false, message: "Warden password must be at least 8 characters." };
    }
  }

  const emails = sanitized.map((item) => item.email);
  const existing = await User.find({ email: { $in: emails } }).select("email");
  if (existing.length) {
    return {
      ok: false,
      message: `Warden email already registered: ${existing[0].email}`,
    };
  }

  const createdIds = [];
  for (const item of sanitized) {
    const hashedPassword = await bcrypt.hash(String(item.password), 10);
    const wardenUser = await User.create({
      name: item.name,
      email: item.email,
      passwordHash: hashedPassword,
      role: "warden",
      status: "active",
    });
    createdIds.push(wardenUser._id);
  }

  return { ok: true, ids: createdIds, primaryName: sanitized[0]?.name || "" };
};

const normalizeWardenIdsInput = (input) => {
  if (!Array.isArray(input)) return [];
  const ids = input
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => mongoose.Types.ObjectId.isValid(value));
  // de-dupe while preserving order
  return [...new Set(ids)];
};

const ensureValidWardenUsers = async (ids = []) => {
  if (!ids.length) return { ok: true, ids: [] };
  const users = await User.find({ _id: { $in: ids } }).select("_id role");
  const found = new Set(users.map((u) => String(u._id)));
  const missing = ids.find((id) => !found.has(String(id)));
  if (missing) return { ok: false, message: "One or more wardens are invalid." };
  const invalidRole = users.find((u) => {
    const role = String(u.role || "").toLowerCase();
    return role !== "warden" && role !== "gatesecurity";
  });
  if (invalidRole?._id) {
    return { ok: false, message: "Only warden or gateSecurity users can be assigned." };
  }
  return { ok: true, ids };
};

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const toCleanText = (value = "") => String(value || "").trim();

const normalizeFoodMenuEntry = (entry = {}) => {
  const day = String(entry?.day || "").trim();
  if (!DAY_ORDER.includes(day)) return null;

  return {
    day,
    breakfast: toCleanText(entry?.breakfast),
    lunch: toCleanText(entry?.lunch),
    snacks: toCleanText(entry?.snacks),
    dinner: toCleanText(entry?.dinner),
    breakfastTime: toCleanText(entry?.breakfastTime || "07:30 AM"),
    lunchTime: toCleanText(entry?.lunchTime || "01:00 PM"),
    snacksTime: toCleanText(entry?.snacksTime || "05:00 PM"),
    dinnerTime: toCleanText(entry?.dinnerTime || "08:00 PM"),
    notes: toCleanText(entry?.notes),
  };
};

const normalizeFoodMenuArray = (foodMenuInput = []) => {
  if (!Array.isArray(foodMenuInput)) return [];
  const uniqueByDay = new Map();
  foodMenuInput.forEach((entry) => {
    const normalized = normalizeFoodMenuEntry(entry);
    if (!normalized) return;
    uniqueByDay.set(normalized.day, normalized);
  });

  return DAY_ORDER.map((day) => uniqueByDay.get(day)).filter(Boolean);
};

/**
 * CREATE HOSTEL
 */
export const createHostel = async (req, res) => {
  try {
    const { name, type, totalFloors, warden, foodMenu, wardens } = req.body;

    const wardenAccountsResult = await createWardenAccounts(wardens);
    if (!wardenAccountsResult.ok) {
      return res.status(400).json({ message: wardenAccountsResult.message });
    }

    // Legacy faculty warden input remains optional; we also store a display name.
    const wardenPayload = await resolveWardenPayload(warden, { required: false });
    if (!wardenPayload.ok) {
      return res.status(400).json({ message: wardenPayload.message });
    }

    const existingHostel = await Hostel.findOne({ name });
    if (existingHostel) {
      return res.status(400).json({ message: "Hostel already exists" });
    }

    const hostel = await Hostel.create({
      name,
      type,
      totalFloors,
      warden: wardenPayload.warden,
      wardenName: wardenPayload.wardenName || wardenAccountsResult.primaryName,
      wardens: wardenAccountsResult.ids,
      foodMenu: normalizeFoodMenuArray(foodMenu),
    });

    await bumpNamespaceVersion("hostels");
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
    const noCache = req.query.noCache === "true";
    const payload = await getOrSetVersionedJsonCache({
      namespace: "hostels",
      baseKey: "all",
      noCache,
      fetcher: async () =>
		        Hostel.find()
		          .populate({
		            path: "warden",
		            select: "employeeId user",
	            populate: {
	              path: "user",
		              select: "name email",
		            },
		          })
		          .populate({
		            path: "wardens",
		            select: "name email role status",
		          })
		          .populate({
		            path: "rooms",
		            populate: {
		              path: "occupants",
	              select: "enrollmentNumber user",
	              populate: { path: "user", select: "name email" },
	            },
	          }),
	    });

	    res.status(200).json(payload);
	  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET SINGLE HOSTEL
 */
export const getSingleHostel = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const payload = await getOrSetVersionedJsonCache({
      namespace: "hostels",
      baseKey: `by-id:${req.params.id}`,
      noCache,
	      fetcher: async () =>
		        Hostel.findById(req.params.id)
		          .populate({
		            path: "warden",
		            select: "employeeId user",
	            populate: {
	              path: "user",
		              select: "name email",
		            },
		          })
		          .populate({
		            path: "wardens",
		            select: "name email role status",
		          })
		          .populate({
		            path: "rooms",
		            populate: {
		              path: "occupants",
	              select: "enrollmentNumber user",
	              populate: { path: "user", select: "name email" },
	            },
	          }),
	    });

    if (!payload) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHostelMenu = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id).select("name foodMenu");
    if (!hostel?._id) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    const normalizedMenu = normalizeFoodMenuArray(hostel.foodMenu);
    return res.status(200).json({
      hostelId: hostel._id,
      hostelName: hostel.name,
      foodMenu: normalizedMenu,
      availableDays: DAY_ORDER,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch hostel menu." });
  }
};

export const updateHostelMenu = async (req, res) => {
  try {
    const incomingArray = Array.isArray(req.body?.foodMenu) ? req.body.foodMenu : [];
    const singleDayPayload = req.body?.day ? [req.body] : [];
    const normalizedMenu = normalizeFoodMenuArray(
      incomingArray.length ? incomingArray : singleDayPayload
    );

    if (!normalizedMenu.length) {
      return res.status(400).json({
        message: "Invalid menu payload. Provide valid day entries in foodMenu.",
      });
    }

    const hostel = await Hostel.findById(req.params.id);
    if (!hostel?._id) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    // Merge day-wise so a single-day update doesn't wipe the full menu.
    const current = normalizeFoodMenuArray(hostel.foodMenu);
    const merged = new Map(current.map((item) => [item.day, item]));
    normalizedMenu.forEach((item) => merged.set(item.day, item));
    hostel.foodMenu = DAY_ORDER.map((day) => merged.get(day)).filter(Boolean);
    await hostel.save();

    await bumpNamespaceVersion("hostels");
    return res.status(200).json({
      message: "Hostel menu updated successfully.",
      hostelId: hostel._id,
      foodMenu: hostel.foodMenu,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update hostel menu." });
  }
};

/**
 * UPDATE HOSTEL
 */
export const updateHostel = async (req, res) => {
  try {
    const updatePayload = { ...req.body };

    // Handle hostel wardens update:
    // - `wardenIds`: existing warden user IDs to keep
    // - `wardenAccounts`: new warden accounts to create & attach
    // Backward compat: if `wardens` is provided as array of objects, treat as `wardenAccounts`.
    const wardenIds = normalizeWardenIdsInput(updatePayload.wardenIds);
    const incomingWardenAccounts = Array.isArray(updatePayload.wardenAccounts)
      ? updatePayload.wardenAccounts
      : Array.isArray(updatePayload.wardens) && updatePayload.wardens.some((w) => typeof w === "object")
      ? updatePayload.wardens
      : [];

    if (
      Object.prototype.hasOwnProperty.call(updatePayload, "wardenIds") ||
      Object.prototype.hasOwnProperty.call(updatePayload, "wardenAccounts") ||
      Object.prototype.hasOwnProperty.call(updatePayload, "wardens")
    ) {
      const validExisting = await ensureValidWardenUsers(wardenIds);
      if (!validExisting.ok) {
        return res.status(400).json({ message: validExisting.message });
      }

      let created = { ok: true, ids: [], primaryName: "" };
      const normalizedAccounts = normalizeWardenAccountsInput(incomingWardenAccounts);
      if (normalizedAccounts.length) {
        created = await createWardenAccounts(normalizedAccounts);
        if (!created.ok) {
          return res.status(400).json({ message: created.message });
        }
      }

      const combined = [...validExisting.ids, ...created.ids];
      const uniqueCombined = [...new Set(combined.map((id) => String(id)))];
      if (!uniqueCombined.length) {
        return res.status(400).json({ message: "At least 1 warden is required." });
      }
      if (uniqueCombined.length > 5) {
        return res.status(400).json({ message: "You can add at most 5 wardens for a hostel." });
      }

      updatePayload.wardens = uniqueCombined;
      delete updatePayload.wardenIds;
      delete updatePayload.wardenAccounts;
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, "warden")) {
      const wardenPayload = await resolveWardenPayload(updatePayload.warden, { required: false });
      updatePayload.warden = wardenPayload.warden;
      updatePayload.wardenName = wardenPayload.wardenName;
    } else if (Object.prototype.hasOwnProperty.call(updatePayload, "wardenName")) {
      const wardenPayload = await resolveWardenPayload(updatePayload.wardenName, { required: false });
      updatePayload.warden = wardenPayload.warden;
      updatePayload.wardenName = wardenPayload.wardenName;
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, "foodMenu")) {
      updatePayload.foodMenu = normalizeFoodMenuArray(updatePayload.foodMenu);
    }

    const hostel = await Hostel.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );

    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    await bumpNamespaceVersion("hostels");
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

    await bumpNamespaceVersion("hostels");
    res.status(200).json({ message: "Hostel deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHostelSummary = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const payload = await getOrSetVersionedJsonCache({
      namespace: "hostels",
      baseKey: "summary",
      noCache,
      fetcher: async () => {
        const hostels = await Hostel.find().populate({
          path: "rooms",
          populate: { path: "occupants" },
        });

        return hostels.map((hostel) => {
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
      },
    });

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
