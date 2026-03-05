import HostelComplaint from "../models/hostelComplaintModel.js";
import HostelAllocation from "../models/hostelAllocationModel.js";
import Student from "../models/Student.js";
import Room from "../models/roomModel.js";

const ALLOWED_COMPLAINT_STATUSES = ["pending", "in-progress", "resolved", "rejected"];

const normalizeStatus = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (normalized === "inprogress") return "in-progress";
  if (ALLOWED_COMPLAINT_STATUSES.includes(normalized)) return normalized;
  return "";
};

const parseRoleAccess = (req) => ["admin", "faculty", "warden"].includes(String(req.role || "").toLowerCase());

const toApiComplaint = (complaintDoc) => {
  const complaint = complaintDoc?.toObject ? complaintDoc.toObject() : complaintDoc || {};
  return {
    id: complaint._id,
    status: normalizeStatus(complaint.status) || "pending",
    issueType: complaint.issueType || "",
    description: complaint.description || "",
    imageUrl: complaint.imageUrl || "",
    priority: complaint.priority || "medium",
    remarks: complaint.remarks || "",
    createdAt: complaint.createdAt || null,
    updatedAt: complaint.updatedAt || null,
    room: {
      id: complaint.room?._id || complaint.room || null,
      roomNumber: complaint.room?.roomNumber || "",
      floorNumber: complaint.room?.floorNumber ?? null,
    },
    hostel: {
      id: complaint.hostel?._id || complaint.hostel || null,
      name: complaint.hostel?.name || "",
      type: complaint.hostel?.type || "",
    },
    student: {
      id: complaint.student?._id || complaint.student || null,
      enrollmentNumber: complaint.student?.enrollmentNumber || "",
      name: complaint.student?.user?.name || "",
      email: complaint.student?.user?.email || "",
    },
    handledBy: complaint.handledBy
      ? {
          id: complaint.handledBy?._id || null,
          name: complaint.handledBy?.name || "",
          email: complaint.handledBy?.email || "",
          role: complaint.handledBy?.role || "",
        }
      : null,
    handledAt: complaint.handledAt || null,
    timeline: Array.isArray(complaint.timeline)
      ? complaint.timeline.map((item) => ({
          status: normalizeStatus(item?.status) || "pending",
          note: item?.note || "",
          changedBy: item?.changedBy || null,
          changedAt: item?.changedAt || null,
        }))
      : [],
  };
};

const getStudentProfileByUser = async (userId) =>
  Student.findOne({ user: userId }).select("_id enrollmentNumber user");

export const createStudentHostelComplaint = async (req, res) => {
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

    const issueType = String(req.body?.issueType || "").trim();
    const description = String(req.body?.description || "").trim();
    const priority = String(req.body?.priority || "medium").trim().toLowerCase();
    const roomIdFromBody = String(req.body?.roomId || "").trim();
    const imageUrl = String(req.body?.imageUrl || "").trim();

    if (!issueType) {
      return res.status(400).json({ message: "Issue type is required." });
    }
    if (!description || description.length < 10) {
      return res.status(400).json({ message: "Description must be at least 10 characters." });
    }
    if (!["low", "medium", "high"].includes(priority)) {
      return res.status(400).json({ message: "Priority must be low, medium, or high." });
    }

    if (roomIdFromBody && String(activeAllocation.room) !== roomIdFromBody) {
      return res.status(400).json({
        message: "Invalid room. You can create complaints only for your allocated room.",
      });
    }

    const complaint = await HostelComplaint.create({
      student: studentProfile._id,
      hostel: activeAllocation.hostel,
      room: activeAllocation.room,
      issueType,
      description,
      imageUrl,
      priority,
      status: "pending",
      timeline: [
        {
          status: "pending",
          note: "Complaint created",
          changedBy: req.userId || null,
          changedAt: new Date(),
        },
      ],
    });

    const populated = await HostelComplaint.findById(complaint._id)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("hostel", "name type")
      .populate("room", "roomNumber floorNumber");

    return res.status(201).json({
      message: "Complaint created successfully.",
      complaint: toApiComplaint(populated),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create complaint." });
  }
};

export const getMyHostelComplaints = async (req, res) => {
  try {
    const studentProfile = await getStudentProfileByUser(req.userId);
    if (!studentProfile?._id) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const statusFilter = normalizeStatus(req.query?.status);
    const query = { student: studentProfile._id };
    if (statusFilter) query.status = statusFilter;

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

    return res.status(200).json({
      complaints: complaints.map(toApiComplaint),
      total: complaints.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch complaints." });
  }
};

export const getHostelComplaints = async (req, res) => {
  try {
    if (!parseRoleAccess(req)) {
      return res.status(403).json({ message: "Access denied. Hostel manager privileges required." });
    }

    const hostelId = String(req.params?.id || req.query?.hostelId || "").trim();
    const statusFilter = normalizeStatus(req.query?.status);
    const issueTypeFilter = String(req.query?.issueType || "").trim().toLowerCase();
    const search = String(req.query?.search || "").trim().toLowerCase();

    const query = {};
    if (hostelId) query.hostel = hostelId;
    if (statusFilter) query.status = statusFilter;

    let complaints = await HostelComplaint.find(query)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("hostel", "name type")
      .populate("room", "roomNumber floorNumber")
      .populate("handledBy", "name email role")
      .sort({ createdAt: -1 });

    if (issueTypeFilter) {
      complaints = complaints.filter((item) =>
        String(item?.issueType || "").toLowerCase().includes(issueTypeFilter)
      );
    }

    if (search) {
      complaints = complaints.filter((item) => {
        const haystack = [
          item?.issueType,
          item?.description,
          item?.student?.enrollmentNumber,
          item?.student?.user?.name,
          item?.student?.user?.email,
          item?.room?.roomNumber,
          item?.hostel?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    return res.status(200).json({
      complaints: complaints.map(toApiComplaint),
      total: complaints.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch complaints." });
  }
};

export const updateHostelComplaintStatus = async (req, res) => {
  try {
    if (!parseRoleAccess(req)) {
      return res.status(403).json({ message: "Access denied. Hostel manager privileges required." });
    }

    const complaintId = String(req.params?.complaintId || "").trim();
    const nextStatus = normalizeStatus(req.body?.status);
    const remarks = String(req.body?.remarks || "").trim();

    if (!complaintId) {
      return res.status(400).json({ message: "Complaint ID is required." });
    }
    if (!nextStatus) {
      return res.status(400).json({
        message: "Invalid status. Use pending, in-progress, resolved, or rejected.",
      });
    }

    const complaint = await HostelComplaint.findById(complaintId);
    if (!complaint?._id) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    complaint.status = nextStatus;
    complaint.remarks = remarks;
    complaint.handledBy = req.userId || null;
    complaint.handledAt = new Date();
    complaint.timeline = Array.isArray(complaint.timeline) ? complaint.timeline : [];
    complaint.timeline.push({
      status: nextStatus,
      note: remarks || `Status updated to ${nextStatus}`,
      changedBy: req.userId || null,
      changedAt: new Date(),
    });

    await complaint.save();

    const updatedComplaint = await HostelComplaint.findById(complaint._id)
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate("hostel", "name type")
      .populate("room", "roomNumber floorNumber")
      .populate("handledBy", "name email role");

    return res.status(200).json({
      message: "Complaint status updated successfully.",
      complaint: toApiComplaint(updatedComplaint),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update complaint status." });
  }
};

export const getComplaintIssueTypes = async (_req, res) => {
  try {
    const issueTypes = await HostelComplaint.distinct("issueType");
    return res.status(200).json({
      issueTypes: issueTypes.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch issue types." });
  }
};

export const getStudentHostelContext = async (req, res) => {
  try {
    const studentProfile = await getStudentProfileByUser(req.userId);
    if (!studentProfile?._id) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const activeAllocation = await HostelAllocation.findOne({
      student: studentProfile._id,
      status: "Active",
    })
      .populate("hostel", "name type")
      .populate("room", "roomNumber floorNumber")
      .select("hostel room status");

    if (!activeAllocation?._id) {
      return res.status(200).json({
        allocation: null,
      });
    }

    const room = await Room.findById(activeAllocation.room)
      .select("roomNumber floorNumber occupants")
      .populate({
        path: "occupants",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      });

    const roommates = Array.isArray(room?.occupants)
      ? room.occupants
          .filter((occupant) => String(occupant?._id || "") !== String(studentProfile._id || ""))
          .map((occupant) => ({
            id: occupant?._id || null,
            enrollmentNumber: occupant?.enrollmentNumber || "",
            name: occupant?.user?.name || "",
            email: occupant?.user?.email || "",
          }))
      : [];

    return res.status(200).json({
      allocation: {
        hostel: activeAllocation.hostel
          ? {
              id: activeAllocation.hostel._id,
              name: activeAllocation.hostel.name,
              type: activeAllocation.hostel.type,
            }
          : null,
        room: room
          ? {
              id: room._id,
              roomNumber: room.roomNumber,
              floorNumber: room.floorNumber,
              roommates,
            }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch hostel context." });
  }
};
