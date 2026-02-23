import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    semester: {
      type: Number,
      required: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    strength: {
      type: Number,
      default: 60,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isTimetableLocked: {
      type: Boolean,
      default: false,
    },
    timetableApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    timetableApprovedAt: Date,
  },
  { timestamps: true },
);

// Prevent duplicate section in same semester + department
sectionSchema.index({ name: 1, semester: 1, department: 1 }, { unique: true });

const Section = mongoose.model("Section", sectionSchema);
export default Section;
