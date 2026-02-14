import mongoose from "mongoose";

/*
  routine is stored as a nested Map (dictionary of dictionaries):
  {
    "monday": {
      "1": { course: <CourseObjectId>, group: <GroupObjectId> },
      "2": { course: <CourseObjectId>, group: <GroupObjectId> },
      ...
    },
    "tuesday": { ... },
    ...
  }
  Outer key  = day name (monday–saturday)
  Inner key  = lecture number (as string)
  Inner value = { course, group }
*/

const lectureDetailSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  },
  { _id: false }
);

const facultySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    employeeId: { type: String, required: true, unique: true, trim: true },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    designation: {
      type: String,
      enum: ["professor", "assistant_prof", "hod", "training", "other"],
      required: true,
    },

    qualification: { type: String, trim: true },

    joiningDate: { type: Date, required: false },

    routine: {
      type: Map,
      of: {
        type: Map,
        of: lectureDetailSchema,
      },
      default: () => new Map(),
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Faculty", facultySchema);
