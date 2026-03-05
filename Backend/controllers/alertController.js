import Alert from "../models/Alert.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";
import Hostel from "../models/hostelModel.js";
import Student from "../models/Student.js";
import HostelAllocation from "../models/hostelAllocationModel.js";

const ALERT_AUDIENCE = new Set(["student", "faculty", "warden"]);
const ALERT_PRIORITY = new Set(["info", "warning", "urgent"]);

const normalizeAudience = (input) => {
  if (!Array.isArray(input)) return [];
  const normalized = input
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean)
    .filter((item) => ALERT_AUDIENCE.has(item));
  return [...new Set(normalized)];
};

const normalizePriority = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return ALERT_PRIORITY.has(normalized) ? normalized : "info";
};

const normalizeExpiry = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const clearAlertsCache = async () => {
  await redisClient.del("admin:alerts:all");
  await redisClient.del("faculty:alerts:all");
  await redisClient.del("student:alerts:all");
  await redisClient.del("warden:alerts:all");
};

export const createAlert = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();
    const audience = normalizeAudience(req.body?.audience);
    const priority = normalizePriority(req.body?.priority);
    const expiresAt = normalizeExpiry(req.body?.expiresAt);

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (audience.length === 0) {
      return res.status(400).json({
        message: "At least one audience is required (student/faculty/warden)",
      });
    }

    if (title.length > 120) {
      return res.status(400).json({
        message: "Title cannot exceed 120 characters",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        message: "Message cannot exceed 2000 characters",
      });
    }

    const alert = await Alert.create({
      title,
      message,
      audience,
      priority,
      isActive: true,
      expiresAt,
      createdBy: req.userId || null,
    });

    try {
      await clearAlertsCache();
    } catch (cacheError) {
      console.error(
        "[Redis] createAlert cache clear failed:",
        cacheError.message || cacheError
      );
    }

    return res.status(201).json({
      message: "Alert created successfully",
      alert,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to create alert",
    });
  }
};

export const getAllAlertsAdmin = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const cacheKey = "admin:alerts:all";

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (cacheError) {
        console.error(
          "[Redis] getAllAlertsAdmin cache read failed:",
          cacheError.message || cacheError
        );
      }
    }

    const alerts = await Alert.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const responsePayload = {
      message: "Alerts fetched successfully",
      count: alerts.length,
      alerts,
    };

    if (!noCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (cacheError) {
        console.error(
          "[Redis] getAllAlertsAdmin cache write failed:",
          cacheError.message || cacheError
        );
      }
    }

    return res.json(responsePayload);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch alerts",
    });
  }
};

export const updateAlertAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    if (typeof req.body?.title !== "undefined") {
      const title = String(req.body.title || "").trim();
      if (!title) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }
      if (title.length > 120) {
        return res.status(400).json({
          message: "Title cannot exceed 120 characters",
        });
      }
      updateData.title = title;
    }

    if (typeof req.body?.message !== "undefined") {
      const message = String(req.body.message || "").trim();
      if (!message) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }
      if (message.length > 2000) {
        return res.status(400).json({
          message: "Message cannot exceed 2000 characters",
        });
      }
      updateData.message = message;
    }

    if (typeof req.body?.audience !== "undefined") {
      const audience = normalizeAudience(req.body.audience);
      if (!audience.length) {
        return res.status(400).json({
          message: "At least one audience is required (student/faculty/warden)",
        });
      }
      updateData.audience = audience;
    }

    if (typeof req.body?.priority !== "undefined") {
      updateData.priority = normalizePriority(req.body.priority);
    }

    if (typeof req.body?.expiresAt !== "undefined") {
      updateData.expiresAt = normalizeExpiry(req.body.expiresAt);
    }

    if (typeof req.body?.isActive !== "undefined") {
      updateData.isActive = Boolean(req.body.isActive);
    }

    if (!Object.keys(updateData).length) {
      return res.status(400).json({
        message: "Provide at least one field to update",
      });
    }

    const alert = await Alert.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    try {
      await clearAlertsCache();
    } catch (cacheError) {
      console.error(
        "[Redis] updateAlertAdmin cache clear failed:",
        cacheError.message || cacheError
      );
    }

    return res.json({
      message: "Alert updated successfully",
      alert,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to update alert",
    });
  }
};

const getAudienceAlertsPayload = async ({ audience, noCache = false }) => {
  const normalizedAudience = String(audience || "").trim().toLowerCase();
  const cacheKey = `${normalizedAudience}:alerts:all`;

  if (!noCache) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error(
        `[Redis] ${normalizedAudience} alerts cache read failed:`,
        cacheError.message || cacheError
      );
    }
  }

  const now = new Date();
  const alerts = await Alert.find({
    isDeleted: { $ne: true },
    isActive: true,
    audience: normalizedAudience,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const payload = {
    message: "Alerts fetched successfully",
    count: alerts.length,
    alerts,
  };

  if (!noCache) {
    try {
      await redisClient.set(cacheKey, JSON.stringify(payload), {
        EX: DEFAULT_CACHE_TTL,
      });
    } catch (cacheError) {
      console.error(
        `[Redis] ${normalizedAudience} alerts cache write failed:`,
        cacheError.message || cacheError
      );
    }
  }

  return payload;
};

export const getFacultyAlerts = async (req, res) => {
  try {
    const payload = await getAudienceAlertsPayload({
      audience: "faculty",
      noCache: req.query.noCache === "true",
    });
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch alerts",
    });
  }
};

export const getStudentAlerts = async (req, res) => {
  try {
    // Hostel-scoped alerts: show global alerts (hostel=null) + hostel-specific alerts
    // Note: No Redis cache here because the result depends on student's hostel allocation.
    const studentProfile = await Student.findOne({ user: req.userId }).select("_id").lean();
    const allocation = studentProfile?._id
      ? await HostelAllocation.findOne({ student: studentProfile._id, status: "Active" })
          .select("hostel")
          .lean()
      : null;

    const hostelId = allocation?.hostel || null;
    const now = new Date();
    const expiryClause = { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };
    const hostelClause = hostelId ? { $or: [{ hostel: null }, { hostel: hostelId }] } : { hostel: null };

    const alerts = await Alert.find({
      isDeleted: { $ne: true },
      isActive: true,
      audience: { $in: ["student"] },
      $and: [expiryClause, hostelClause],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      message: "Alerts fetched successfully",
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch alerts",
    });
  }
};

export const getWardenAlerts = async (req, res) => {
  try {
    const payload = await getAudienceAlertsPayload({
      audience: "warden",
      noCache: req.query.noCache === "true",
    });
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch alerts",
    });
  }
};

const getWardenHostelIds = async (userId) => {
  const hostels = await Hostel.find({ wardens: userId }).select("_id").lean();
  return hostels.map((h) => h?._id).filter(Boolean);
};

export const createWardenStudentAlert = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message || "").trim();
    const priority = normalizePriority(req.body?.priority);
    const expiresAt = normalizeExpiry(req.body?.expiresAt);
    const requestedHostelId = String(req.body?.hostelId || "").trim();

    if (!title) return res.status(400).json({ message: "Title is required" });
    if (!message) return res.status(400).json({ message: "Message is required" });
    if (title.length > 120) return res.status(400).json({ message: "Title cannot exceed 120 characters" });
    if (message.length > 2000) return res.status(400).json({ message: "Message cannot exceed 2000 characters" });

    const hostelIds = await getWardenHostelIds(req.userId);
    if (!hostelIds.length) {
      return res.status(400).json({ message: "No hostels assigned to this warden." });
    }

    let hostelIdToUse = hostelIds[0];
    if (requestedHostelId) {
      const allowed = hostelIds.some((id) => String(id) === requestedHostelId);
      if (!allowed) return res.status(403).json({ message: "Invalid hostel selection." });
      hostelIdToUse = requestedHostelId;
    }

    const alert = await Alert.create({
      hostel: hostelIdToUse,
      title,
      message,
      audience: ["student"],
      priority,
      isActive: true,
      expiresAt,
      createdBy: req.userId || null,
    });

    try {
      await clearAlertsCache();
    } catch (cacheError) {
      console.error("[Redis] createWardenStudentAlert cache clear failed:", cacheError.message || cacheError);
    }

    return res.status(201).json({ message: "Message sent to students.", alert });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to send message." });
  }
};

export const getMyWardenStudentAlerts = async (req, res) => {
  try {
    const hostelIds = await getWardenHostelIds(req.userId);
    const alerts = await Alert.find({
      isDeleted: { $ne: true },
      createdBy: req.userId || null,
      audience: { $in: ["student"] },
      hostel: { $in: hostelIds },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ message: "Messages fetched successfully", count: alerts.length, alerts });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch messages." });
  }
};

export const deleteAlertAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { isDeleted: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    try {
      await clearAlertsCache();
    } catch (cacheError) {
      console.error(
        "[Redis] deleteAlertAdmin cache clear failed:",
        cacheError.message || cacheError
      );
    }

    return res.json({
      message: "Alert deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to delete alert",
    });
  }
};
