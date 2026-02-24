import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },
    
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    
    placementDrive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlacementDrive",
      default: null,
    },
    
    // Either job or placementDrive must be present
    
    resume: {
      type: String, // URL to uploaded resume
      required: [true, "Resume is required"],
    },
    
    coverLetter: {
      type: String,
      trim: true,
    },
    
    status: {
      type: String,
      enum: [
        "submitted",
        "under-review",
        "shortlisted",
        "interview-scheduled",
        "rejected",
        "selected",
        "offer-accepted",
        "offer-declined",
        "withdrawn",
      ],
      default: "submitted",
    },
    
    statusHistory: [
      {
        status: { type: String },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        remarks: { type: String, trim: true },
      },
    ],
    
    interviewDetails: {
      date: { type: Date },
      time: { type: String },
      venue: { type: String, trim: true },
      mode: { type: String, enum: ["online", "offline"], default: "offline" },
      meetingLink: { type: String, trim: true },
      instructions: { type: String, trim: true },
    },
    
    feedback: {
      type: String,
      trim: true,
    },
    
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

// Compound indexes
applicationSchema.index({ student: 1, job: 1 }, { unique: true, sparse: true });
applicationSchema.index({ student: 1, placementDrive: 1 }, { unique: true, sparse: true });
applicationSchema.index({ status: 1, appliedAt: -1 });

// Validation: Either job or placementDrive must be present
applicationSchema.pre("save", function (next) {
  if (!this.job && !this.placementDrive) {
    return next(new Error("Either job or placementDrive must be specified"));
  }
  next();
});

export default mongoose.model("Application", applicationSchema);
