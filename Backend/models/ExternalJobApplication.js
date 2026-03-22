import mongoose from "mongoose";

/**
 * External Job Application Model
 * Tracks when students apply to external jobs (LinkedIn, Indeed, etc.)
 */

const externalJobApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },

    // External job details
    externalJob: {
      externalId: { type: String, required: true }, // Job ID from external source
      source: { type: String, required: true }, // "LinkedIn", "Indeed", "The Muse", etc.
      title: { type: String, required: true },
      company: { type: String, required: true },
      companyLogo: { type: String },
      location: { type: String },
      jobType: { type: String },
      department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        default: null,
      },
      year: { type: Number, default: null },
      years: { type: [Number], default: [] },
      salary: {
        min: { type: Number },
        max: { type: Number },
        currency: { type: String },
      },
      externalUrl: { type: String, required: true }, // URL to apply
      description: { type: String },
    },

    // Application tracking
    applicationMethod: {
      type: String,
      enum: ["redirect", "tracked-redirect", "manual-entry"],
      default: "tracked-redirect",
    },

    // Student's application details
    resume: {
      type: String, // URL to resume used
    },

    coverLetter: {
      type: String,
    },

    // Status tracking
    status: {
      type: String,
      enum: [
        "interested", // Student clicked "Apply"
        "redirected", // Student was redirected to external site
        "applied", // Student confirmed they applied
        "interview-scheduled", // Student got interview
        "rejected",
        "offer-received",
        "offer-accepted",
        "offer-declined",
      ],
      default: "redirected",
    },

    statusHistory: [
      {
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        remarks: { type: String },
      },
    ],

    // Tracking
    clickedAt: {
      type: Date,
      default: Date.now,
    },

    appliedAt: {
      type: Date, // When student confirmed they applied
    },

    // Student can update these
    interviewDate: {
      type: Date,
    },

    notes: {
      type: String, // Student's notes about the application
    },

    // Admin can see this
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

// Indexes
externalJobApplicationSchema.index({ student: 1, "externalJob.externalId": 1 });
externalJobApplicationSchema.index({ student: 1, status: 1 });
externalJobApplicationSchema.index({ "externalJob.source": 1 });
externalJobApplicationSchema.index({ clickedAt: -1 });

export default mongoose.model("ExternalJobApplication", externalJobApplicationSchema);
