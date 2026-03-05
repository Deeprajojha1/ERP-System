import mongoose from "mongoose";

const hostelOutpassSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    category: {
      type: String,
      enum: ["Holiday", "Weekend", "Festival", "Medical", "Emergency", "Other"],
      required: true,
    },
    destination: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250,
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    parentContact: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    dateFrom: {
      type: Date,
      required: true,
    },
    dateTo: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Exited", "Returned", "Rejected", "Cancelled"],
      default: "Pending",
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    entryTime: {
      type: Date,
      default: null,
    },
    logs: [
      {
        action: { type: String, trim: true, default: "" },
        timestamp: { type: Date, default: Date.now },
        by: { type: String, trim: true, default: "" },
        remarks: { type: String, trim: true, default: "" },
      },
    ],
  },
  { timestamps: true }
);

hostelOutpassSchema.index({ student: 1, status: 1, dateFrom: -1 });

export default mongoose.model("HostelOutpass", hostelOutpassSchema);
