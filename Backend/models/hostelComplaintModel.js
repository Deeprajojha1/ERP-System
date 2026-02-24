import mongoose from "mongoose";

const hostelComplaintSchema = new mongoose.Schema({

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "student",
    required: true
  },

  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "room"
  },

  issueType: String,
  description: String,

  status: {
    type: String,
    enum: ["Pending", "In Progress", "Resolved"],
    default: "Pending"
  }

}, { timestamps: true });

export default mongoose.model("hostelComplaint", hostelComplaintSchema);