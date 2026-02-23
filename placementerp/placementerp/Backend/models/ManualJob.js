import mongoose from "mongoose";

/**
 * Manual Job Model
 * For jobs posted manually by admin (campus placements, etc.)
 */

const manualJobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    
    company: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    
    companyLogo: {
      type: String,
      trim: true,
    },
    
    description: {
      type: String,
      required: [true, "Job description is required"],
    },
    
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    
    jobType: {
      type: String,
      enum: ["full-time", "internship", "part-time", "contract"],
      required: [true, "Job type is required"],
    },
    
    workMode: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      default: "onsite",
    },
    
    salary: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: "INR" },
    },
    
    skills: [{ type: String, trim: true }],
    
    applicationUrl: {
      type: String,
      required: [true, "Application URL is required"],
      trim: true,
    },
    
    expirationDate: {
      type: Date,
      required: [true, "Expiration date is required"],
    },
    
    status: {
      type: String,
      enum: ["active", "expired", "deleted"],
      default: "active",
    },
    
    source: {
      type: String,
      default: "Campus",
    },
    
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for filtering
manualJobSchema.index({ status: 1, expirationDate: 1 });
manualJobSchema.index({ postedBy: 1 });

// Virtual to check if job is expired
manualJobSchema.virtual("isExpired").get(function () {
  return new Date() > this.expirationDate;
});

// Method to update status based on expiration
manualJobSchema.methods.updateStatus = function () {
  if (new Date() > this.expirationDate && this.status === "active") {
    this.status = "expired";
  }
  return this;
};

// Method to convert to external job format
manualJobSchema.methods.toExternalJobFormat = function () {
  return {
    externalId: this._id.toString(),
    source: this.source,
    title: this.title,
    company: this.company,
    companyLogo: this.companyLogo,
    description: this.description,
    location: this.location,
    jobType: this.jobType,
    workMode: this.workMode,
    externalUrl: this.applicationUrl,
    url: this.applicationUrl,
    salary: this.salary,
    skills: this.skills,
    postedDate: this.createdAt,
    expiresAt: this.expirationDate,
    isExpired: this.isExpired,
    _id: this._id,
  };
};

export default mongoose.model("ManualJob", manualJobSchema);
