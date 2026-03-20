import mongoose from "mongoose";

const BranchSchema = new mongoose.Schema({
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Program",
    required: true
  },

  branchName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80
  },

  // Fee depends on the student's batch (start year).
  // Example: 2024 for batch window 2024-2028
  batchYear: {
    type: Number,
    required: false,
    min: 2000,
    max: 2100,
    default: null,
  },

  semesterBaseFees: [{
    semesterNo: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    baseFee: {
      type: Number,
      required: true,
      min: 0
    }
  }],

  hostelYearlyFee: {
    type: Number,
    default: 0,
    min: 0
  },

  transportYearlyFee: {
    type: Number,
    default: 0,
    min: 0
  }

}, { timestamps: true });

// Unique fee branch per program + branch + batch year.
// Backward-compat: legacy rows may have batchYear=null.
BranchSchema.index({ programId: 1, branchName: 1, batchYear: 1 }, { unique: true });

// Ensure semesterNo unique inside array
BranchSchema.pre("validate", function () {
  const sems = this.semesterBaseFees.map(x => x.semesterNo);
  const unique = new Set(sems);
  if (sems.length !== unique.size) {
    throw new Error("Duplicate semesterNo found in semesterBaseFees");
  }
});

export default mongoose.model("Branch", BranchSchema);
