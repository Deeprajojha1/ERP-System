import Hostel from "../models/hostelModel.js";
import WardenSupportTicket from "../models/wardenSupportTicketModel.js";
import mongoose from "mongoose";

const normalizePriority = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["low", "medium", "high"].includes(normalized)) return normalized;
  return "medium";
};

const normalizeStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (["open", "in-progress", "resolved", "closed"].includes(normalized)) return normalized;
  return "";
};

const getWardenPrimaryHostelId = async (userId) => {
  const hostel = await Hostel.findOne({ wardens: userId }).select("_id").lean();
  return hostel?._id || null;
};

export const createWardenSupportTicket = async (req, res) => {
  try {
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();
    const priority = normalizePriority(req.body?.priority);

    if (!subject) return res.status(400).json({ message: "Subject is required." });
    if (subject.length > 120) return res.status(400).json({ message: "Subject cannot exceed 120 characters." });
    if (!message || message.length < 10) {
      return res.status(400).json({ message: "Message must be at least 10 characters." });
    }
    if (message.length > 2000) return res.status(400).json({ message: "Message cannot exceed 2000 characters." });

    const hostelId = await getWardenPrimaryHostelId(req.userId);

    const ticket = await WardenSupportTicket.create({
      createdBy: req.userId,
      hostel: hostelId,
      subject,
      message,
      priority,
      status: "open",
      timeline: [
        {
          status: "open",
          note: "Ticket created by warden",
          changedBy: req.userId,
        },
      ],
    });

    const populated = await WardenSupportTicket.findById(ticket._id)
      .populate("createdBy", "name email role")
      .populate("hostel", "name type")
      .populate("handledBy", "name email role");

    return res.status(201).json({ message: "Support ticket submitted.", ticket: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit support ticket." });
  }
};

export const getMyWardenSupportTickets = async (req, res) => {
  try {
    const tickets = await WardenSupportTicket.find({ createdBy: req.userId })
      .populate("createdBy", "name email role")
      .populate("hostel", "name type")
      .populate("handledBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ tickets });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch support tickets." });
  }
};

export const getAllWardenSupportTicketsAdmin = async (req, res) => {
  try {
    const status = normalizeStatus(req.query?.status);
    const hostelId = String(req.query?.hostelId || "").trim();
    const query = {};
    if (status) query.status = status;
    if (hostelId) {
      if (!mongoose.Types.ObjectId.isValid(hostelId)) {
        return res.status(400).json({ message: "Invalid hostelId." });
      }
      query.hostel = hostelId;
    }

    const tickets = await WardenSupportTicket.find(query)
      .populate("createdBy", "name email role")
      .populate("hostel", "name type")
      .populate("handledBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ tickets });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch warden support tickets." });
  }
};

export const updateWardenSupportTicketStatusAdmin = async (req, res) => {
  try {
    const ticketId = String(req.params?.id || "").trim();
    const status = normalizeStatus(req.body?.status);
    const note = String(req.body?.note || "").trim();

    if (!ticketId) return res.status(400).json({ message: "Ticket id is required." });
    if (!status) return res.status(400).json({ message: "Invalid status." });

    const ticket = await WardenSupportTicket.findById(ticketId);
    if (!ticket?._id) return res.status(404).json({ message: "Ticket not found." });

    ticket.status = status;
    ticket.handledBy = req.userId || null;
    ticket.handledAt = new Date();
    ticket.timeline = Array.isArray(ticket.timeline) ? ticket.timeline : [];
    ticket.timeline.push({
      status,
      note: note || `Status updated to ${status}`,
      changedBy: req.userId || null,
      changedAt: new Date(),
    });
    await ticket.save();

    const populated = await WardenSupportTicket.findById(ticket._id)
      .populate("createdBy", "name email role")
      .populate("hostel", "name type")
      .populate("handledBy", "name email role");

    return res.status(200).json({ message: "Ticket updated.", ticket: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update ticket." });
  }
};
