import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    answerText: {
      type: String,
      trim: true,
      default: "",
    },
    selectedOption: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    blueprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamBlueprint",
      required: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamPaper",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "SUBMITTED", "EVALUATED"],
      default: "IN_PROGRESS",
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
  },
  { timestamps: true }
);

examAttemptSchema.index(
  { blueprintId: 1, student: 1, attemptNumber: 1 },
  { unique: true }
);
examAttemptSchema.index({ blueprintId: 1, student: 1, createdAt: -1 });

export default mongoose.model("ExamAttempt", examAttemptSchema);
