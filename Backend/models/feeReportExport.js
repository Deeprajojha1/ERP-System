import mongoose from "mongoose";

const FeeReportExportSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Fee Export" },
    range: { type: String, default: "Custom" },
    dataset: { type: String, default: "Student Ledger" },
    format: { type: String, default: "CSV" },
    destination: { type: String, default: "download" },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "COMPLETED", "FAILED"],
      default: "COMPLETED",
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sharedTo: [{ type: String, trim: true }],
    sharedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("FeeReportExport", FeeReportExportSchema);
