import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    enrollmentNumber: { type: String, required: true, unique: true, trim: true },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    program: {
      type: String,
      enum: ["btech", "mtech", "mba"],
      required: true,
    },

    semester: { type: Number, required: true, min: 1, max: 12 },

    academicYear: { type: String, required: true, trim: true }, // e.g. "2024-2025"

    fatherName: { type: String, trim: true },

    fatherPhoneNumber: {
      type: String,
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },

    collegeEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
