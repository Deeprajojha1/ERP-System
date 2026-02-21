import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },

    // "info" | "warning" | "urgent"
    priority: { type: String, enum: ["info", "warning", "urgent"], default: "info" },

    // who should see it
    audience: {
      type: [String],
      enum: ["student", "faculty"],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Audience must include at least one role",
      },
    },

    // optional targeting (future-ready)
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },

    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

alertSchema.index({ isActive: 1, expiresAt: 1, createdAt: -1 });

export default mongoose.model("Alert", alertSchema);