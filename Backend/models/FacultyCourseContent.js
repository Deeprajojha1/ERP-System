import mongoose from "mongoose";

const facultyCourseContentSchema = new mongoose.Schema(
  {
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
    type: {
      type: String,
      enum: ["materials", "assignments", "quizzes", "syllabus", "questionbanks"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    questionCount: {
      type: Number,
      min: 1,
      default: null,
    },
    fileUrl: {
      type: String,
      default: "",
      trim: true,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    originalFileName: {
      type: String,
      default: "",
      trim: true,
    },
    fileMime: {
      type: String,
      default: "",
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

facultyCourseContentSchema.index({ course: 1, type: 1, createdAt: -1 });
facultyCourseContentSchema.index({ faculty: 1, createdAt: -1 });

export default mongoose.model("FacultyCourseContent", facultyCourseContentSchema);
