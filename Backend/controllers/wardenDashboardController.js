import Hostel from "../models/hostelModel.js";
import Room from "../models/roomModel.js";
import HostelAllocation from "../models/hostelAllocationModel.js";
import HostelOutpass from "../models/hostelOutpassModel.js";
import HostelComplaint from "../models/hostelComplaintModel.js";
import User from "../models/userModel.js";
import {
  createOutpassQrKey,
  getOutpassQrExpiryDate,
  verifyOutpassQrToken,
  isOutpassQrPayload,
  getOutpassQrUsability,
} from "../utils/outpassQr.js";

const getWardenHostelIds = async (userId) => {
  const hostels = await Hostel.find({ wardens: userId }).select("_id");
  return hostels.map((h) => h._id);
};

const mapOutpass = (doc) => {
  const student = doc?.student;
  const studentUser = student?.user;
  return {
    id: doc?._id,
    serialNumber: doc?.serialNumber || null,
    formDate: doc?.formDate || null,
    student: {
      id: student?._id || null,
      enrollmentNumber: student?.enrollmentNumber || "",
      name: studentUser?.name || "",
      email: studentUser?.email || "",
    },
    studentName: doc?.studentName || studentUser?.name || "",
    branchName: doc?.branchName || "",
    programName: doc?.programName || "",
    roomNumber: doc?.roomNumber || doc?.room?.roomNumber || "",
    room: doc?.room
      ? {
          id: doc.room?._id || null,
          roomNumber: doc.room?.roomNumber || "",
          floorNumber: doc.room?.floorNumber || null,
        }
      : null,
    hostel: doc?.hostel
      ? { id: doc.hostel?._id || null, name: doc.hostel?.name || "", type: doc.hostel?.type || "" }
      : null,
    category: doc?.category || "Other",
    fromDate: doc?.dateFrom || null,
    toDate: doc?.dateTo || null,
    outingTime: doc?.outingTime || "",
    incomingTime: doc?.incomingTime || "",
    destination: doc?.destination || "",
    reason: doc?.reason || "",
    emergencyContact: doc?.emergencyContact || "",
    parentContact: doc?.parentContact || "",
    status: doc?.status || "Pending",
    remarks: doc?.remarks || "",
    approvedBy: doc?.approvedBy?.name || "",
    approvedByName: doc?.approvedByName || doc?.approvedBy?.name || "",
    rejectedBy: doc?.rejectedBy?.name || "",
    approvedAt: doc?.approvedAt || null,
    rejectedAt: doc?.rejectedAt || null,
    rejectionReason: doc?.rejectionReason || "",
    exitTime: doc?.exitTime || null,
    entryTime: doc?.entryTime || null,
    appliedAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
    logs: Array.isArray(doc?.logs)
      ? doc.logs.map((item) => ({
          action: item?.action || "",
          timestamp: item?.timestamp || null,
          by: item?.by || "",
          remarks: item?.remarks || "",
        }))
      : [],
    qr: {
      active: Boolean(doc?.qr?.active),
      scanCount: Number(doc?.qr?.scanCount || 0),
      maxScans: Number(doc?.qr?.maxScans || 2),
      expiresAt: doc?.qr?.expiresAt || null,
      lastScannedAt: doc?.qr?.lastScannedAt || null,
      destroyedAt: doc?.qr?.destroyedAt || null,
    },
  };
};

const toDayBoundary = (value = new Date()) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(-1);
  return { start, end };
};

const computeComingStatus = (outpass, now = new Date()) => {
  const status = String(outpass?.status || "").trim();
  if (!status) return "UNKNOWN";
  if (status === "Returned") return "RETURNED";
  if (status === "Rejected") return "REJECTED";
  if (status === "Cancelled") return "CANCELLED";
  if (status === "Pending") return "PENDING_APPROVAL";

  const hasExited = Boolean(outpass?.exitTime);
  const hasReturned = Boolean(outpass?.entryTime);
  if (hasReturned) return "RETURNED";

  if (hasExited || status === "Exited") {
    const end = new Date(outpass?.dateTo);
    if (!Number.isNaN(end.getTime()) && now.getTime() > end.getTime()) {
      return "OVERDUE";
    }
    return "EXITED";
  }

  if (status === "Approved") return "YET_TO_EXIT";
  return status.toUpperCase();
};

const normalizeQrTokenInput = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");
  try {
    const parsed = new URL(compact);
    const wrapped =
      parsed.searchParams.get("token") ||
      parsed.searchParams.get("qrToken") ||
      parsed.searchParams.get("data");
    if (wrapped) {
      return String(wrapped).trim();
    }
  } catch (_error) {
    // Ignore parse errors and treat as direct JWT token.
  }

  return compact;
};

const isGateSecurityRole = (roleValue) =>
  String(roleValue || "").trim().toLowerCase() === "gatesecurity";

const getAccessibleHostelIds = async (req) => {
  const allowAllForGate = Boolean(req?.allowAllHostelsForGate);
  if (allowAllForGate && isGateSecurityRole(req?.role)) {
    const hostels = await Hostel.find({}).select("_id");
    return hostels.map((h) => h._id);
  }
  return getWardenHostelIds(req.userId);
};

export const getWardenMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email role status");
    if (!user?._id) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
};

export const getWardenHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find({ wardens: req.userId }).select("name type wardenName");
    return res.status(200).json({
      hostels: hostels.map((h) => ({
        id: h._id,
        name: h.name,
        type: h.type,
        wardenName: h.wardenName,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch hostels" });
  }
};

export const getWardenOverview = async (req, res) => {
  try {
    const hostelIds = await getWardenHostelIds(req.userId);
    if (!hostelIds.length) {
      return res.status(200).json({
        overview: {
          totalRooms: 0,
          occupiedRooms: 0,
          studentsOutside: 0,
          pendingComplaints: 0,
          pendingOutpass: 0,
        },
      });
    }

    const rooms = await Room.find({ hostel: { $in: hostelIds } }).select("capacity occupants status");
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => (r?.occupants?.length || 0) > 0).length;

    const now = new Date();
    const studentsOutside = await HostelOutpass.countDocuments({
      hostel: { $in: hostelIds },
      status: "Exited",
      dateFrom: { $lte: now },
      dateTo: { $gte: now },
    });
    const pendingOutpass = await HostelOutpass.countDocuments({
      hostel: { $in: hostelIds },
      status: "Pending",
    });
    const pendingComplaints = await HostelComplaint.countDocuments({
      hostel: { $in: hostelIds },
      status: "pending",
    });

    return res.status(200).json({
      overview: {
        totalRooms,
        occupiedRooms,
        studentsOutside,
        pendingComplaints,
        pendingOutpass,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load overview" });
  }
};

export const getWardenRooms = async (req, res) => {
  try {
    const hostelIds = await getWardenHostelIds(req.userId);
    const rooms = await Room.find({ hostel: { $in: hostelIds } })
      .populate("hostel", "name type")
      .populate({
        path: "occupants",
        select: "enrollmentNumber academicYear user",
        populate: { path: "user", select: "name email" },
      })
      .sort({ floorNumber: 1, roomNumber: 1 });

    return res.status(200).json({
      rooms: rooms.map((room) => ({
        id: room._id,
        hostel: room.hostel ? { id: room.hostel._id, name: room.hostel.name, type: room.hostel.type } : null,
        roomNumber: room.roomNumber,
        floor: room.floorNumber || 0,
        status: room.status,
        capacity: room.capacity,
        occupied: Array.isArray(room.occupants) ? room.occupants.length : 0,
        type:
          room.capacity >= 4
            ? "Deluxe"
            : room.capacity === 3
            ? "Semi-Deluxe"
            : "Normal",
        baseFee: Number(room.price || 0),
        lastUpdated: room.updatedAt || room.createdAt || null,
        hasComplaints: false,
        complaintCount: 0,
        occupants: Array.isArray(room.occupants)
          ? room.occupants.map((student) => ({
              id: student?.enrollmentNumber || student?._id || null,
              enrollmentNumber: student?.enrollmentNumber || "",
              name: student?.user?.name || "",
              email: student?.user?.email || "",
              enrollmentYear: String(student?.academicYear || "").split("-")[0] || "",
            }))
          : [],
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch rooms" });
  }
};

export const updateWardenRoomStatus = async (req, res) => {
  try {
    const hostelIds = await getWardenHostelIds(req.userId);
    const roomId = String(req.params?.roomId || "").trim();
    const nextStatus = String(req.body?.status || "").trim();

    if (!roomId) return res.status(400).json({ message: "Room id is required" });
    if (!["Available", "Full", "Maintenance"].includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid room status" });
    }

    const room = await Room.findById(roomId).select("_id hostel status");
    if (!room?._id) return res.status(404).json({ message: "Room not found" });
    const allowed = hostelIds.some((id) => String(id) === String(room.hostel));
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    room.status = nextStatus;
    await room.save();
    return res.status(200).json({ message: "Room status updated", roomId: room._id, status: room.status });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update room status" });
  }
};

export const getWardenStudents = async (req, res) => {
  try {
    const hostelIds = await getWardenHostelIds(req.userId);
    const allocations = await HostelAllocation.find({
      hostel: { $in: hostelIds },
      status: "Active",
    })
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("room", "roomNumber floorNumber")
      .sort({ createdAt: -1 });

    const studentIds = allocations
      .map((a) => a?.student?._id)
      .filter(Boolean)
      .map((id) => String(id));

    const now = new Date();
    const activeOutpasses = await HostelOutpass.find({
      student: { $in: studentIds },
      status: { $in: ["Approved", "Exited"] },
      dateFrom: { $lte: now },
      dateTo: { $gte: now },
    })
      .select("student status")
      .lean();
    const outpassByStudent = new Map(activeOutpasses.map((o) => [String(o.student), o.status]));

    return res.status(200).json({
      students: allocations.map((allocation) => {
        const student = allocation.student;
        const user = student?.user;
        const outpassStatus = outpassByStudent.get(String(student?._id || "")) || "No Outpass";
        return {
          id: student?._id,
          name: user?.name || "",
          email: user?.email || "",
          enrollmentNumber: student?.enrollmentNumber || "",
          room: allocation.room?.roomNumber || "",
          floor: allocation.room?.floorNumber || 0,
          outpassStatus,
          allocationId: allocation._id,
        };
      }),
      total: allocations.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch students" });
  }
};

export const getWardenOutpasses = async (req, res) => {
  try {
    const hostelIds = await getAccessibleHostelIds(req);
    const status = String(req.query?.status || "").trim();
    const studentId = String(req.query?.studentId || "").trim();
    const roomId = String(req.query?.roomId || "").trim();
    const query = { hostel: { $in: hostelIds } };
    if (status && ["Pending", "Approved", "Exited", "Returned", "Rejected", "Cancelled"].includes(status)) {
      query.status = status;
    }
    if (studentId) query.student = studentId;
    if (roomId) query.room = roomId;

    const outpasses = await HostelOutpass.find(query)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("room", "roomNumber floorNumber")
      .populate("hostel", "name type")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ outpasses: outpasses.map(mapOutpass) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch outpasses" });
  }
};

export const getWardenTodayOutpasses = async (req, res) => {
  try {
    const hostelIds = await getAccessibleHostelIds(req);
    const { start, end } = toDayBoundary(new Date());
    const query = {
      hostel: { $in: hostelIds },
      dateFrom: { $lte: end },
      dateTo: { $gte: start },
    };

    const outpasses = await HostelOutpass.find(query)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("room", "roomNumber floorNumber")
      .populate("hostel", "name type")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .sort({ dateFrom: 1, createdAt: -1 });

    const now = new Date();
    const mapped = outpasses.map((doc) => ({
      ...mapOutpass(doc),
      comingStatus: computeComingStatus(doc, now),
    }));

    return res.status(200).json({
      date: start.toISOString().slice(0, 10),
      count: mapped.length,
      outpasses: mapped,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch today's outpasses" });
  }
};

export const scanWardenOutpassQr = async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    console.log("[OUTPASS_QR_SCAN] request received", {
      wardenUserId: req.userId || null,
      hasToken: Boolean(req.body?.token),
    });
    const hostelIds = await getAccessibleHostelIds(req);
    const token = normalizeQrTokenInput(req.body?.token);
    if (!token) {
      console.warn("[OUTPASS_QR_SCAN] missing token");
      return res.status(400).json({ message: "QR token is required" });
    }

    let payload;
    try {
      payload = verifyOutpassQrToken(token);
    } catch (_error) {
      console.warn("[OUTPASS_QR_SCAN] invalid/expired token");
      return res.status(400).json({ message: "Invalid or expired QR token" });
    }
    if (!isOutpassQrPayload(payload)) {
      console.warn("[OUTPASS_QR_SCAN] invalid payload shape", payload);
      return res.status(400).json({ message: "Invalid QR payload" });
    }
    console.log("[OUTPASS_QR_SCAN] token decoded", {
      outpassId: payload?.outpassId || null,
      hasQrKey: Boolean(payload?.qrKey),
    });

    const outpass = await HostelOutpass.findById(payload.outpassId).select("+qr.key");
    if (!outpass?._id) {
      console.warn("[OUTPASS_QR_SCAN] outpass not found", { outpassId: payload?.outpassId || null });
      return res.status(404).json({ message: "Outpass not found" });
    }
    console.log("[OUTPASS_QR_SCAN] current outpass", {
      outpassId: String(outpass._id),
      status: outpass.status,
      qrActive: Boolean(outpass?.qr?.active),
      qrScanCount: Number(outpass?.qr?.scanCount || 0),
      qrMaxScans: Number(outpass?.qr?.maxScans || 2),
      exitTime: outpass?.exitTime || null,
      entryTime: outpass?.entryTime || null,
    });

    const allowed = hostelIds.some((id) => String(id) === String(outpass.hostel));
    if (!allowed) {
      console.warn("[OUTPASS_QR_SCAN] access denied", {
        outpassId: String(outpass._id),
        hostelId: String(outpass.hostel),
      });
      return res.status(403).json({ message: "Access denied" });
    }

    const qrCheck = getOutpassQrUsability(outpass, new Date());
    if (!qrCheck.usable && ["next_day", "max_scans", "expired", "invalid_status"].includes(qrCheck.reason)) {
      outpass.qr.active = false;
      outpass.qr.destroyedAt = new Date();
      outpass.qr.key = "";
      await outpass.save();
      if (qrCheck.reason === "next_day") {
        return res.status(400).json({ message: "QR is valid only on the day it was issued." });
      }
      if (qrCheck.reason === "max_scans") {
        return res.status(400).json({ message: "QR already consumed" });
      }
      return res.status(400).json({ message: "QR is no longer active" });
    }

    if (!outpass?.qr?.active || !outpass?.qr?.key || payload.qrKey !== outpass.qr.key) {
      console.warn("[OUTPASS_QR_SCAN] qr inactive/mismatch", {
        outpassId: String(outpass._id),
        qrActive: Boolean(outpass?.qr?.active),
        hasStoredKey: Boolean(outpass?.qr?.key),
        keyMatches: payload.qrKey === outpass?.qr?.key,
      });
      return res.status(400).json({ message: "QR is no longer active" });
    }
    if (outpass?.qr?.expiresAt && new Date(outpass.qr.expiresAt).getTime() <= Date.now()) {
      outpass.qr.active = false;
      outpass.qr.destroyedAt = new Date();
      outpass.qr.key = "";
      await outpass.save();
      return res.status(400).json({ message: "QR token expired" });
    }

    const maxScans = Number(outpass?.qr?.maxScans || 2);
    const scanCount = Number(outpass?.qr?.scanCount || 0);
    if (scanCount >= maxScans) {
      return res.status(400).json({ message: "QR already consumed" });
    }

    const now = new Date();
    const scanActor = isGateSecurityRole(req.role) ? "Gate Security Scan" : "Warden Gate Scan";
    let phase = "";
    const hasExitTime = Boolean(outpass?.exitTime);
    const hasEntryTime = Boolean(outpass?.entryTime);
    const normalizedStatus = String(outpass?.status || "").trim();

    // Phase determination is strictly timestamp-driven:
    // 1st scan => set exitTime, 2nd scan => set entryTime.
    if (!hasExitTime) {
      if (!["Approved", "Exited"].includes(normalizedStatus)) {
        console.warn("[OUTPASS_QR_SCAN] invalid state for exit", {
          outpassId: String(outpass._id),
          status: outpass.status,
        });
        return res.status(400).json({ message: "Outpass is not in a scannable state for exit" });
      }
      outpass.status = "Exited";
      outpass.exitTime = now;
      phase = "EXIT";
    } else if (!hasEntryTime) {
      if (!["Exited", "Approved"].includes(normalizedStatus)) {
        console.warn("[OUTPASS_QR_SCAN] invalid state for entry", {
          outpassId: String(outpass._id),
          status: outpass.status,
        });
        return res.status(400).json({ message: "Outpass is not in a scannable state for entry" });
      }
      outpass.status = "Returned";
      outpass.entryTime = now;
      phase = "ENTRY";
    } else {
      return res.status(400).json({ message: "QR already consumed" });
    }

    const normalizedScanCount = phase === "EXIT" ? Math.max(scanCount, 0) + 1 : Math.max(scanCount, 1) + 1;
    outpass.qr.scanCount = normalizedScanCount;
    outpass.qr.lastScannedAt = now;
    if (outpass.qr.scanCount >= maxScans || phase === "ENTRY") {
      outpass.qr.active = false;
      outpass.qr.destroyedAt = now;
      outpass.qr.key = "";
    }

    outpass.logs = Array.isArray(outpass.logs) ? outpass.logs : [];
    const scanActor = isGateSecurityRole(req.role) ? "Gate Security Scan" : "Warden Gate Scan";
    outpass.logs.push({
      action: phase === "EXIT" ? "Exited" : "Returned",
      by: scanActor,
      remarks: `QR scan ${outpass.qr.scanCount}/${maxScans}`,
      timestamp: now,
    });
    console.log("[OUTPASS_QR_SCAN] before save", {
      outpassId: String(outpass._id),
      phase,
      nextStatus: outpass.status,
      exitTime: outpass.exitTime || null,
      entryTime: outpass.entryTime || null,
      scanCount: outpass?.qr?.scanCount || 0,
      qrActive: Boolean(outpass?.qr?.active),
    });

    await outpass.save();

    // Safety guard: when student has returned (2nd scan), force-close any other active QR
    // for the same student so "My Active QR" always disappears after full round-trip.
    if (phase === "ENTRY") {
      await HostelOutpass.updateMany(
        {
          _id: { $ne: outpass._id },
          student: outpass.student,
          "qr.active": true,
        },
        {
          $set: {
            "qr.active": false,
            "qr.destroyedAt": now,
            "qr.key": "",
          },
        }
      );
    }
    console.log("[OUTPASS_QR_SCAN] save successful", {
      outpassId: String(outpass._id),
      phase,
      savedStatus: outpass.status,
      savedExitTime: outpass.exitTime || null,
      savedEntryTime: outpass.entryTime || null,
    });

    const populated = await HostelOutpass.findById(outpass._id)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("room", "roomNumber floorNumber")
      .populate("hostel", "name type")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email");

    return res.status(200).json({
      message: phase === "EXIT" ? "Student exit marked successfully" : "Student entry marked successfully",
      phase,
      outpass: mapOutpass(populated),
      outpassDocument: populated?.toObject ? populated.toObject() : populated,
    });
  } catch (error) {
    console.error("[OUTPASS_QR_SCAN] unexpected error", error);
    return res.status(500).json({ message: error.message || "Failed to verify outpass QR" });
  }
};

export const updateWardenOutpassStatus = async (req, res) => {
  try {
    if (isGateSecurityRole(req.role)) {
      return res.status(403).json({
        message: "Access denied. Gate Security can only scan entry/exit QR.",
      });
    }

    const hostelIds = await getWardenHostelIds(req.userId);
    const outpassId = String(req.params?.id || "").trim();
    const nextStatus = String(req.body?.status || "").trim();
    const remarks = String(req.body?.remarks || "").trim();

    if (!outpassId) return res.status(400).json({ message: "Outpass id is required" });
    if (!["Approved", "Rejected"].includes(nextStatus)) {
      return res.status(400).json({
        message: "Invalid status. Use Approved/Rejected here. Exit/Return is only via QR scan.",
      });
    }

    const outpass = await HostelOutpass.findById(outpassId);
    if (!outpass?._id) return res.status(404).json({ message: "Outpass not found" });
    const allowed = hostelIds.some((id) => String(id) === String(outpass.hostel));
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const currentStatus = String(outpass.status || "");
    if (nextStatus === "Approved" && currentStatus !== "Pending") {
      return res.status(400).json({
        message: `Cannot approve outpass from ${currentStatus || "unknown"} state. Only Pending can be approved.`,
      });
    }
    if (nextStatus === "Rejected" && currentStatus !== "Pending") {
      return res.status(400).json({
        message: `Cannot reject outpass from ${currentStatus || "unknown"} state. Only Pending can be rejected.`,
      });
    }

    if (nextStatus === "Approved") {
      const now = new Date();
      const existingOpenPass = await HostelOutpass.findOne({
        _id: { $ne: outpass._id },
        student: outpass.student,
        status: { $in: ["Approved", "Exited"] },
        dateTo: { $gt: now },
      }).select("_id status dateFrom dateTo");

      if (existingOpenPass?._id) {
        return res.status(400).json({
          message:
            "Student already has another active outpass. Complete/expire the existing pass before approving a new one.",
        });
      }
    }

    outpass.status = nextStatus;
    outpass.remarks = remarks;
    outpass.logs = Array.isArray(outpass.logs) ? outpass.logs : [];
    outpass.logs.push({
      action: nextStatus,
      by: "Warden",
      remarks: remarks || `Status updated to ${nextStatus}`,
      timestamp: new Date(),
    });

    if (nextStatus === "Approved") {
      await HostelOutpass.updateMany(
        {
          _id: { $ne: outpass._id },
          student: outpass.student,
          "qr.active": true,
        },
        {
          $set: {
            "qr.active": false,
            "qr.destroyedAt": new Date(),
            "qr.key": "",
          },
        }
      );

      const approver = await User.findById(req.userId).select("name");
      outpass.approvedBy = req.userId || null;
      outpass.approvedByName = approver?.name || "";
      outpass.approvedAt = new Date();
      outpass.rejectedBy = null;
      outpass.rejectedAt = null;
      outpass.rejectionReason = "";
      outpass.exitTime = null;
      outpass.entryTime = null;
      const now = new Date();
      outpass.qr = {
        ...(outpass.qr || {}),
        key: createOutpassQrKey(),
        issuedAt: now,
        expiresAt: getOutpassQrExpiryDate(outpass),
        scanCount: 0,
        maxScans: 2,
        active: true,
        lastScannedAt: null,
        destroyedAt: null,
      };
    }
    if (nextStatus === "Rejected") {
      outpass.rejectedBy = req.userId || null;
      outpass.rejectedAt = new Date();
      outpass.rejectionReason = remarks;
      outpass.approvedByName = "";
      outpass.qr = {
        ...(outpass.qr || {}),
        active: false,
        destroyedAt: new Date(),
        key: "",
      };
    }
    await outpass.save();

    const populated = await HostelOutpass.findById(outpass._id)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("room", "roomNumber floorNumber")
      .populate("hostel", "name type")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email");

    return res.status(200).json({ message: "Outpass updated", outpass: mapOutpass(populated) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update outpass" });
  }
};

export const getWardenComplaints = async (req, res) => {
  try {
    const hostelIds = await getWardenHostelIds(req.userId);
    const status = String(req.query?.status || "").trim().toLowerCase();
    const studentId = String(req.query?.studentId || "").trim();
    const roomId = String(req.query?.roomId || "").trim();

    const query = { hostel: { $in: hostelIds } };
    if (status && ["pending", "in-progress", "resolved", "rejected"].includes(status)) {
      query.status = status;
    }
    if (studentId) query.student = studentId;
    if (roomId) query.room = roomId;

    const complaints = await HostelComplaint.find(query)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("hostel", "name type")
      .populate("room", "roomNumber floorNumber")
      .populate("handledBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ complaints });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch complaints" });
  }
};

export const updateWardenComplaintStatus = async (req, res) => {
  try {
    const hostelIds = await getWardenHostelIds(req.userId);
    const complaintId = String(req.params?.id || "").trim();
    const status = String(req.body?.status || "").trim().toLowerCase();
    const remarks = String(req.body?.remarks || "").trim();

    if (!complaintId) return res.status(400).json({ message: "Complaint id is required" });
    if (!["pending", "in-progress", "resolved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const complaint = await HostelComplaint.findById(complaintId);
    if (!complaint?._id) return res.status(404).json({ message: "Complaint not found" });
    const allowed = hostelIds.some((id) => String(id) === String(complaint.hostel));
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    complaint.status = status;
    complaint.remarks = remarks;
    complaint.handledBy = req.userId || null;
    complaint.handledAt = new Date();
    complaint.timeline = Array.isArray(complaint.timeline) ? complaint.timeline : [];
    complaint.timeline.push({
      status,
      note: remarks || `Status updated to ${status}`,
      changedBy: req.userId || null,
      changedAt: new Date(),
    });
    await complaint.save();

    const populated = await HostelComplaint.findById(complaint._id)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("hostel", "name type")
      .populate("room", "roomNumber floorNumber")
      .populate("handledBy", "name email role");

    return res.status(200).json({ message: "Complaint updated", complaint: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update complaint" });
  }
};
