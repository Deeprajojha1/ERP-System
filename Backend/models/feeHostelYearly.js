import mongoose from "mongoose";

const FeeHostelYearlySchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 20,
    },
    hostelYearlyFee: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

FeeHostelYearlySchema.index({ academicYear: 1 }, { unique: true });

export default mongoose.model("FeeHostelYearly", FeeHostelYearlySchema);
