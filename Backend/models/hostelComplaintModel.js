import mongoose from "mongoose";

const normalizeComplaintStatus = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (normalized === "inprogress") return "in-progress";
  if (normalized === "in-progress") return "in-progress";
  if (normalized === "resolved") return "resolved";
  if (normalized === "rejected") return "rejected";
  return "pending";
};

const complaintTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "rejected"],
      set: normalizeComplaintStatus,
      default: "pending",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const hostelComplaintSchema = new mongoose.Schema({

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hostel",
    required: true,
  },

  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },

  issueType: {
    type: String,
    trim: true,
    required: true,
  },
  description: {
    type: String,
    trim: true,
    required: true,
  },
  imageUrl: {
    type: String,
    trim: true,
    default: "",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },

  status: {
    type: String,
    enum: ["pending", "in-progress", "resolved", "rejected"],
    set: normalizeComplaintStatus,
    default: "pending",
  },
  remarks: {
    type: String,
    trim: true,
    default: "",
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  handledAt: {
    type: Date,
    default: null,
  },
  timeline: {
    type: [complaintTimelineSchema],
    default: [],
  },

}, { timestamps: true });

hostelComplaintSchema.index({ hostel: 1, status: 1, createdAt: -1 });
hostelComplaintSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model("HostelComplaint", hostelComplaintSchema);
