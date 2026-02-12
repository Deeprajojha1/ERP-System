import mongoose from "mongoose";

const facultyLeaveSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    dateFrom: {
      type: Date,
      required: true,
    },

    dateTo: {
      type: Date,
      required: true,
    },

    type: {
      type: String,
      enum: ["casual", "sick", "annual", "special", "other"],
      required: true,
    },

    status: {
      type: String,
      enum: ["appeared", "pending", "reject"],
      default: "pending",
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FacultyLeave", facultyLeaveSchema);
