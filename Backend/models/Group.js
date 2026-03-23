import mongoose from "mongoose";


const courseFacultySchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "CSE-3A"

    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },

    branch: {
      type: String,
      trim: true,
      default: "",
    },

    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],

    roomNo: { type: String, trim: true },

    scheduleSlots: {
      type: Map,
      of: {
        type: Map,
        of: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      },
      default: () => new Map(),
    },

    courseFaculty: { type: [courseFacultySchema], default: [] },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
