import Alert from "../models/Alert.js";
import AlertRead from "../models/AlertRead.js";

/**
 * ADMIN: Create Alert
 */
export const createAlert = async (req, res) => {
  try {
    const { title, message, audience, priority, expiresAt, departmentId, groupId } = req.body;

    if (!title || !message || !Array.isArray(audience) || audience.length === 0) {
      return res.status(400).json({ message: "title, message, audience are required" });
    }

    const alert = await Alert.create({
      title,
      message,
      audience,
      priority: priority || "info",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      departmentId: departmentId || null,
      groupId: groupId || null,
      createdBy: req.userId,
      isActive: true,
    });

    return res.status(201).json({ message: "Alert created", alert });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN: List Alerts (for admin panel)
 */
export const getAllAlertsAdmin = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(200);
    return res.json({ alerts });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN: Toggle active / Update
 */
export const updateAlertAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Alert.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Alert not found" });

    return res.json({ message: "Alert updated", alert: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * STUDENT/FACULTY: Get my active alerts + unread info
 */
export const getMyAlerts = async (req, res) => {
  try {
    const role = req.role; // set by isAuth
    const userId = req.userId;

    // active + not expired
    const now = new Date();
    const alerts = await Alert.find({
      isActive: true,
      audience: role,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const alertIds = alerts.map((a) => a._id);

    const reads = await AlertRead.find({
      userId,
      alertId: { $in: alertIds },
    }).select("alertId");

    const readSet = new Set(reads.map((r) => String(r.alertId)));

    const result = alerts.map((a) => ({
      ...a,
      isRead: readSet.has(String(a._id)),
    }));

    const unreadCount = result.reduce((c, a) => c + (a.isRead ? 0 : 1), 0);

    return res.json({ alerts: result, unreadCount });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * STUDENT/FACULTY: Mark alert as read
 */
export const markAlertRead = async (req, res) => {
  try {
    const { id } = req.params; // alertId
    const userId = req.userId;
    const role = req.role;

    await AlertRead.updateOne(
      { alertId: id, userId },
      { $setOnInsert: { alertId: id, userId, role, readAt: new Date() } },
      { upsert: true }
    );

    return res.json({ message: "Marked as read" });
  } catch (err) {
    // duplicate key is fine
    if (err.code === 11000) return res.json({ message: "Already read" });
    return res.status(500).json({ message: err.message });
  }
};