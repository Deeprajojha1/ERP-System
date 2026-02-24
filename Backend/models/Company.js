import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      unique: true,
    },
    
    logo: {
      type: String, // URL to company logo
      trim: true,
    },
    
    website: {
      type: String,
      trim: true,
    },
    
    industry: {
      type: String,
      trim: true,
    },
    
    description: {
      type: String,
      trim: true,
    },
    
    location: {
      type: String,
      trim: true,
    },
    
    contactPerson: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      phone: { type: String, trim: true },
      designation: { type: String, trim: true },
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

// Index for faster searches
companySchema.index({ name: 1, isActive: 1 });

export default mongoose.model("Company", companySchema);
