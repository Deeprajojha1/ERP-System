import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },

    day: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },

    slotNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
  },
  { timestamps: true }
);

// 🔥 Conflict Prevention Indexes

// Faculty conflict prevention
timetableSchema.index({ faculty: 1, day: 1, slotNumber: 1 }, { unique: true });

// Section conflict prevention
timetableSchema.index({ section: 1, day: 1, slotNumber: 1 }, { unique: true });

// Classroom conflict prevention
timetableSchema.index({ classroom: 1, day: 1, slotNumber: 1 }, { unique: true });

export default mongoose.model("Timetable", timetableSchema);
