import mongoose from "mongoose";

const FeeAuditLogSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorRole: {
      type: String,
      trim: true,
      default: "unknown",
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      trim: true,
      maxlength: 128,
      default: "unknown",
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 512,
      default: "",
    },
  },
  { timestamps: true }
);

FeeAuditLogSchema.index({ createdAt: -1 });
FeeAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
FeeAuditLogSchema.index({ actorUserId: 1, createdAt: -1 });

export default mongoose.model("FeeAuditLog", FeeAuditLogSchema);