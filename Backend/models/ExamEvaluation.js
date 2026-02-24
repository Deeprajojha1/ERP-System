import mongoose from "mongoose";

const perQuestionSchema = new mongoose.Schema(
  {
    questionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    awardedMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
    expectedAnswer: {
      type: String,
      trim: true,
      default: "",
    },
    studentAnswer: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const examEvaluationSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamAttempt",
      required: true,
      unique: true,
    },
    totalAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMax: {
      type: Number,
      required: true,
      min: 1,
    },
    perQuestion: {
      type: [perQuestionSchema],
      default: [],
    },
    evaluatedBy: {
      type: String,
      enum: ["AI", "TEACHER"],
      default: "AI",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ExamEvaluation", examEvaluationSchema);
