import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
    },
    
    // Academic Details
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
    },
    
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    backlogs: {
      current: { type: Number, default: 0 },
      cleared: { type: Number, default: 0 },
    },
    
    // Skills
    skills: [{ type: String, trim: true }],
    
    // Certifications
    certifications: [
      {
        name: { type: String, trim: true },
        issuedBy: { type: String, trim: true },
        issuedDate: { type: Date },
        certificateUrl: { type: String, trim: true },
      },
    ],
    
    // Projects
    projects: [
      {
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        technologies: [{ type: String, trim: true }],
        startDate: { type: Date },
        endDate: { type: Date },
        projectUrl: { type: String, trim: true },
      },
    ],
    
    // Experience
    experience: [
      {
        company: { type: String, trim: true },
        role: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        description: { type: String, trim: true },
        isCurrent: { type: Boolean, default: false },
      },
    ],
    
    // Resume
    resumes: [
      {
        fileName: { type: String, trim: true },
        fileUrl: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
        isDefault: { type: Boolean, default: false },
      },
    ],
    
    // Social Links
    socialLinks: {
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      portfolio: { type: String, trim: true },
    },
    
    // Placement Preferences
    preferences: {
      jobTypes: [{ type: String, enum: ["full-time", "internship", "part-time", "contract"] }],
      preferredLocations: [{ type: String, trim: true }],
      expectedSalary: { type: Number },
      workMode: [{ type: String, enum: ["remote", "onsite", "hybrid"] }],
    },
    
    // Placement Status
    placementStatus: {
      type: String,
      enum: ["seeking", "placed", "not-interested", "higher-studies"],
      default: "seeking",
    },
    
    placedCompany: {
      type: String,
      trim: true,
    },
    
    placedPackage: {
      type: Number,
    },
    
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

// Index
studentProfileSchema.index({ placementStatus: 1 });

export default mongoose.model("StudentProfile", studentProfileSchema);
