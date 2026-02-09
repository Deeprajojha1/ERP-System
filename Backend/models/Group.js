import mongoose from "mongoose";

/*
  scheduleSlots is stored as a nested Map (dictionary of dictionaries):
  {
    "monday":    { "1": <CourseObjectId>, "2": <CourseObjectId> },
    "tuesday":   { "3": <CourseObjectId> },
    ...
  }
  Outer key  = day name (monday–saturday)
  Inner key  = lecture number (as string)
  Inner value = Course ObjectId
*/

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
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
