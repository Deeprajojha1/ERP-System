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
      enum: ["approved", "pending", "rejected"],
      default: "pending",
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FacultyLeave", facultyLeaveSchema);
