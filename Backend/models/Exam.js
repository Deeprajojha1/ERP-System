import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true, trim: true },
    examType: {
      type: String,
      enum: ["MIDTERM", "ENDSEM", "ENDTERM", "PRACTICAL", "BACK"],
      default: "MIDTERM",
    },
    session: { type: String, required: true, trim: true }, // e.g. "2025-26 ODD"
    block: {
      type: String,
      enum: ["Academic Block", "Pharmacy Block"],
      default: "Academic Block",
      trim: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    program: { type: String, required: true, trim: true },

    semester: { type: Number, required: true, min: 1, max: 12 },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    subjectCode: { type: String, required: true, trim: true },
    subjectName: { type: String, required: true, trim: true },

    examDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, min: 1 },

    roomNo: { type: String, trim: true, default: "" },
    strength: { type: Number, default: 0, min: 0 },

    invigilators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Faculty",
      },
    ],

    maxMarks: { type: Number, default: 100, min: 1 },
    passMarks: { type: Number, default: 40, min: 0 },

    status: {
      type: String,
      enum: ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true },
);

examSchema.index({ department: 1, semester: 1, examDate: 1, isDeleted: 1 });
examSchema.index({ course: 1, examDate: 1, isDeleted: 1 });

export default mongoose.model("Exam", examSchema);

import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true, trim: true },
    examType: {
      type: String,
      enum: ["MIDTERM", "ENDSEM", "ENDTERM", "PRACTICAL", "BACK"],
      default: "MIDTERM",
    },
    session: { type: String, required: true, trim: true }, // e.g. "2025-26 ODD"
    block: {
      type: String,
      enum: ["Academic Block", "Pharmacy Block"],
      default: "Academic Block",
      trim: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    program: { type: String, required: true, trim: true },

    semester: { type: Number, required: true, min: 1, max: 12 },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    subjectCode: { type: String, required: true, trim: true },
    subjectName: { type: String, required: true, trim: true },

    examDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, min: 1 },

    roomNo: { type: String, trim: true, default: "" },
    strength: { type: Number, default: 0, min: 0 },

    invigilators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Faculty",
      },
    ],

    maxMarks: { type: Number, default: 100, min: 1 },
    passMarks: { type: Number, default: 40, min: 0 },

    status: {
      type: String,
      enum: ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true },
);

examSchema.index({ department: 1, semester: 1, examDate: 1, isDeleted: 1 });
examSchema.index({ course: 1, examDate: 1, isDeleted: 1 });

export default mongoose.model("Exam", examSchema);