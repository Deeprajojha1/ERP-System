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
  }]

}, { timestamps: true });

// Unique branch per program
BranchSchema.index({ programId: 1, branchName: 1 }, { unique: true });

// Ensure semesterNo unique inside array
BranchSchema.pre("validate", function () {
  const sems = this.semesterBaseFees.map(x => x.semesterNo);
  const unique = new Set(sems);
  if (sems.length !== unique.size) {
    throw new Error("Duplicate semesterNo found in semesterBaseFees");
  }
});

export default mongoose.model("Branch", BranchSchema);
