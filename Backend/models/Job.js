import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    
    jobType: {
      type: String,
      enum: ["full-time", "internship", "part-time", "contract"],
      required: [true, "Job type is required"],
    },
    
    description: {
      type: String,
      required: [true, "Job description is required"],
    },
    
    eligibility: {
      programs: [{ type: String, trim: true }], // ["B.Tech", "M.Tech"]
      branches: [{ type: String, trim: true }], // ["CSE", "IT", "ECE"]
      minCGPA: { type: Number, min: 0, max: 10 },
      minPercentage: { type: Number, min: 0, max: 100 },
      passingYear: [{ type: Number }], // [2024, 2025]
      maxBacklogs: { type: Number, default: 0 },
    },
    
    skills: [{ type: String, trim: true }],
    
    location: {
      type: String,
      trim: true,
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
    
    applicationDeadline: {
      type: Date,
      required: [true, "Application deadline is required"],
    },
    
    status: {
      type: String,
      enum: ["draft", "open", "closed", "cancelled"],
      default: "draft",
    },
    
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    placementDrive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlacementDrive",
      default: null,
    },
    
    totalApplications: {
      type: Number,
      default: 0,
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

// Indexes for filtering and searching
jobSchema.index({ company: 1, status: 1 });
jobSchema.index({ jobType: 1, status: 1 });
jobSchema.index({ applicationDeadline: 1 });
jobSchema.index({ "eligibility.programs": 1, "eligibility.branches": 1 });

export default mongoose.model("Job", jobSchema);
