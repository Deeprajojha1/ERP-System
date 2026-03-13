// 

import mongoose from "mongoose";
import { normalizeProgramValue, PROGRAM_ENUM } from "../utils/programNormalization.js";

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
      enum: PROGRAM_ENUM,
      set: normalizeProgramValue,
      required: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
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
    disciplineStatus: {
      currentStatus: {
        type: String,
        enum: ["clear", "suspended", "detained"],
        default: "clear",
      },
      reason: {
        type: String,
        trim: true,
        default: "",
      },
      startDate: {
        type: Date,
        default: null,
      },
      endDate: {
        type: Date,
        default: null,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
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
