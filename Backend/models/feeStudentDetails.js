import mongoose from "mongoose";

const StudentFeeDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  studentId: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
    required: true
  },

  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Program",
    required: true
  },

  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true
  },

  currentSemester: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },

  hostelOpted: {
    type: Boolean,
    default: false
  },

  transportOpted: {
    type: Boolean,
    default: false
  },

  scholarship: {
    type: {
      type: String,
      enum: ["NONE", "PERCENT", "FIXED"],
      default: "NONE"
    },
    value: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  discount: {
    type: {
      type: String,
      enum: ["NONE", "PERCENT", "FIXED"],
      default: "NONE"
    },
    value: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  feeSummary: {
    courseGrossFee: {
      type: Number,
      default: 0,
      min: 0
    },
    scholarshipAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    courseNetFee: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingFee: {
      type: Number,
      default: 0,
      min: 0
    }
  }

}, { timestamps: true });

export default mongoose.model("StudentFeeDetails", StudentFeeDetailsSchema);