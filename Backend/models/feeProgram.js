import mongoose from "mongoose";

const ProgramSchema = new mongoose.Schema({
  programName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80
  },

  durationYears: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },

  totalSemesters: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },

  branchIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true
  }]

}, { timestamps: true });

// Validate durationYears & totalSemesters relationship
ProgramSchema.pre("validate", function () {
  if (this.totalSemesters !== this.durationYears * 2) {
    throw new Error("totalSemesters must be durationYears * 2");
  }
});

export default mongoose.model("Program", ProgramSchema);