import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true
  },

  demandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeeDemand",
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 1
  },

  mode: {
    type: String,
    enum: ["UPI", "NETBANKING", "CARD", "CASH", "CHEQUE", "DD", "BANK_TRANSFER"],
    required: true
  },

  status: {
    type: String,
    enum: ["CREATED", "PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"],
    default: "CREATED"
  },

  transactionId: {
    type: String,
    trim: true
  },

  gateway: {
    type: String,
    enum: ["RAZORPAY", "PAYU", "CASHFREE", "NONE"],
    default: "NONE"
  },

  paymentDetails: {
    type: mongoose.Schema.Types.Mixed, // store cheque details, upi rrn, etc.
    default: {}
  },

  receiptNo: {
    type: String,
    trim: true
  },

  initiatedAt: {
    type: Date,
    default: Date.now
  },

  paidAt: {
    type: Date
  },

  createdBy: {
    type: String,
    enum: ["STUDENT", "ACCOUNTS", "SYSTEM"],
    required: true
  },

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }

}, { timestamps: true });

PaymentSchema.index({ studentId: 1, demandId: 1 });
PaymentSchema.index({ transactionId: 1 }, { sparse: true });
PaymentSchema.index({ receiptNo: 1 }, { sparse: true, unique: true });

export default mongoose.model("FeePaymentHistory", PaymentSchema);
