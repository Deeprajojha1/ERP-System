import mongoose from "mongoose";

const questionReplySchema = new mongoose.Schema(
  {
    senderRole: {
      type: String,
      enum: ["student", "faculty"],
      required: true,
    },
    senderUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const courseQuestionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "Course Query",
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["open", "answered"],
      default: "open",
      index: true,
    },
    replies: {
      type: [questionReplySchema],
      default: [],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

courseQuestionSchema.index({ faculty: 1, course: 1, status: 1, lastMessageAt: -1 });
courseQuestionSchema.index({ student: 1, course: 1, lastMessageAt: -1 });

export default mongoose.model("CourseQuestion", courseQuestionSchema);
