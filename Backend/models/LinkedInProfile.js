import mongoose from "mongoose";

const linkedInProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "pdf", "hybrid"],
      default: "manual",
    },
    headline: {
      type: String,
      default: "",
      trim: true,
    },
    about: {
      type: String,
      default: "",
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: String,
      default: "",
      trim: true,
    },
    targetRole: {
      type: String,
      default: "",
      trim: true,
    },
    profileFingerprint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rawInput: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    pdfMeta: {
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: "profiles",
  }
);

linkedInProfileSchema.index({ userId: 1, createdAt: -1 });
linkedInProfileSchema.index({ userId: 1, profileFingerprint: 1, createdAt: -1 });

export default mongoose.model("LinkedInProfile", linkedInProfileSchema);
