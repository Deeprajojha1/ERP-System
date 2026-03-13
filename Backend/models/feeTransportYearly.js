import mongoose from "mongoose";

const FeeTransportYearlySchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 20,
    },
    transportYearlyFee: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

FeeTransportYearlySchema.index({ academicYear: 1 }, { unique: true });

export default mongoose.model("FeeTransportYearly", FeeTransportYearlySchema);
