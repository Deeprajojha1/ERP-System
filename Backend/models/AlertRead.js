import mongoose from "mongoose";

const alertReadSchema = new mongoose.Schema(
  {
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: "Alert", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: ["student", "faculty"], required: true },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// prevent duplicates
alertReadSchema.index({ alertId: 1, userId: 1 }, { unique: true });

export default mongoose.model("AlertRead", alertReadSchema);