import mongoose from "mongoose";

const FeeBulkJobSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    totalRecords: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["PROCESSING", "COMPLETED", "FAILED"],
      default: "PROCESSING",
    },
    message: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("FeeBulkJob", FeeBulkJobSchema);
