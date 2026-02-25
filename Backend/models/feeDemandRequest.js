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
      match: /^\d{4}-\d{2}$/,
    },
    semesterNo: {
      type: Number,
      required: true,
      min: 1,
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
  },
  { timestamps: true }
);

FeeDemandRequestSchema.index(
  { studentMongoId: 1, academicYear: 1, semesterNo: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);

FeeDemandRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("FeeDemandRequest", FeeDemandRequestSchema);
