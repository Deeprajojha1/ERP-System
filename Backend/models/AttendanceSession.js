import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
  },
  { _id: false }
);

const attendanceSessionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    records: { type: [attendanceRecordSchema], default: [], index : true },
  },
  { timestamps: true }
);

// Prevent duplicate sessions for same group-course-date
attendanceSessionSchema.index({ date: 1, group: 1, course: 1 }, { unique: true });

export default mongoose.model("AttendanceSession", attendanceSessionSchema);
