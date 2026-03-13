import mongoose from "mongoose";

const FeeDemandRequestSchema = new mongoose.Schema(
  {
    studentMongoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentFeeDetails",
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      trim: true,
    },
    academicYear: {
      type: String,
      required: true,
      match: /^\d{4}-(?:\d{2}|\d{4})$/,
    },
    scope: {
      type: String,
      enum: ["SEMESTER", "YEAR"],
      default: "SEMESTER",
    },
    semesterNo: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    hostelAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    academicAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    transportAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    linkedDemandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeDemand",
      default: null,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    demandLetterRefNo: {
      type: String,
      trim: true,
      default: "",
    },
    demandLetterIssuedAt: {
      type: Date,
      default: null,
    },
    demandLetterSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

FeeDemandRequestSchema.index(
  { studentMongoId: 1, academicYear: 1, scope: 1, semesterNo: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);

FeeDemandRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("FeeDemandRequest", FeeDemandRequestSchema);
