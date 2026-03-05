import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileUrl: {
      type: String,
      trim: true,
      default: "",
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
      min: 0,
    },
    fileType: {
      type: String,
      default: null,
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    marks: {
      type: Number,
      default: null,
    },
    grade: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Submission", submissionSchema);
