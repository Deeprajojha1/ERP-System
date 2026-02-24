import mongoose from "mongoose";

const ALERT_AUDIENCE = ["student", "faculty"];
const ALERT_PRIORITY = ["info", "warning", "urgent"];

const alertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    audience: [
      {
        type: String,
        enum: ALERT_AUDIENCE,
        required: true,
      },
    ],
    priority: {
      type: String,
      enum: ALERT_PRIORITY,
      default: "info",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Alert", alertSchema);
