import mongoose from "mongoose";

const hostelAllocationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
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

    allocatedAt: {
      type: Date,
      default: Date.now,
    },

    vacatedAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["Active", "Vacated"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("HostelAllocation", hostelAllocationSchema);