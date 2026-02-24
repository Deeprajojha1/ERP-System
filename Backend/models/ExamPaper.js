import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    sectionType: {
      type: String,
      enum: ["MCQ", "SHORT", "LONG"],
      required: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    correctAnswer: {
      type: String,
      trim: true,
      default: "",
    },
    marks: {
      type: Number,
      required: true,
      min: 1,
    },
    rubric: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const examPaperSchema = new mongoose.Schema(
  {
    blueprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamBlueprint",
      required: true,
    },
    generatedBy: {
      type: String,
      enum: ["AI", "TEACHER"],
      default: "AI",
    },
    reviewedByTeacher: {
      type: Boolean,
      default: false,
    },
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one question is required",
      },
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

examPaperSchema.index({ blueprintId: 1, version: -1 });

export default mongoose.model("ExamPaper", examPaperSchema);
