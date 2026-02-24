import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    headline: { type: Number, default: 0 },
    about: { type: Number, default: 0 },
    skills: { type: Number, default: 0 },
    keywordAlignment: { type: Number, default: 0 },
  },
  { _id: false }
);

const incrementalSchema = new mongoose.Schema(
  {
    trend: {
      type: String,
      enum: ["first-analysis", "improved", "declined", "stable"],
      default: "first-analysis",
    },
    scoreDelta: { type: Number, default: 0 },
    newlyMissingSkills: { type: [String], default: [] },
    resolvedSkills: { type: [String], default: [] },
    keywordsAdded: { type: [String], default: [] },
  },
  { _id: false }
);

const linkedInReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LinkedInProfile",
      required: true,
    },
    profileFingerprint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    profileScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    keywords: {
      type: [String],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    concerns: {
      type: [String],
      default: [],
    },
    summary: {
      type: String,
      default: "",
      trim: true,
    },
    dimensionScores: {
      type: scoreSchema,
      default: () => ({}),
    },
    incremental: {
      type: incrementalSchema,
      default: () => ({}),
    },
    cacheMeta: {
      servedFromCache: { type: Boolean, default: false },
      cacheSource: {
        type: String,
        enum: ["live", "redis", "mongodb", "history"],
        default: "live",
      },
      ttlSeconds: { type: Number, default: 0 },
    },
    aiProvider: {
      name: { type: String, default: "" },
      model: { type: String, default: "" },
    },
    rawAi: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "reports",
  }
);

linkedInReportSchema.index({ userId: 1, createdAt: -1 });
linkedInReportSchema.index({ userId: 1, profileFingerprint: 1, createdAt: -1 });

export default mongoose.model("LinkedInReport", linkedInReportSchema);
