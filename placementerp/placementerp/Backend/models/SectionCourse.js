import mongoose from "mongoose";

const sectionCourseSchema = new mongoose.Schema(
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

    weeklyHours: {
      type: Number,
      required: true,
      min: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate course assignment to same section
sectionCourseSchema.index(
  { section: 1, course: 1 },
  { unique: true }
);

// Index for faster scheduling queries
sectionCourseSchema.index({ faculty: 1 });
sectionCourseSchema.index({ section: 1 });

export default mongoose.model("SectionCourse", sectionCourseSchema);
