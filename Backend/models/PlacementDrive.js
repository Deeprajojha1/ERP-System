import mongoose from "mongoose";

const placementDriveSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Drive title is required"],
      trim: true,
    },
    
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    
    driveType: {
      type: String,
      enum: ["on-campus", "off-campus", "pool-campus"],
      required: [true, "Drive type is required"],
    },
    
    description: {
      type: String,
      trim: true,
    },
    
    eligibility: {
      programs: [{ type: String, trim: true }],
      branches: [{ type: String, trim: true }],
      minCGPA: { type: Number, min: 0, max: 10 },
      minPercentage: { type: Number, min: 0, max: 100 },
      passingYear: [{ type: Number }],
      maxBacklogs: { type: Number, default: 0 },
    },
    
    schedule: {
      registrationStart: { type: Date, required: true },
      registrationEnd: { type: Date, required: true },
      driveDate: { type: Date, required: true },
      venue: { type: String, trim: true },
    },
    
    rounds: [
      {
        name: { type: String, trim: true }, // "Aptitude Test", "Technical Interview"
        description: { type: String, trim: true },
        date: { type: Date },
        duration: { type: Number }, // in minutes
      },
    ],
    
    status: {
      type: String,
      enum: ["upcoming", "registration-open", "registration-closed", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    
    totalRegistrations: {
      type: Number,
      default: 0,
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

// Indexes
placementDriveSchema.index({ company: 1, status: 1 });
placementDriveSchema.index({ "schedule.driveDate": 1 });

export default mongoose.model("PlacementDrive", placementDriveSchema);
