import mongoose from "mongoose";

const FeeDemandSchema = new mongoose.Schema({
  studentMongoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudentFeeDetails",
    required: true
  },

  studentId: {
    type: String,
    required: true,
    trim: true
  },

  academicYear: {
    type: String,
    required: true,
    match: /^\d{4}-(?:\d{2}|\d{4})$/ // "2025-26" or "2025-2026"
  },

  scope: {
    type: String,
    enum: ["SEMESTER", "YEAR"],
    default: "SEMESTER"
  },

  semesterNo: {
    type: Number,
    required: true,
    min: 0,
    max: 20
  },

  breakdown: [{
    head: {
      type: String,
      enum: ["TUITION", "HOSTEL", "TRANSPORT", "EXAM", "BACK_EXAM", "FINE"],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paid: {
      type: Number,
      default: 0,
      min: 0
    }
  }],

  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  dueAmount: { type: Number, required: true, min: 0 },

  status: {
    type: String,
    enum: ["PENDING", "PARTIAL", "PAID"],
    default: "PENDING"
  },

  dueDate: { type: Date, required: true }

}, { timestamps: true });

FeeDemandSchema.index(
  { studentId: 1, academicYear: 1, scope: 1, semesterNo: 1 },
  { unique: true }
);
FeeDemandSchema.index({ studentMongoId: 1, createdAt: -1 });
FeeDemandSchema.index({ status: 1, dueDate: 1 });

export default mongoose.model("FeeDemand", FeeDemandSchema);
