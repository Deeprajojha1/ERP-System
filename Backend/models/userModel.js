import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
    },
      aadharNumber: {
      type: String,
      unique: true,
      sparse: true, 
      match: [/^\d{12}$/, "Aadhar number must be 12 digits"],
    },
      phoneNumber: {
      type: String,
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },
    passwordHash: String,
    role: {
      type: String,
      enum: ["student", "faculty", "admin","librarian"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "leave"],
      default: "active",
    },
     resetOtp: {
        type: String
    },
    otpExpires: {
        type: Date
    },
    isOtpVerifed: {
        type: Boolean,
        default: false
    },
    DOB: {
        type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
