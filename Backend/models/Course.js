import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },

    courseName: { type: String, required: false, trim: true },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    semester: { type: Number, required: true, min: 1, max: 12 },

    branch: { type: String, trim: true }, // e.g. CSE, IT

    credit: { type: Number, required: true, min: 0, max: 10 },

    facultyIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: [] },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
