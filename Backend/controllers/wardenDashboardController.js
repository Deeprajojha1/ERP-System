import Hostel from "../models/hostelModel.js";
import Room from "../models/roomModel.js";
import HostelAllocation from "../models/hostelAllocationModel.js";
import HostelOutpass from "../models/hostelOutpassModel.js";
import HostelComplaint from "../models/hostelComplaintModel.js";
import User from "../models/userModel.js";

const getWardenHostelIds = async (userId) => {
  const hostels = await Hostel.find({ wardens: userId }).select("_id");
  return hostels.map((h) => h._id);
};

const mapOutpass = (doc) => {
  const student = doc?.student;
  const studentUser = student?.user;
  return {
    id: doc?._id,
    student: {
      id: student?._id || null,
      enrollmentNumber: student?.enrollmentNumber || "",
      name: studentUser?.name || "",
      email: studentUser?.email || "",
    },
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
    destination: doc?.destination || "",
    reason: doc?.reason || "",
    emergencyContact: doc?.emergencyContact || "",
    parentContact: doc?.parentContact || "",
    status: doc?.status || "Pending",
    remarks: doc?.remarks || "",
    approvedBy: doc?.approvedBy?.name || "",
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
  };
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
    const hostelIds = await getWardenHostelIds(req.userId);
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

export const updateWardenOutpassStatus = async (req, res) => {
  try {
    const hostelIds = await getWardenHostelIds(req.userId);
    const outpassId = String(req.params?.id || "").trim();
    const nextStatus = String(req.body?.status || "").trim();
    const remarks = String(req.body?.remarks || "").trim();

    if (!outpassId) return res.status(400).json({ message: "Outpass id is required" });
    if (!["Approved", "Rejected", "Exited", "Returned"].includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const outpass = await HostelOutpass.findById(outpassId);
    if (!outpass?._id) return res.status(404).json({ message: "Outpass not found" });
    const allowed = hostelIds.some((id) => String(id) === String(outpass.hostel));
    if (!allowed) return res.status(403).json({ message: "Access denied" });

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
      outpass.approvedBy = req.userId || null;
      outpass.approvedAt = new Date();
      outpass.rejectedBy = null;
      outpass.rejectedAt = null;
      outpass.rejectionReason = "";
    }
    if (nextStatus === "Rejected") {
      outpass.rejectedBy = req.userId || null;
      outpass.rejectedAt = new Date();
      outpass.rejectionReason = remarks;
    }
    if (nextStatus === "Exited") {
      outpass.exitTime = new Date();
    }
    if (nextStatus === "Returned") {
      outpass.entryTime = new Date();
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
